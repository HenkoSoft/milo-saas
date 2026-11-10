import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

function moduleURL(source) {
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
}
const policyURL = moduleURL(await readFile(new URL("../lib/panel/company-permission.ts", import.meta.url), "utf8"));
const schemaURL = moduleURL((await readFile(new URL("../lib/company/schema.ts", import.meta.url), "utf8")).replace('from "zod"', `from ${JSON.stringify(import.meta.resolve("zod"))}`));
let access;
let store;
let calls;
let failAudit;
let concurrentChange;
let failRead;
let revalidations;
const version = "2026-11-09T00:00:00.000Z";

function context(tenant = "a", role = "OWNER") {
  return { authUserId: `auth-${tenant}`, profileId: `profile-${tenant}`, user: { name: "Memory only", email: "memory@example.invalid" }, tenant: { id: tenant, name: `Empresa ${tenant}` }, assignments: [{ code: role, label: role, scope: "COMPANY", branch: null }] };
}
function reset() {
  access = { status: "allowed", context: context() };
  store = {
    tenants: ["a", "b"].map(id => ({ id, commercialName: `Empresa ${id}`, address: `Dirección ${id}`, contactData: { existingUnknownKey: `Contacto ${id}` }, currency: "ARS", locale: "es-AR", timeZone: "America/Argentina/Buenos_Aires", priceVisibility: "AUTHENTICATED_CUSTOMERS", updatedAt: new Date(version) })),
    profiles: ["a", "b"].map(id => ({ id: `profile-${id}`, tenantId: id, authUserId: `auth-${id}` })),
    roles: ["a", "b"].map(id => ({ tenantId: id, userProfileId: `profile-${id}`, assignmentScope: "COMPANY", branchId: null, role: { code: "OWNER", assignmentScope: "COMPANY" } })),
    audits: [],
  };
  calls = []; failAudit = false; concurrentChange = false; failRead = false; revalidations = [];
}
function projection(row, select) { return row && Object.fromEntries(Object.keys(select).map(key => [key, row[key]])); }
globalThis[Symbol.for("milo.company-test")] = {
  getPanelAccess: async () => access,
  revalidatePath: (...args) => revalidations.push(args),
  prisma: {
    async $transaction(callback, options) {
      calls.push({ kind: "transaction", options });
      const draft = structuredClone(store);
      const tx = {
        userProfile: { async findUnique(args) {
          calls.push({ kind: "profile", args });
          return projection(draft.profiles.find(p => p.authUserId === args.where.authUserId), args.select) ?? null;
        } },
        userRoleAssignment: { async findFirst(args) {
          calls.push({ kind: "role", args });
          const w = args.where;
          return draft.roles.find(r => r.tenantId === w.tenantId && r.userProfileId === w.userProfileId && r.assignmentScope === w.assignmentScope && r.branchId === w.branchId && w.role.code.in.includes(r.role.code) && r.role.assignmentScope === w.role.assignmentScope) ?? null;
        } },
        tenant: {
          async findUnique(args) {
            calls.push({ kind: "read", args });
            if (failRead) throw new Error("private connection information");
            return projection(draft.tenants.find(t => t.id === args.where.id), args.select) ?? null;
          },
          async findUniqueOrThrow(args) { const row = await this.findUnique(args); if (!row) throw new Error("not found"); return row; },
          async updateMany(args) {
            calls.push({ kind: "write", args });
            const row = draft.tenants.find(t => t.id === args.where.id && t.updatedAt.getTime() === args.where.updatedAt.getTime());
            if (!row || concurrentChange) return { count: 0 };
            Object.assign(row, args.data);
            return { count: 1 };
          },
        },
        auditEvent: { async create(args) {
          calls.push({ kind: "audit", args });
          if (failAudit) throw new Error("private audit storage details");
          assert.ok(draft.profiles.some(p => p.id === args.data.actorUserId && p.tenantId === args.data.tenantId));
          draft.audits.push(structuredClone(args.data));
          return args.data;
        } },
      };
      const result = await callback(tx);
      store = draft;
      return result;
    },
  },
};
let serviceSource = await readFile(new URL("../lib/company/service.ts", import.meta.url), "utf8");
for (const [from, to] of [
  ['import "server-only";', ""],
  ['import { prisma } from "@/lib/prisma";', 'const { prisma } = globalThis[Symbol.for("milo.company-test")];'],
  ['import { getPanelAccess, type PanelContext } from "@/lib/panel/access";', 'const { getPanelAccess } = globalThis[Symbol.for("milo.company-test")];'],
  ['from "@/lib/panel/company-permission"', `from ${JSON.stringify(policyURL)}`],
  ['from "./schema"', `from ${JSON.stringify(schemaURL)}`],
]) { assert.ok(serviceSource.includes(from)); serviceSource = serviceSource.replace(from, to); }
const serviceURL = moduleURL(serviceSource);
const { loadCompanySettings, saveCompanySettings } = await import(serviceURL);
const actionSource = (await readFile(new URL("../app/panel/empresa/actions.ts", import.meta.url), "utf8"))
  .replace('import { revalidatePath } from "next/cache";', 'const { revalidatePath } = globalThis[Symbol.for("milo.company-test")];')
  .replace('from "@/lib/company/service"', `from ${JSON.stringify(serviceURL)}`);
const { updateCompany } = await import(moduleURL(actionSource));
function form(name = "Nombre actualizado", token = version) { const f = new FormData(); f.set("commercialName", name); f.set("version", token); return f; }

test("OWNER and ADMIN can read/edit only their company with minimal atomic audit", async () => {
  for (const code of ["OWNER", "ADMIN"]) {
    reset(); access.context = context("a", code); store.roles[0].role.code = code;
    const loaded = await loadCompanySettings();
    assert.equal(loaded.status, "ok");
    assert.equal(loaded.settings.commercialName, "Empresa a");
    assert.ok(loaded.settings.contactText.includes("Contacto a"));
    assert.ok(!loaded.settings.contactText.includes("Contacto b"));
    assert.equal("fiscalData" in loaded.settings, false);
    const result = await saveCompanySettings(form("  Nueva empresa  "));
    assert.equal(result.status, "saved");
    assert.equal(store.tenants[0].commercialName, "Nueva empresa");
    assert.equal(store.tenants[1].commercialName, "Empresa b");
    assert.ok(new Date(result.values.version).getTime() > new Date(version).getTime());
    assert.deepEqual(store.audits, [{ tenantId: "a", actorUserId: "profile-a", action: "TENANT_COMMERCIAL_NAME_UPDATED", entityType: "Tenant", entityId: "a" }]);
    const write = calls.find(c => c.kind === "write").args;
    assert.equal(write.where.id, "a");
    assert.deepEqual(Object.keys(write.data).sort(), ["commercialName", "updatedAt"]);
    assert.ok(calls.find(c => c.kind === "transaction" && c.options.isolationLevel === "Serializable"));
  }
});

test("unauthenticated, operational and incorrectly scoped roles cannot read or write settings", async () => {
  for (const status of ["unauthenticated", "forbidden", "unavailable"]) {
    reset(); access = { status };
    assert.equal((await loadCompanySettings()).status, "forbidden");
    assert.equal((await saveCompanySettings(form())).status, "forbidden");
    assert.equal(calls.length, 0);
  }
  for (const role of ["MANAGER", "SALES", "TECHNICIAN", "WAREHOUSE", "SUPERADMIN"]) {
    reset(); access.context = context("a", role);
    if (role !== "SUPERADMIN") {
      access.context.assignments[0].scope = "BRANCH";
      access.context.assignments[0].branch = { id: "branch-a", name: "Sucursal A" };
    }
    assert.equal((await loadCompanySettings()).status, "forbidden");
    assert.equal((await saveCompanySettings(form())).status, "forbidden");
    assert.equal(calls.length, 0);
  }
  for (const mutate of [a => { a.scope = "BRANCH"; }, a => { a.branch = { id: "x", name: "X" }; }]) {
    reset(); mutate(access.context.assignments[0]);
    assert.equal((await saveCompanySettings(form())).status, "forbidden");
    assert.equal(calls.length, 0);
  }
});

test("browser tenant, actor, role, price policy, address and JSON cannot expand the write allowlist", async () => {
  for (const key of ["tenantId", "actorUserId", "profileId", "roles", "priceVisibility", "currency", "address", "contactData", "logoKey", "__proto__"]) {
    reset(); const f = form(); f.set(key, "forged");
    assert.equal((await saveCompanySettings(f)).status, "invalid");
    assert.equal(calls.length, 0);
    assert.equal(store.audits.length, 0);
  }
});

test("membership and COMPANY roles are rechecked in the transaction after revocation or reassignment", async () => {
  for (const mutate of [
    () => { store.profiles[0].tenantId = "b"; },
    () => { store.profiles[0].authUserId = "other"; },
    () => { store.roles[0].tenantId = "b"; },
    () => { store.roles[0].assignmentScope = "BRANCH"; },
    () => { store.roles[0].branchId = "branch"; },
    () => { store.roles[0].role.code = "MANAGER"; },
    () => { store.roles = []; },
  ]) {
    reset(); mutate();
    assert.equal((await saveCompanySettings(form())).status, "forbidden");
    assert.equal(calls.some(c => c.kind === "write"), false);
    assert.equal((await loadCompanySettings()).status, "forbidden");
  }
});

test("Zod validates length, control characters, form type, duplicate keys and version", async () => {
  for (const f of [form("a".repeat(201)), form("bad\u0000name"), form("bad\nname"), form("Valid", "not-a-date"), {}, null]) {
    reset(); assert.equal((await saveCompanySettings(f)).status, "invalid");
    assert.equal(calls.length, 0);
  }
  reset(); const duplicate = form(); duplicate.append("commercialName", "another");
  assert.equal((await saveCompanySettings(duplicate)).status, "invalid");
  reset(); const file = form(); file.set("commercialName", new Blob(["not a string"]), "name.txt");
  assert.equal((await saveCompanySettings(file)).status, "invalid");
  reset(); assert.equal((await saveCompanySettings(form(" "))).status, "saved");
  assert.equal(store.tenants[0].commercialName, null); // Existing optional field remains optional.
});

test("unchanged values do not write or create audit noise", async () => {
  reset();
  const result = await saveCompanySettings(form("Empresa a"));
  assert.equal(result.status, "saved");
  assert.equal(calls.some(c => c.kind === "write" || c.kind === "audit"), false);
  assert.equal(store.tenants[0].updatedAt.toISOString(), version);
});

test("stale versions and concurrent updates do not overwrite or produce audit events", async () => {
  reset(); store.tenants[0].updatedAt = new Date("2026-11-09T00:00:00.001Z");
  assert.equal((await saveCompanySettings(form())).status, "conflict");
  assert.equal(calls.some(c => c.kind === "write"), false);
  reset(); concurrentChange = true;
  assert.equal((await saveCompanySettings(form())).status, "conflict");
  assert.equal(store.tenants[0].commercialName, "Empresa a");
  assert.equal(store.audits.length, 0);
});

test("an audit error rolls back the simulated update and never exposes provider details", async () => {
  reset(); failAudit = true;
  const result = await saveCompanySettings(form());
  assert.equal(result.status, "error");
  assert.equal(JSON.stringify(result).includes("private"), false);
  assert.equal(store.tenants[0].commercialName, "Empresa a");
  assert.equal(store.tenants[0].updatedAt.toISOString(), version);
  assert.equal(store.audits.length, 0);
  reset(); failRead = true;
  assert.deepEqual(await loadCompanySettings(), { status: "error" });
});

test("each session uses its own tenant; poisoned previous action state is ignored", async () => {
  reset();
  const result = await updateCompany({ status: "saved", tenantId: "b", actorUserId: "profile-b" }, form("Actualizada A"));
  assert.equal(result.status, "saved");
  assert.equal(store.tenants[0].commercialName, "Actualizada A");
  assert.equal(store.tenants[1].commercialName, "Empresa b");
  assert.deepEqual(revalidations, [["/panel", "layout"]]);
  access.context = context("b");
  assert.equal((await saveCompanySettings(form("Actualizada B"))).status, "saved");
  assert.equal(store.tenants[0].commercialName, "Actualizada A");
  assert.equal(store.tenants[1].commercialName, "Actualizada B");
  assert.equal(store.audits[1].tenantId, "b");
  assert.equal(store.audits[1].actorUserId, "profile-b");
});
