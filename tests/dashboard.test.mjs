import assert from "node:assert/strict";
import { access as fileAccess, readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

function moduleURL(source) {
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText.replace('from "react/jsx-runtime"', `from ${JSON.stringify(import.meta.resolve("react/jsx-runtime"))}`);
  return `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
}
let access, calls, failCount, profileTenant, profileId, role, branchId, scope, path = "/panel";
const context = (tenant = "a", code = "OWNER") => ({ authUserId: `auth-${tenant}`, profileId: `profile-${tenant}`, user: { name: "Memory only", email: "memory@example.invalid" }, tenant: { id: tenant, name: "Memory company" }, assignments: [{ code, label: code, scope: "COMPANY", branch: null }] });
const customers = [{ tenantId: "a", status: "MEMORY-PENDING" }, { tenantId: "a", status: "MEMORY-ACTIVE" }, { tenantId: "b", status: "OTHER" }];
const products = [{ tenantId: "a", isPublished: true }, { tenantId: "a", isPublished: false }, { tenantId: "a", isPublished: false }, { tenantId: "b", isPublished: true }];
function reset(code = "OWNER") { access = { status: "allowed", context: context("a", code) }; calls = []; failCount = false; profileTenant = "a"; profileId = "profile-a"; role = code; branchId = null; scope = "COMPANY"; path = "/panel"; }
globalThis[Symbol.for("milo.dashboard-test")] = {
  getPanelAccess: async () => access,
  Link: ({ href, ...props }) => createElement("a", { href, ...props }),
  usePathname: () => path,
  authClient: { signOut: async () => ({}) },
  prisma: { async $transaction(run, options) {
    calls.push({ model: "$transaction", options });
    return run({
      userProfile: { async findUnique(args) { calls.push({ model: "userProfile", args }); return { id: profileId, tenantId: profileTenant }; } },
      userRoleAssignment: { async findFirst(args) { calls.push({ model: "userRoleAssignment", args }); return { tenantId: profileTenant, userProfileId: profileId, assignmentScope: scope, branchId, role: { code: role, assignmentScope: scope } }; } },
      ...Object.fromEntries([["customer", customers], ["product", products]].map(([model, rows]) => [model, { async count(args) { calls.push({ model, args }); if (failCount) throw new Error("private storage details"); return rows.filter(r => r.tenantId === args.where.tenantId).length; } }])),
    });
  } },
};
const policy = moduleURL(await readFile(new URL("../lib/panel/company-permission.ts", import.meta.url), "utf8"));
const navURL = moduleURL(await readFile(new URL("../lib/panel/navigation.ts", import.meta.url), "utf8"));
const nav = await import(navURL);
let source = await readFile(new URL("../lib/panel/dashboard.ts", import.meta.url), "utf8");
for (const [from, to] of [
  ['import "server-only";', ""],
  ['import { prisma } from "@/lib/prisma";', 'const { prisma } = globalThis[Symbol.for("milo.dashboard-test")];'],
  ['import { getPanelAccess } from "./access";', 'const { getPanelAccess } = globalThis[Symbol.for("milo.dashboard-test")];'],
  ['from "./company-permission"', `from ${JSON.stringify(policy)}`],
]) { assert.ok(source.includes(from)); source = source.replace(from, to); }
const { getDashboardTotals } = await import(moduleURL(source));
const iconsURL = moduleURL(await readFile(new URL("../components/icons.tsx", import.meta.url), "utf8"));
const importLink = 'const Link = globalThis[Symbol.for("milo.dashboard-test")].Link;';
const brandURL = moduleURL((await readFile(new URL("../components/brand.tsx", import.meta.url), "utf8")).replace('import Link from "next/link";', importLink));
const signOutURL = moduleURL((await readFile(new URL("../components/auth/sign-out-button.tsx", import.meta.url), "utf8")).replace('from "react"', `from ${JSON.stringify(import.meta.resolve("react"))}`).replace('import { authClient } from "@/lib/auth-client";', 'const { authClient } = globalThis[Symbol.for("milo.dashboard-test")];'));
let view = await readFile(new URL("../components/panel/dashboard.tsx", import.meta.url), "utf8");
view = view.replace('import Link from "next/link";', importLink).replace('from "@/components/icons"', `from ${JSON.stringify(iconsURL)}`).replace('from "@/lib/panel/navigation"', `from ${JSON.stringify(navURL)}`);
const { Dashboard } = await import(moduleURL(view));
let shell = await readFile(new URL("../components/panel/panel-shell.tsx", import.meta.url), "utf8");
for (const [from, to] of [
  ['from "react"', `from ${JSON.stringify(import.meta.resolve("react"))}`],
  ['import Link from "next/link";', importLink],
  ['import { usePathname } from "next/navigation";', 'const { usePathname } = globalThis[Symbol.for("milo.dashboard-test")];'],
  ['from "@/components/brand"', `from ${JSON.stringify(brandURL)}`],
  ['from "@/components/icons"', `from ${JSON.stringify(iconsURL)}`],
  ['from "@/components/auth/sign-out-button"', `from ${JSON.stringify(signOutURL)}`],
  ['from "@/lib/panel/navigation"', `from ${JSON.stringify(navURL)}`],
]) { assert.ok(shell.includes(from)); shell = shell.replace(from, to); }
const { PanelShell } = await import(moduleURL(shell));
const full = { company: true, catalog: true, branches: true, inventory: true }, none = { company: false, catalog: false, branches: false, inventory: false };

test("dashboard totals count only tenant records, include every state and never query sales/orders", async () => {
  for (const code of ["OWNER", "ADMIN"]) {
    reset(code); assert.deepEqual(await getDashboardTotals(), { status: "ok", customers: 2, products: 3 });
    const counts = calls.filter(c => ["customer", "product"].includes(c.model)); assert.equal(counts.length, 2); counts.forEach(c => assert.deepEqual(c.args, { where: { tenantId: "a" } }));
    assert.equal(calls[0].options.isolationLevel, "RepeatableRead");
  }
  reset(); access.context = context("b"); profileTenant = "b"; profileId = "profile-b"; assert.deepEqual(await getDashboardTotals(), { status: "ok", customers: 1, products: 1 });
  reset(); access.context = context("empty"); profileTenant = "empty"; profileId = "profile-empty"; assert.deepEqual(await getDashboardTotals(), { status: "ok", customers: 0, products: 0 });
});

test("operational roles and missing sessions get no metrics or business queries", async () => {
  for (const code of ["MANAGER", "SALES", "TECHNICIAN", "WAREHOUSE", "PLATFORM_ADMIN"]) { reset(code); assert.deepEqual(await getDashboardTotals(), { status: "restricted" }); assert.equal(calls.length, 0); }
  reset(); access = { status: "unauthenticated" }; assert.deepEqual(await getDashboardTotals(), { status: "restricted" }); assert.equal(calls.length, 0);
});

test("dashboard rechecks stable identity, tenant and COMPANY roles before aggregation; errors never become false zeroes", async () => {
  for (const corrupt of [() => { profileTenant = "b"; }, () => { profileId = "foreign-profile"; }, () => { role = "SALES"; }, () => { branchId = "branch-a"; }, () => { scope = "BRANCH"; }]) {
    reset(); corrupt(); assert.deepEqual(await getDashboardTotals(), { status: "restricted" }); assert.ok(!calls.some(c => c.model === "product" || c.model === "customer"));
  }
  reset(); failCount = true; assert.deepEqual(await getDashboardTotals(), { status: "unavailable" });
});

test("ERP navigation keeps only implemented authorized links and disables pending sections", async () => {
  const items = nav.panelNavigation(full);
  assert.deepEqual(items.map(i => i.label), ["Inicio", "Artículos", "Clientes", "Compras", "Ventas", "Proveedores", "Inventario", "Caja", "Reportes", "Administración", "Herramientas", "Ayuda"]);
  items.filter(i => i.kind === "pending").forEach(i => assert.equal("href" in i, false));
  for (const link of [{ href: "/panel" }, ...nav.quickLinks(full)]) await fileAccess(new URL(`../app${link.href}/page.tsx`, import.meta.url));
  assert.deepEqual(nav.quickLinks(none), []); assert.equal(nav.panelNavigation(none).some(i => i.kind === "group"), false);
  assert.equal(nav.isActiveRoute("/panel/productos/nuevo", "/panel/productos"), true); assert.equal(nav.isActiveRoute("/panel/productos", "/panel"), false); assert.equal(nav.isActiveRoute("/panel/productos-falso", "/panel/productos"), false);
});

test("workspace scope uses verified assignments without inventing an active branch", () => {
  assert.equal(nav.workspaceScope(context()), "Alcance empresarial");
  const c = context("a", "SALES"); c.assignments = [{ code: "SALES", scope: "BRANCH", branch: { id: "a1", name: "Memory branch" } }];
  assert.equal(nav.workspaceScope(c), "Sucursal asignada: Memory branch");
  c.assignments.push({ ...c.assignments[0], code: "WAREHOUSE" }); assert.equal(nav.workspaceScope(c), "Sucursal asignada: Memory branch");
  c.assignments.push({ ...c.assignments[0], branch: { id: "a2", name: "Memory branch two" } }); assert.equal(nav.workspaceScope(c), "2 sucursales asignadas");
  c.assignments = []; assert.equal(nav.workspaceScope(c), "Sin sucursal seleccionada");
});

test("rendered dashboard has four indicators, real zero counts, empty sales and authorized quick access only", () => {
  const html = renderToStaticMarkup(createElement(Dashboard, { context: context(), totals: { status: "ok", customers: 0, products: 0 }, permissions: full, scopeLabel: "Alcance empresarial" }));
  assert.equal((html.match(/<article/g) ?? []).length, 4); assert.equal((html.match(/class="milo-dash-number">0</g) ?? []).length, 2);
  assert.match(html, /Ventas del día/); assert.match(html, /Pedidos de hoy/); assert.match(html, /Sin datos disponibles/); assert.match(html, /pedidos no se consideran ventas cobradas/);
  assert.doesNotMatch(html, /href="\/panel\/(ventas|pedidos|clientes)"/); assert.doesNotMatch(html, /\$|0,00|0\.00|<polyline/);
  const restricted = renderToStaticMarkup(createElement(Dashboard, { context: context("a", "SALES"), totals: { status: "restricted" }, permissions: none, scopeLabel: "Sin sucursal seleccionada" }));
  assert.doesNotMatch(restricted, /milo-dash-number|class="milo-dash-shortcut"/); assert.match(restricted, /tus roles actuales/);
});

test("ERP markup has accessible disclosures, active route, real signout, disabled pending buttons and role filtering", () => {
  reset(); path = "/panel/productos/nuevo";
  const props = { companyName: "Memory company", userName: "Memory user", scopeLabel: "Alcance empresarial", canManageCompany: true, canManageCatalog: true, canManageBranches: true, canReadInventory: true, children: createElement("h1", null, "Preview") };
  const html = renderToStaticMarkup(createElement(PanelShell, props));
  assert.match(html, /Powered by HenkoSoft/); assert.match(html, /Cerrar sesión/); assert.match(html, /aria-expanded="true" aria-controls="panel-articles"/); assert.match(html, /href="\/panel\/productos"[^>]*aria-current="page"/);
  assert.match(html, /id="panel-administration"[^>]*hidden/); assert.match(html, /id="panel-content"/); assert.match(html, /aria-label="Contraer menú lateral"/);
  assert.match(html, /class="milo-erp-nav-item milo-erp-pending" disabled/); assert.doesNotMatch(html, /href="\/panel\/(ventas|clientes|compras|reportes)"/);
  const limited = renderToStaticMarkup(createElement(PanelShell, { ...props, canManageCompany: false, canManageCatalog: false, canManageBranches: false, canReadInventory: false })); assert.doesNotMatch(limited, /id="panel-articles"|id="panel-administration"|href="\/panel\/inventario"/);
});
