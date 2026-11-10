import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Execute the real guard. Only request/DB transports and Next redirects are replaced.
// Fixtures stay in memory; no .env, PostgreSQL users, tenants or sessions are created.
let session;
let profile;
let assignments;
let failure;
const calls = [];
const requestHeaders = new Headers({ cookie: "opaque-session", "x-tenant-id": "forged-tenant", "x-role": "OWNER" });
globalThis[Symbol.for("milo.panel-test")] = {
  headers: async () => requestHeaders,
  redirect: (path) => { throw Object.assign(new Error("REDIRECT"), { path }); },
  auth: { api: { async getSession(args) {
    calls.push({ kind: "session", args });
    if (failure === "session") throw new Error("private connection secret");
    return session;
  } } },
  prisma: {
    userProfile: { async findUnique(args) {
      calls.push({ kind: "profile", args });
      if (failure === "profile") throw new Error("private database secret");
      return profile;
    } },
    userRoleAssignment: { async findMany(args) {
      calls.push({ kind: "roles", args });
      if (failure === "roles") throw new Error("private roles secret");
      return assignments;
    } },
  },
};
let source = await readFile(new URL("../lib/panel/access.ts", import.meta.url), "utf8");
for (const [from, to] of [
  ['import "server-only";', ""],
  ['import { cache } from "react";', "const cache = (fn) => fn;"],
  ['import { headers } from "next/headers";', 'const { headers } = globalThis[Symbol.for("milo.panel-test")];'],
  ['import { redirect } from "next/navigation";', 'const { redirect } = globalThis[Symbol.for("milo.panel-test")];'],
  ['import { auth } from "@/lib/auth";', 'const { auth } = globalThis[Symbol.for("milo.panel-test")];'],
  ['import { prisma } from "@/lib/prisma";', 'const { prisma } = globalThis[Symbol.for("milo.panel-test")];'],
]) {
  assert.ok(source.includes(from));
  source = source.replace(from, to);
}
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { getPanelAccess, requirePanelContext } = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

function reset() {
  calls.length = 0;
  failure = undefined;
  session = {
    user: { id: "identity-a", name: "Persona de prueba", email: "only-in-memory@example.invalid" },
    session: { userId: "identity-a", expiresAt: new Date(Date.now() + 60_000), token: "never-serialize-this" },
  };
  profile = { id: "profile-a", authUserId: "identity-a", tenantId: "tenant-a", tenant: { id: "tenant-a", commercialName: "Empresa A", legalName: null } };
  assignments = [];
}
function assignment(code, branchId = "branch-a") {
  const company = code === "OWNER" || code === "ADMIN";
  return {
    tenantId: "tenant-a", userProfileId: "profile-a", assignmentScope: company ? "COMPANY" : "BRANCH",
    role: { code, assignmentScope: company ? "COMPANY" : "BRANCH" }, branchId: company ? null : branchId,
    branch: company ? null : { id: branchId, tenantId: "tenant-a", name: `Sucursal ${branchId}` },
  };
}

test("missing, expired, revoked and mismatched sessions deny before profile queries", async () => {
  for (const mutate of [
    () => { session = null; },
    () => { session.session.expiresAt = new Date(0); },
    () => { session.session.expiresAt = "invalid-date"; },
    () => { session.session.userId = "other-identity"; },
  ]) {
    reset(); mutate();
    assert.deepEqual(await getPanelAccess(), { status: "unauthenticated" });
    assert.deepEqual(calls.map(c => c.kind), ["session"]);
    await assert.rejects(requirePanelContext(), error => error.path === "/acceso");
  }
});

test("membership is resolved by authUserId, scoped to its tenant and projected without credentials", async () => {
  reset(); assignments = [assignment("ADMIN")];
  const access = await getPanelAccess();
  assert.equal(access.status, "allowed");
  assert.equal(access.context.tenant.id, "tenant-a");
  assert.equal(access.context.user.name, session.user.name);
  assert.deepEqual(calls.find(c => c.kind === "profile").args.where, { authUserId: "identity-a" });
  assert.deepEqual(calls.find(c => c.kind === "roles").args.where, { tenantId: "tenant-a", userProfileId: "profile-a" });
  assert.deepEqual(calls[0].args.query, { disableCookieCache: true, disableRefresh: true });
  assert.equal(calls[0].args.headers, requestHeaders);
  for (const text of ["forged-tenant", "never-serialize-this", "opaque-session", "permissions"])
    assert.equal(JSON.stringify(access).includes(text), false);
  assert.deepEqual(await requirePanelContext(), access.context);
});

test("all six approved roles retain company or branch scope, including multiple branches", async () => {
  for (const code of ["OWNER", "ADMIN", "MANAGER", "SALES", "TECHNICIAN", "WAREHOUSE"]) {
    reset(); assignments = [assignment(code)];
    const { status, context } = await getPanelAccess();
    assert.equal(status, "allowed");
    assert.equal(context.assignments[0].code, code);
    assert.equal(context.assignments[0].scope, ["OWNER", "ADMIN"].includes(code) ? "COMPANY" : "BRANCH");
  }
  reset(); assignments = [assignment("SALES", "one"), assignment("WAREHOUSE", "two")];
  const { context } = await getPanelAccess();
  assert.deepEqual(context.assignments.map(a => a.branch.id), ["one", "two"]);
});

test("membership without roles grants only the basic account screen, no inferred permissions", async () => {
  reset();
  const result = await getPanelAccess();
  assert.equal(result.status, "allowed");
  assert.deepEqual(result.context.assignments, []);
  assert.equal("permissions" in result.context, false);
});

test("missing profile, wrong identity, absent tenant and cross-tenant membership deny safely", async () => {
  for (const mutate of [
    () => { profile = null; },
    () => { profile.authUserId = "other-identity"; },
    () => { profile.tenant = null; },
    () => { profile.tenant.id = "tenant-b"; },
  ]) {
    reset(); mutate();
    assert.deepEqual(await getPanelAccess(), { status: "forbidden" });
    assert.equal(calls.some(c => c.kind === "roles"), false);
    await assert.rejects(requirePanelContext(), error => error.path === "/acceso?motivo=sin-acceso");
  }
});

test("unknown roles and inconsistent tenant/branch/scope assignments fail closed", async () => {
  for (const mutate of [
    row => { row.role.code = "SUPERADMIN"; },
    row => { row.role.code = "constructor"; },
    row => { row.tenantId = "tenant-b"; },
    row => { row.userProfileId = "other-profile"; },
    row => { row.branch.tenantId = "tenant-b"; },
    row => { row.branch.id = "wrong-branch"; },
    row => { row.branch = null; },
    row => { row.assignmentScope = "COMPANY"; },
    row => { row.role.assignmentScope = "COMPANY"; },
    row => { row.role.code = "OWNER"; row.role.assignmentScope = "COMPANY"; row.assignmentScope = "COMPANY"; },
  ]) {
    reset(); assignments = [assignment("SALES")]; mutate(assignments[0]);
    assert.deepEqual(await getPanelAccess(), { status: "forbidden" });
  }
});

test("authentication or storage errors deny without disclosing details", async () => {
  for (const point of ["session", "profile", "roles"]) {
    reset(); failure = point;
    assert.deepEqual(await getPanelAccess(), { status: "unavailable" });
    await assert.rejects(requirePanelContext(), error => error.path === "/acceso?motivo=no-disponible");
  }
});

test("membership is re-read on later requests after reassignment/revocation", async () => {
  reset(); assert.equal((await getPanelAccess()).context.tenant.id, "tenant-a");
  profile = null;
  assert.equal((await getPanelAccess()).status, "forbidden");
});
