import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1), B = id(2), P = id(3), Q = id(4), X = id(5), Y = id(6);
const version = "2026-11-09T00:00:00.000Z";
let access, store, calls, failAudit, concurrent, failRead, sequence, revalidations;
const context = (tenantId = A, role = "OWNER") => ({ authUserId: tenantId === A ? "auth-a" : "auth-b", profileId: tenantId === A ? P : Q, tenant: { id: tenantId }, assignments: [{ code: role, scope: "COMPANY", branch: null }] });
function reset(role = "OWNER") {
  access = { status: "allowed", context: context(A, role) }; calls = []; failAudit = false; concurrent = false; failRead = false; sequence = 100; revalidations = [];
  store = {
    userProfile: [{ id: P, tenantId: A, authUserId: "auth-a" }, { id: Q, tenantId: B, authUserId: "auth-b" }],
    userRoleAssignment: [A, B].map(t => ({ tenantId: t, userProfileId: t === A ? P : Q, assignmentScope: "COMPANY", branchId: null, role: { code: t === A ? role : "OWNER", assignmentScope: "COMPANY" } })),
    branch: [{ id: X, tenantId: A, name: "Memory A", createdAt: new Date(version), updatedAt: new Date(version) }, { id: Y, tenantId: B, name: "Memory B", createdAt: new Date(version), updatedAt: new Date(version) }],
    auditEvent: [],
    // Simulated related history: service must never write these collections.
    wholesaleOrder: [{ id: id(20), tenantId: A, branchId: X }],
    stockBalance: [{ tenantId: A, branchId: X, quantityOnHand: "1.000" }],
    stockMovement: [{ id: id(21), tenantId: A, branchId: X, quantity: "1.000" }],
  };
}
function moduleURL(source) { return `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`; }
function match(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (value instanceof Date) return row[key]?.getTime() === value.getTime();
    if (value && typeof value === "object") {
      if ("contains" in value) return row[key].toLowerCase().includes(value.contains.toLowerCase());
      if ("in" in value) return value.in.includes(row[key]);
      return match(row[key], value);
    }
    return row[key] === value;
  });
}
const project = (row, select) => !row || !select ? row : Object.fromEntries(Object.entries(select).map(([key, spec]) => [key, spec === true ? row[key] : project(row[key], spec.select)]));
globalThis[Symbol.for("milo.branches-test")] = {
  getPanelAccess: async () => access,
  revalidatePath: (...args) => revalidations.push(args),
  prisma: { async $transaction(callback, options) {
    calls.push({ model: "$transaction", options }); const draft = structuredClone(store);
    const tx = Object.fromEntries(Object.keys(draft).map(model => [model, {
      async findMany(args = {}) {
        calls.push({ model, operation: "findMany", args }); if (failRead) throw new Error("private provider details");
        let rows = draft[model].filter(r => match(r, args.where));
        if (args.orderBy) rows = rows.sort((a, b) => { for (const clause of args.orderBy) { const key = Object.keys(clause)[0]; const result = String(a[key]).localeCompare(String(b[key])); if (result) return result; } return 0; });
        return rows.slice(args.skip ?? 0, args.take === undefined ? undefined : (args.skip ?? 0) + args.take).map(r => project(r, args.select));
      },
      async findFirst(args) { return (await this.findMany(args))[0] ?? null; },
      async findUnique(args) { return this.findFirst(args); },
      async count(args) { calls.push({ model, operation: "count", args }); return draft[model].filter(r => match(r, args.where)).length; },
      async create(args) {
        calls.push({ model, operation: "create", args });
        if (model === "auditEvent") {
          if (failAudit) throw new Error("private audit details");
          assert.ok(draft.userProfile.some(p => p.id === args.data.actorUserId && p.tenantId === args.data.tenantId));
        }
        const row = { id: id(sequence++), createdAt: new Date(version), updatedAt: new Date(version), ...args.data }; draft[model].push(row); return project(row, args.select);
      },
      async updateMany(args) { calls.push({ model, operation: "updateMany", args }); const row = draft[model].find(r => match(r, args.where)); if (!row || concurrent) return { count: 0 }; Object.assign(row, args.data); return { count: 1 }; },
    }]));
    const result = await callback(tx); store = draft; return result;
  } },
};
const policyURL = moduleURL(await readFile(new URL("../lib/panel/branch-permission.ts", import.meta.url), "utf8"));
const schemaURL = moduleURL((await readFile(new URL("../lib/branches/schema.ts", import.meta.url), "utf8")).replace('from "zod"', `from ${JSON.stringify(import.meta.resolve("zod"))}`));
let source = await readFile(new URL("../lib/branches/service.ts", import.meta.url), "utf8");
for (const [from, to] of [
  ['import "server-only";', ""],
  ['import { prisma } from "@/lib/prisma";', 'const { prisma } = globalThis[Symbol.for("milo.branches-test")];'],
  ['import { getPanelAccess, type PanelContext } from "@/lib/panel/access";', 'const { getPanelAccess } = globalThis[Symbol.for("milo.branches-test")];'],
  ['from "@/lib/panel/branch-permission"', `from ${JSON.stringify(policyURL)}`],
  ['from "./schema"', `from ${JSON.stringify(schemaURL)}`],
]) { assert.ok(source.includes(from)); source = source.replace(from, to); }
const serviceURL = moduleURL(source), service = await import(serviceURL);
let actionsSource = await readFile(new URL("../app/panel/sucursales/actions.ts", import.meta.url), "utf8");
actionsSource = actionsSource.replace('import { revalidatePath } from "next/cache";', 'const { revalidatePath } = globalThis[Symbol.for("milo.branches-test")];').replace('from "@/lib/branches/service"', `from ${JSON.stringify(serviceURL)}`);
const actions = await import(moduleURL(actionsSource));
function form(values) { const data = new FormData(); for (const [k, v] of Object.entries(values)) data.set(k, v); return data; }
const branch = (edit = false, overrides = {}) => form({ name: "Updated memory", ...(edit ? { id: X, version } : {}), ...overrides });
const query = { q: "", page: "1" };
const mutations = () => calls.filter(c => ["create", "updateMany"].includes(c.operation));

test("OWNER and ADMIN COMPANY can list, create and edit their branches with atomic minimal audit", async () => {
  for (const role of ["OWNER", "ADMIN"]) {
    reset(role); assert.equal((await service.listBranches(query)).data.total, 1);
    assert.equal((await service.saveBranch(branch(false, { name: "  Real name in memory  " }), false)).status, "saved");
    assert.equal(store.branch.at(-1).tenantId, A); assert.equal(store.branch.at(-1).name, "Real name in memory");
    assert.equal((await service.saveBranch(branch(true), true)).status, "saved"); assert.equal(store.branch[0].name, "Updated memory");
    assert.deepEqual(store.auditEvent.map(e => [e.action, e.entityType, e.tenantId, e.actorUserId]), [["BRANCH_CREATED", "Branch", A, P], ["BRANCH_UPDATED", "Branch", A, P]]);
    assert.deepEqual(Object.keys(calls.find(c => c.model === "auditEvent" && c.operation === "create").args.data).sort(), ["action", "actorUserId", "entityId", "entityType", "tenantId"]);
    assert.ok(calls.filter(c => c.model === "$transaction").some(c => c.options.isolationLevel === "Serializable"));
  }
});

test("unauthenticated, operational, unknown and wrongly scoped roles deny without business reads/writes", async () => {
  for (const role of ["MANAGER", "SALES", "TECHNICIAN", "WAREHOUSE", "PLATFORM_ADMIN"]) {
    reset(role); assert.equal((await service.listBranches(query)).status, "forbidden"); assert.equal((await service.getBranch(X)).status, "forbidden"); assert.equal((await service.saveBranch(branch(), false)).status, "forbidden"); assert.equal(calls.length, 0);
  }
  for (const change of [() => { access = { status: "anonymous" }; }, () => { access.context.assignments = []; }, () => { access.context.assignments[0].scope = "BRANCH"; }, () => { access.context.assignments[0].branch = { id: X }; }]) {
    reset(); change(); assert.equal((await service.saveBranch(branch(), false)).status, "forbidden"); assert.equal(calls.length, 0);
  }
});

test("all branch reads and writes remain tenant-scoped even with foreign IDs and after changing session", async () => {
  reset(); assert.equal((await service.getBranch(Y)).status, "missing"); assert.equal((await service.saveBranch(branch(true, { id: Y }), true)).status, "error"); assert.equal(mutations().length, 0); assert.equal(store.branch[1].name, "Memory B");
  assert.equal((await service.listBranches({ q: "Memory B", page: "1" })).data.total, 0);
  access.context = context(B); const data = await service.listBranches(query); assert.equal(data.data.items[0].id, Y); assert.equal(data.data.total, 1);
  assert.equal((await service.getBranch(X)).status, "missing"); assert.equal((await service.saveBranch(branch(true, { id: Y }), true)).status, "saved"); assert.equal(store.auditEvent[0].tenantId, B); assert.equal(store.auditEvent[0].actorUserId, Q);
  for (const call of calls.filter(c => c.model === "branch" && c.args.where)) assert.ok([A, B].includes(call.args.where.tenantId));
});

test("membership, stable authUserId and COMPANY assignment are rechecked inside read/write transactions", async () => {
  for (const corrupt of [() => { store.userProfile = []; }, () => { store.userProfile[0].tenantId = B; }, () => { store.userProfile[0].id = Q; }, () => { store.userRoleAssignment[0].role.code = "SALES"; }, () => { store.userRoleAssignment[0].role.assignmentScope = "BRANCH"; }, () => { store.userRoleAssignment[0].branchId = X; }]) {
    reset(); corrupt(); assert.equal((await service.listBranches(query)).status, "forbidden"); assert.equal((await service.saveBranch(branch(true), true)).status, "forbidden"); assert.equal(mutations().length, 0);
  }
});

test("Zod rejects forged tenant/actor/history fields, duplicates, files, invalid names and bad tokens", async () => {
  for (const values of [{ name: "" }, { name: "   " }, { name: "a".repeat(201) }, { name: "a\nb" }, { name: "a\tb" }, { name: "a\0b" }, { tenantId: B }, { actorUserId: Q }, { branchId: Y }, { role: "OWNER" }, { address: "not a model field" }, { isEnabled: "true" }]) {
    reset(); assert.equal((await service.saveBranch(branch(false, values), false)).status, "invalid"); assert.equal(calls.length, 0);
  }
  reset(); const duplicate = branch(); duplicate.append("name", "Duplicate"); assert.equal((await service.saveBranch(duplicate, false)).status, "invalid");
  const file = branch(); file.set("name", new Blob(["file"]), "name.txt"); assert.equal((await service.saveBranch(file, false)).status, "invalid");
  assert.equal((await service.saveBranch({ name: "Not FormData" }, false)).status, "invalid"); assert.equal((await service.saveBranch(branch(true, { version: "bad" }), true)).status, "invalid");
  assert.equal((await service.getBranch("../bad")).status, "missing"); assert.equal((await service.listBranches({ q: ["bad"], page: "1" })).status, "invalid");
});

test("stale timestamps and conditional update conflicts cannot overwrite or audit", async () => {
  reset(); store.branch[0].updatedAt = new Date("2026-11-09T00:00:01.000Z"); const before = JSON.stringify(store);
  assert.equal((await service.saveBranch(branch(true), true)).status, "conflict"); assert.equal(JSON.stringify(store), before); assert.equal(mutations().length, 0);
  reset(); concurrent = true; assert.equal((await service.saveBranch(branch(true), true)).status, "conflict"); assert.equal(store.branch[0].name, "Memory A"); assert.equal(store.auditEvent.length, 0);
  reset(); const future = "2030-01-01T00:00:00.000Z"; store.branch[0].updatedAt = new Date(future); const result = await service.saveBranch(branch(true, { version: future }), true); assert.equal(result.status, "saved"); assert.equal(result.version, "2030-01-01T00:00:00.001Z");
});

test("audit failure rolls back simulated create/update and storage failures never expose provider details", async () => {
  for (const edit of [false, true]) {
    reset(); failAudit = true; const before = JSON.stringify(store); const result = await service.saveBranch(branch(edit), edit); assert.equal(result.status, "error"); assert.equal(JSON.stringify(store), before); assert.ok(!result.message.includes("private"));
  }
  reset(); failRead = true; assert.deepEqual(await service.listBranches(query), { status: "error" }); assert.equal((await service.saveBranch(branch(true), true)).status, "error"); assert.equal(mutations().length, 0);
});

test("names need not be unique, no-op does not audit, references/history and createdAt remain intact", async () => {
  reset(); assert.equal((await service.saveBranch(branch(false, { name: "Memory A" }), false)).status, "saved"); assert.equal(store.branch.filter(b => b.name === "Memory A").length, 2);
  reset(); assert.equal((await service.saveBranch(branch(true, { name: "Memory A" }), true)).status, "saved"); assert.equal(mutations().length, 0);
  const before = structuredClone(store); assert.equal((await service.saveBranch(branch(true), true)).status, "saved");
  for (const table of ["userProfile", "userRoleAssignment", "wholesaleOrder", "stockBalance", "stockMovement"]) assert.deepEqual(store[table], before[table]);
  assert.deepEqual(store.branch[0].createdAt, before.branch[0].createdAt); assert.equal(store.branch[0].id, X); assert.equal(store.branch[0].tenantId, A);
  assert.deepEqual(Object.keys(service).sort(), ["getBranch", "listBranches", "saveBranch"]);
});

test("list search, deterministic pagination and empty state use only real authorized rows", async () => {
  reset(); assert.equal((await service.listBranches({ q: "MEMORY A", page: "1" })).data.total, 1);
  for (let i = 0; i < 26; i++) store.branch.push({ id: id(200 + i), tenantId: A, name: `Item ${i}`, updatedAt: new Date(version) });
  const first = (await service.listBranches(query)).data, second = (await service.listBranches({ q: "", page: "2" })).data;
  assert.equal(first.total, 27); assert.equal(first.items.length, 25); assert.equal(second.items.length, 2); assert.equal(first.pages, 2); assert.ok(!first.items.some(a => second.items.some(b => a.id === b.id)));
  store.branch = store.branch.filter(b => b.tenantId !== A); const empty = (await service.listBranches(query)).data; assert.equal(empty.total, 0); assert.deepEqual(empty.items, []); assert.equal(empty.pages, 1);
});

test("Server Actions ignore poisoned previous state and revalidate only after authorized success", async () => {
  reset(); assert.equal((await actions.createBranch({ status: "saved", tenantId: B, actorUserId: Q }, branch())).status, "saved"); assert.equal(store.branch.at(-1).tenantId, A); assert.deepEqual(revalidations, [["/panel", "layout"]]);
  reset(); assert.equal((await actions.updateBranch({ status: "saved", id: Y }, branch(true))).status, "saved"); assert.equal(store.branch[1].name, "Memory B");
  reset("SALES"); assert.equal((await actions.createBranch({ status: "saved" }, branch())).status, "forbidden"); assert.deepEqual(revalidations, []);
});
