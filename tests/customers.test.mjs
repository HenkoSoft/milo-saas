import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1), B = id(2), P = id(3), Q = id(4), X = id(5), Y = id(6);
const version = "2026-11-11T00:00:00.000Z";
const contact = (name = "Memory A") => ({ schemaVersion: 1, name, email: "memory@example.invalid", phone: "123", address: "Memory address" });
const context = (tenant = A, code = "OWNER") => ({ authUserId: tenant === A ? "auth-a" : "auth-b", profileId: tenant === A ? P : Q, tenant: { id: tenant }, assignments: [{ code, scope: "COMPANY", branch: null }] });
let store, access, calls, failAudit, concurrent, failRead, sequence, revalidations;
function reset(code = "OWNER") {
  access = { status: "allowed", context: context(A, code) }; calls = []; failAudit = concurrent = failRead = false; sequence = 100; revalidations = [];
  store = {
    userProfile: [{ id: P, tenantId: A, authUserId: "auth-a" }, { id: Q, tenantId: B, authUserId: "auth-b" }],
    userRoleAssignment: [A, B].map(tenantId => ({ tenantId, userProfileId: tenantId === A ? P : Q, assignmentScope: "COMPANY", branchId: null, role: { code: tenantId === A ? code : "OWNER", assignmentScope: "COMPANY" } })),
    customer: [{ id: X, tenantId: A, contactData: contact(), status: "PREVIOUS_STATE", createdAt: new Date(version), updatedAt: new Date(version) }, { id: Y, tenantId: B, contactData: contact("Memory B"), status: "OTHER", createdAt: new Date(version), updatedAt: new Date(version) }],
    auditEvent: [], wholesaleOrder: [{ id: id(30), tenantId: A, customerId: X }],
  };
}
function match(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === "AND") return value.every(part => match(row, part));
    if (key === "OR") return value.some(part => match(row, part));
    if (value instanceof Date) return row[key]?.getTime() === value.getTime();
    if (value && typeof value === "object") {
      if (value.path) { const field = value.path.reduce((data, key) => data?.[key], row[key]); return "equals" in value ? field === value.equals : typeof field === "string" && field.toLowerCase().includes(value.string_contains.toLowerCase()); }
      if ("in" in value) return value.in.includes(row[key]);
      return match(row[key], value);
    }
    return row[key] === value;
  });
}
const project = (row, select) => !row || !select ? row : Object.fromEntries(Object.entries(select).map(([key, spec]) => [key, spec === true ? row[key] : project(row[key], spec.select)]));
globalThis[Symbol.for("milo.customers-test")] = {
  getPanelAccess: async () => access, revalidatePath: (...args) => revalidations.push(args),
  prisma: { async $transaction(run, options) {
    calls.push({ model: "$transaction", options }); const draft = structuredClone(store);
    const tx = Object.fromEntries(Object.keys(draft).map(model => [model, {
      async findMany(args = {}) {
        calls.push({ model, operation: "findMany", args }); if (failRead) throw new Error("private database details");
        let rows = draft[model].filter(row => match(row, args.where));
        if (args.orderBy) rows.sort((a, b) => { for (const clause of args.orderBy) { const [field, order] = Object.entries(clause)[0]; const result = String(a[field]).localeCompare(String(b[field])); if (result) return order === "desc" ? -result : result; } return 0; });
        return rows.slice(args.skip ?? 0, args.take === undefined ? undefined : (args.skip ?? 0) + args.take).map(row => project(row, args.select));
      },
      async findFirst(args) { return (await this.findMany(args))[0] ?? null; },
      async findUnique(args) { return this.findFirst(args); },
      async count(args) { calls.push({ model, operation: "count", args }); if (failRead) throw new Error("private storage failure"); return draft[model].filter(row => match(row, args.where)).length; },
      async create(args) {
        calls.push({ model, operation: "create", args });
        if (model === "auditEvent" && failAudit) throw new Error("private audit failure");
        const row = { id: id(sequence++), createdAt: new Date(version), updatedAt: new Date(version), ...args.data }; draft[model].push(row); return project(row, args.select);
      },
      async updateMany(args) { calls.push({ model, operation: "updateMany", args }); const row = draft[model].find(row => match(row, args.where)); if (!row || concurrent) return { count: 0 }; Object.assign(row, args.data); return { count: 1 }; },
    }]));
    const result = await run(tx); store = draft; return result;
  } },
};
const moduleURL = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`;
const policy = moduleURL(await readFile(new URL("../lib/panel/customer-permission.ts", import.meta.url), "utf8"));
const schemaURL = moduleURL((await readFile(new URL("../lib/customers/schema.ts", import.meta.url), "utf8")).replace('from "zod"', `from ${JSON.stringify(import.meta.resolve("zod"))}`));
let source = await readFile(new URL("../lib/customers/basic-service.ts", import.meta.url), "utf8");
for (const [from, to] of [
  ['import "server-only";', ""],
  ['import { prisma } from "@/lib/prisma";', 'const { prisma } = globalThis[Symbol.for("milo.customers-test")];'],
  ['import { getPanelAccess, type PanelContext } from "@/lib/panel/access";', 'const { getPanelAccess } = globalThis[Symbol.for("milo.customers-test")];'],
  ['from "@/lib/panel/customer-permission"', `from ${JSON.stringify(policy)}`],
  ['from "./schema"', `from ${JSON.stringify(schemaURL)}`],
]) { assert.ok(source.includes(from)); source = source.replace(from, to); }
const serviceURL = moduleURL(source + '\nexport async function deleteCustomer() { return { status: "invalid" }; }'), service = await import(serviceURL);
let actionSource = await readFile(new URL("../app/panel/clientes/actions.ts", import.meta.url), "utf8");
actionSource = actionSource.replace('import { revalidatePath } from "next/cache";', 'const { revalidatePath } = globalThis[Symbol.for("milo.customers-test")];').replace('from "@/lib/customers/service"', `from ${JSON.stringify(serviceURL)}`);
const actions = await import(moduleURL(actionSource));
let loaderSource = await readFile(new URL("../app/panel/clientes/editor-actions.ts", import.meta.url), "utf8");
loaderSource = loaderSource.replace('from "@/lib/customers/service"', `from ${JSON.stringify(serviceURL)}`).replace('from "@/lib/customers/schema"', `from ${JSON.stringify(schemaURL)}`);
const { loadCustomerEditor } = await import(moduleURL(loaderSource));
const form = (edit = false, extra = {}) => { const data = new FormData(); for (const [key, value] of Object.entries({ name: "Updated memory", email: "memory@example.invalid", phone: "123", address: "Memory address", ...(edit ? { id: X, version } : {}), ...extra })) data.append(key, value); return data; };
const mutations = () => calls.filter(c => ["create", "updateMany"].includes(c.operation));

test("OWNER/ADMIN can register and edit tenant customers atomically with minimal audit and no commercial authorization", async () => {
  for (const code of ["OWNER", "ADMIN"]) {
    reset(code); const orders = structuredClone(store.wholesaleOrder);
    assert.equal((await service.saveCustomer(form(), false)).status, "saved");
    assert.equal(store.customer.at(-1).tenantId, A); assert.equal(store.customer.at(-1).status, "REGISTERED");
    assert.equal(store.customer.at(-1).contactData.schemaVersion, 1);
    assert.equal((await service.saveCustomer(form(true), true)).status, "saved");
    assert.equal(store.customer[0].contactData.name, "Updated memory"); assert.equal(store.customer[0].status, "PREVIOUS_STATE");
    assert.deepEqual(store.wholesaleOrder, orders);
    assert.deepEqual(store.auditEvent.map(e => [e.tenantId, e.actorUserId, e.action, e.entityType]), [[A, P, "CUSTOMER_CREATED", "Customer"], [A, P, "CUSTOMER_UPDATED", "Customer"]]);
    assert.ok(store.auditEvent.every(e => !("contactData" in e) && !("name" in e) && !("email" in e)));
    assert.ok(calls.filter(c => c.model === "$transaction").every(c => c.options.isolationLevel === "Serializable"));
  }
});

test("anonymous, operational, central and wrongly scoped roles have no customer reads or writes", async () => {
  for (const code of ["MANAGER", "SALES", "TECHNICIAN", "WAREHOUSE", "PLATFORM_ADMIN"]) {
    reset(code); assert.equal((await service.listCustomers({})).status, "forbidden"); assert.equal((await service.getCustomer(X)).status, "forbidden"); assert.equal((await service.saveCustomer(form(), false)).status, "forbidden"); assert.equal((await loadCustomerEditor(null)).status, "forbidden"); assert.equal(calls.length, 0);
  }
  for (const corrupt of [() => { access = { status: "unauthenticated" }; }, () => { access.context.assignments = []; }, () => { access.context.assignments[0].scope = "BRANCH"; }, () => { access.context.assignments[0].branch = { id: X }; }]) {
    reset(); corrupt(); assert.equal((await service.saveCustomer(form(), false)).status, "forbidden"); assert.equal(calls.length, 0);
  }
});

test("cross-tenant IDs, search and membership revocation fail closed; no identity linkage by email", async () => {
  reset(); assert.equal((await service.getCustomer(Y)).status, "missing"); assert.equal((await service.saveCustomer(form(true, { id: Y }), true)).status, "error"); assert.equal(mutations().length, 0);
  assert.equal((await service.listCustomers({ q: "Memory B" })).data.total, 0);
  access.context = context(B); assert.equal((await service.getCustomer(Y)).status, "ok");
  assert.equal((await service.saveCustomer(form(true, { id: Y }), true)).status, "saved"); assert.equal(store.auditEvent[0].tenantId, B); assert.equal(store.auditEvent[0].actorUserId, Q);
  for (const corrupt of [() => { store.userProfile[0].tenantId = B; }, () => { store.userProfile[0].id = Q; }, () => { store.userRoleAssignment[0].role.code = "SALES"; }, () => { store.userRoleAssignment[0].branchId = X; }, () => { store.userRoleAssignment[0].role.assignmentScope = "BRANCH"; }]) {
    reset(); corrupt(); assert.equal((await service.listCustomers({})).status, "forbidden"); assert.equal((await service.saveCustomer(form(true), true)).status, "forbidden"); assert.equal(mutations().length, 0);
  }
});

test("Zod rejects forged status/tenant/JSON, duplicate keys, files, controls and malformed versions without writes", async () => {
  for (const extra of [{ tenantId: B }, { status: "ACTIVE" }, { contactData: "{}" }, { schemaVersion: "1" }, { authUserId: "other" }, { name: "" }, { name: "a\nb" }, { phone: "a\tb" }, { address: "a\u0000b" }, { email: "bad-email" }, { name: "x".repeat(201) }, { address: "x".repeat(401) }]) {
    reset(); assert.equal((await service.saveCustomer(form(false, extra), false)).status, "invalid"); assert.equal(calls.length, 0);
  }
  reset(); const duplicate = form(); duplicate.append("name", "duplicate"); assert.equal((await service.saveCustomer(duplicate, false)).status, "invalid");
  const file = form(); file.set("name", new Blob(["private"]), "name.txt"); assert.equal((await service.saveCustomer(file, false)).status, "invalid");
  assert.equal((await service.saveCustomer(form(true, { version: "bad" }), true)).status, "invalid");
  assert.equal((await service.saveCustomer({}, false)).status, "invalid"); assert.equal(calls.length, 0);
  assert.equal((await service.saveCustomer(form(false, { name: "  Trimmed  ", email: "  memory@example.invalid  " }), false)).status, "saved"); assert.equal(store.customer.at(-1).contactData.name, "Trimmed");
});

test("no-op, stale or concurrent saves never overwrite; audit failure rolls back the entire simulated transaction", async () => {
  reset(); assert.equal((await service.saveCustomer(form(true, { name: "Memory A" }), true)).status, "saved"); assert.equal(mutations().length, 0);
  reset(); assert.equal((await service.saveCustomer(form(true, { version: "2020-01-01T00:00:00.000Z" }), true)).status, "conflict"); assert.equal(mutations().length, 0);
  reset(); concurrent = true; assert.equal((await service.saveCustomer(form(true), true)).status, "conflict"); assert.equal(store.customer[0].contactData.name, "Memory A"); assert.equal(store.auditEvent.length, 0);
  for (const edit of [false, true]) { reset(); failAudit = true; const before = structuredClone(store); assert.equal((await service.saveCustomer(form(edit), edit)).status, "error"); assert.deepEqual(store, before); }
});

test("unknown contact formats are projected safely and protected; null contacts can be completed without changing status", async () => {
  for (const data of [{ name: "Private legacy", secret: "protected" }, { ...contact(), extra: "protected" }, { ...contact(), schemaVersion: 2 }, ["protected"], "protected"]) {
    reset(); store.customer[0].contactData = data;
    const result = await service.getCustomer(X); assert.equal(result.data.contactState, "legacy"); assert.equal(result.data.editable, false); assert.equal(result.data.name, ""); assert.doesNotMatch(JSON.stringify(result), /protected|Private legacy/);
    assert.equal((await service.saveCustomer(form(true), true)).status, "invalid"); assert.equal(mutations().length, 0); assert.deepEqual(store.customer[0].contactData, data);
  }
  reset(); store.customer[0].contactData = null;
  assert.equal((await service.getCustomer(X)).data.editable, true);
  assert.equal((await service.saveCustomer(form(true), true)).status, "saved"); assert.equal(store.customer[0].status, "PREVIOUS_STATE");
});

test("search is tenant-scoped, case insensitive and paginated in stable order, with empty and historic records visible", async () => {
  reset(); for (let n = 0; n < 30; n++) store.customer.push({ ...structuredClone(store.customer[0]), id: id(200 + n), contactData: contact(`Memory ${n}`) });
  const page = await service.listCustomers({ q: "MEMORY", page: "2" }); assert.equal(page.data.items.length, 6); assert.equal(page.data.total, 31); assert.equal(page.data.pages, 2);
  assert.equal((await service.listCustomers({ q: "example.invalid" })).data.total, 31);
  assert.equal((await service.listCustomers({ q: "123" })).data.total, 31);
  assert.equal((await service.listCustomers({ q: "absent" })).data.total, 0);
  assert.equal((await service.listCustomers({ page: "999" })).data.page, 2);
  assert.ok(calls.filter(c => c.model === "customer" && c.args.where).every(c => c.args.where.tenantId === A));
  for (const query of [{ tenantId: B }, { page: "0" }, { page: "-1" }, { q: "a\nb" }]) assert.equal((await service.listCustomers(query)).status, "invalid");
  store.customer[0].contactData = { secret: "private" }; assert.equal((await service.listCustomers({})).data.total, 31);
});

test("server actions ignore poisoned previous state, revalidate only success and loaders disclose no private errors", async () => {
  reset(); assert.deepEqual(await loadCustomerEditor(null), { status: "ok", data: {} });
  assert.equal((await loadCustomerEditor(X)).data.customer.id, X);
  for (const invalid of [undefined, "bad", { tenantId: B, id: X }]) assert.equal((await loadCustomerEditor(invalid)).status, "invalid");
  assert.equal((await actions.createCustomer({ tenantId: B, status: "ACTIVE" }, form())).status, "saved"); assert.equal(store.customer.at(-1).tenantId, A); assert.deepEqual(revalidations, [["/panel/clientes"], ["/panel"]]);
  revalidations = []; assert.equal((await actions.updateCustomer({}, form(true, { version: "bad" }))).status, "invalid"); assert.equal(revalidations.length, 0);
  failRead = true; assert.deepEqual(await service.getCustomer(X), { status: "error" }); assert.deepEqual(await service.listCustomers({}), { status: "error" });
});
