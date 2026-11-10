import "../scripts/activation/register-loader.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
const { Prisma } = await import("../generated/prisma/client.ts");
const id = (prefix, n = 1) => `${prefix}0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1), B = id(1, 2), PA = id(2), PB = id(2, 2), CA = id(3), CB = id(3, 2), BA = id(4), BB = id(4, 2), XA = id(5), XB = id(5, 2);
const version = "2026-11-09T00:00:00.000Z";
let access, store, calls, auditFailure, concurrent, sequence;
function context(tenantId = A, role = "OWNER") {
  return { authUserId: tenantId === A ? "auth-a" : "auth-b", profileId: tenantId === A ? PA : PB, tenant: { id: tenantId, name: "Memory only" }, assignments: [{ code: role, scope: "COMPANY", branch: null }] };
}
function reset() {
  access = { status: "allowed", context: context() }; calls = []; auditFailure = false; concurrent = false; sequence = 100;
  store = {
    userProfile: [{ id: PA, tenantId: A, authUserId: "auth-a" }, { id: PB, tenantId: B, authUserId: "auth-b" }],
    userRoleAssignment: [A, B].map(t => ({ tenantId: t, userProfileId: t === A ? PA : PB, assignmentScope: "COMPANY", branchId: null, role: { code: "OWNER", assignmentScope: "COMPANY" } })),
    tenant: [{ id: A, currency: "ARS" }, { id: B, currency: "USD" }],
    category: [{ id: CA, tenantId: A, name: "Categoría A", updatedAt: new Date(version) }, { id: CB, tenantId: B, name: "Categoría B", updatedAt: new Date(version) }],
    brand: [{ id: BA, tenantId: A, name: "Marca A", updatedAt: new Date(version) }, { id: BB, tenantId: B, name: "Marca B", updatedAt: new Date(version) }],
    unitOfMeasure: [{ code: "MEMORY-UNIT", name: "Unidad de prueba en memoria", dimensionCode: "MEMORY-DIMENSION" }],
    product: [A, B].map(t => ({ id: t === A ? XA : XB, tenantId: t, sku: t === A ? "A-1" : "B-1", name: t === A ? "Producto A" : "Producto B", description: "", categoryId: t === A ? CA : CB, brandId: t === A ? BA : BB, baseUnitCode: "MEMORY-UNIT", baseUnitDimensionCode: "MEMORY-DIMENSION", allowsFractionalQuantity: false, isPublished: false, updatedAt: new Date(version) })),
    productPresentation: [A, B].map(t => ({ id: id(6, t === A ? 1 : 2), tenantId: t, productId: t === A ? XA : XB, name: t === A ? "Presentación A" : "Presentación B", unitCode: "MEMORY-UNIT", conversionFactor: "999999999999999.999", isEnabled: true, price: { amount: "9999999999999999.99" } })),
    auditEvent: [],
  };
}
function moduleURL(source) {
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
}
function match(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return value.some(part => match(row, part));
    if (value instanceof Date) return row[key].getTime() === value.getTime();
    if (value && typeof value === "object") {
      if ("contains" in value) return row[key].toLowerCase().includes(value.contains.toLowerCase());
      if ("in" in value) return value.in.includes(row[key]);
      return match(row[key], value);
    }
    return row[key] === value;
  });
}
globalThis[Symbol.for("milo.catalog-test")] = {
  getPanelAccess: async () => access,
  prisma: {
    async $transaction(callback, options) {
      calls.push({ model: "$transaction", options });
      const draft = structuredClone(store);
      function hydrated(model, row) {
        if (!row) return null;
        if (model === "product") return { ...row, category: draft.category.find(c => c.id === row.categoryId && c.tenantId === row.tenantId) ?? null, brand: draft.brand.find(b => b.id === row.brandId && b.tenantId === row.tenantId) ?? null, baseUnit: draft.unitOfMeasure.find(u => u.code === row.baseUnitCode) };
        if (model === "productPresentation") return { ...row, conversionFactor: new Prisma.Decimal(row.conversionFactor), price: row.price ? { amount: new Prisma.Decimal(row.price.amount) } : null };
        return row;
      }
      function project(row, select) {
        if (!row || !select) return row;
        return Object.fromEntries(Object.entries(select).map(([key, spec]) => [key, spec === true ? row[key] : row[key] === null ? null : project(row[key], spec.select)]));
      }
      const tx = Object.fromEntries(Object.keys(draft).map(model => [model, {
        async findMany(args = {}) {
          calls.push({ model, operation: "findMany", args });
          const rows = draft[model].filter(r => match(r, args.where));
          return rows.slice(args.skip ?? 0, args.take === undefined ? undefined : (args.skip ?? 0) + args.take).map(r => project(hydrated(model, r), args.select));
        },
        async findFirst(args = {}) { return (await this.findMany(args))[0] ?? null; },
        async findUnique(args) { return this.findFirst(args); },
        async findUniqueOrThrow(args) { const row = await this.findFirst(args); if (!row) throw new Error("missing"); return row; },
        async count(args = {}) { calls.push({ model, operation: "count", args }); return draft[model].filter(r => match(r, args.where)).length; },
        async create(args) {
          calls.push({ model, operation: "create", args });
          if (model === "auditEvent" && auditFailure) throw new Error("private database details");
          if (model === "product" && draft.product.some(p => p.tenantId === args.data.tenantId && p.sku === args.data.sku)) throw Object.assign(new Error("duplicate"), { code: "P2002" });
          const row = { id: id(9, sequence++), updatedAt: new Date(version), ...args.data };
          draft[model].push(row);
          return project(hydrated(model, row), args.select);
        },
        async updateMany(args) {
          calls.push({ model, operation: "updateMany", args });
          if (concurrent) return { count: 0 };
          const row = draft[model].find(r => match(r, args.where));
          if (!row) return { count: 0 };
          if (model === "product" && draft.product.some(p => p.id !== row.id && p.tenantId === row.tenantId && p.sku === args.data.sku)) throw Object.assign(new Error("duplicate"), { code: "P2002" });
          Object.assign(row, args.data); return { count: 1 };
        },
      }]));
      const result = await callback(tx); store = draft; return result;
    },
  },
};
const policy = moduleURL(await readFile(new URL("../lib/panel/catalog-permission.ts", import.meta.url), "utf8"));
const schema = moduleURL((await readFile(new URL("../lib/catalog/schema.ts", import.meta.url), "utf8")).replace('from "zod"', `from ${JSON.stringify(import.meta.resolve("zod"))}`));
let source = await readFile(new URL("../lib/catalog/service.ts", import.meta.url), "utf8");
for (const [from, to] of [
  ['import "server-only";', ""],
  ['import { prisma } from "@/lib/prisma";', 'const { prisma } = globalThis[Symbol.for("milo.catalog-test")];'],
  ['import { getPanelAccess, type PanelContext } from "@/lib/panel/access";', 'const { getPanelAccess } = globalThis[Symbol.for("milo.catalog-test")];'],
  ['from "@/lib/panel/catalog-permission"', `from ${JSON.stringify(policy)}`],
  ['from "./schema"', `from ${JSON.stringify(schema)}`],
]) { assert.ok(source.includes(from)); source = source.replace(from, to); }
const service = await import(moduleURL(source));
const query = { q: "", page: "1" };
function form(values) { const f = new FormData(); for (const [k, v] of Object.entries(values)) f.set(k, v); return f; }
const category = (edit = false) => form({ name: "Nueva categoría", ...(edit ? { id: CA, version } : {}) });
const product = (edit = false) => form({ sku: "NEW-1", name: "Nuevo producto", description: "Descripción\nreal en memoria", categoryId: CA, brandId: BA, isPublished: "false", ...(edit ? { id: XA, version } : { baseUnitCode: "MEMORY-UNIT", allowsFractionalQuantity: "false" }) });
const mutations = () => calls.filter(c => ["create", "updateMany"].includes(c.operation));

test("OWNER and ADMIN list/search and edit only their tenant, auditing atomically", async () => {
  for (const role of ["OWNER", "ADMIN"]) {
    reset(); access.context = context(A, role); store.userRoleAssignment[0].role.code = role;
    assert.equal((await service.listCategories(query)).data.total, 1);
    assert.equal((await service.listProducts(query)).data.items[0].id, XA);
    assert.equal((await service.listProducts({ q: "A-1", page: "1" })).data.total, 1);
    assert.equal((await service.listProducts({ q: "B-1", page: "1" })).data.total, 0);
    assert.equal((await service.saveCategory(category(true), true)).status, "saved");
    assert.equal((await service.saveProduct(product(true), true)).status, "saved");
    assert.equal(store.category[1].name, "Categoría B");
    assert.equal(store.product[1].sku, "B-1");
    assert.ok(store.auditEvent.every(e => e.tenantId === A && e.actorUserId === PA));
    assert.deepEqual(store.auditEvent.map(e => e.action), ["CATEGORY_UPDATED", "PRODUCT_UPDATED"]);
    for (const call of calls.filter(c => ["product", "category", "brand", "productPresentation"].includes(c.model))) assert.equal((call.args.where ?? call.args.data).tenantId, A);
  }
});

test("anonymous and operational roles cannot read or persist catalog data", async () => {
  for (const state of ["unauthenticated", "forbidden", "unavailable", "MANAGER", "SALES", "TECHNICIAN", "WAREHOUSE"]) {
    reset();
    if (["unauthenticated", "forbidden", "unavailable"].includes(state)) access = { status: state };
    else { access.context = context(A, state); access.context.assignments[0].scope = "BRANCH"; access.context.assignments[0].branch = { id: "memory", name: "Memory" }; }
    assert.equal((await service.listProducts(query)).status, "forbidden");
    assert.equal((await service.catalogOptions()).status, "forbidden");
    assert.equal((await service.saveProduct(product(), false)).status, "forbidden");
    assert.equal((await service.saveCategory(category(), false)).status, "forbidden");
    assert.equal(calls.length, 0);
  }
});

test("category and product creation persists only allowed fields, no generated commercial records", async () => {
  reset();
  const c = await service.saveCategory(category(), false); assert.equal(c.status, "saved");
  const f = product(); f.set("categoryId", c.id);
  const p = await service.saveProduct(f, false); assert.equal(p.status, "saved");
  const saved = store.product.find(row => row.id === p.id);
  assert.equal(saved.tenantId, A); assert.equal(saved.baseUnitDimensionCode, "MEMORY-DIMENSION"); assert.equal(saved.allowsFractionalQuantity, false); assert.equal(saved.categoryId, c.id);
  assert.equal(store.productPresentation.length, 2);
  assert.deepEqual([...new Set(mutations().map(c => c.model))].sort(), ["auditEvent", "category", "product"]);
  assert.ok(!JSON.stringify(store.auditEvent).includes("Descripción"));
});

test("cross-tenant resource IDs and category/brand relations cannot be adopted", async () => {
  reset(); assert.equal((await service.getCategory(CB)).status, "missing"); assert.equal((await service.getProduct(XB)).status, "missing");
  const c = category(true); c.set("id", CB); assert.equal((await service.saveCategory(c, true)).status, "error");
  const p = product(true); p.set("id", XB); assert.equal((await service.saveProduct(p, true)).status, "error");
  for (const [key, value] of [["categoryId", CB], ["brandId", BB]]) { const f = product(); f.set(key, value); assert.equal((await service.saveProduct(f, false)).status, "invalid"); }
  assert.equal(mutations().length, 0);
  const options = await service.catalogOptions(); assert.deepEqual(options.data.categories.map(c => c.id), [CA]); assert.deepEqual(options.data.brands.map(b => b.id), [BA]);
});

test("malformed or extra fields, implicit fractions and base-unit edits fail validation", async () => {
  for (const [key, value] of [["tenantId", B], ["actorUserId", PB], ["baseUnitDimensionCode", "forged"], ["price", "1.234"], ["stock", "2"], ["conversionFactor", "1"]]) {
    reset(); const f = product(); f.set(key, value); assert.equal((await service.saveProduct(f, false)).status, "invalid"); assert.equal(mutations().length, 0);
  }
  for (const [key, value] of [["baseUnitCode", "OTHER"], ["allowsFractionalQuantity", "true"]]) { reset(); const f = product(true); f.set(key, value); assert.equal((await service.saveProduct(f, true)).status, "invalid"); assert.equal(mutations().length, 0); }
  for (const mutate of [f => f.delete("allowsFractionalQuantity"), f => f.set("allowsFractionalQuantity", ""), f => f.set("sku", ""), f => f.set("name", "x".repeat(201)), f => f.append("sku", "duplicate")]) {
    reset(); const f = product(); mutate(f); assert.equal((await service.saveProduct(f, false)).status, "invalid"); assert.equal(mutations().length, 0);
  }
  reset(); assert.equal((await service.listProducts({ q: ["bad"], page: "1" })).status, "invalid"); assert.equal((await service.getProduct("../bad")).status, "missing");
});

test("missing units block creation and existing flags require an explicit selection", async () => {
  reset(); store.unitOfMeasure = [];
  assert.equal((await service.catalogOptions()).data.units.length, 0);
  assert.equal((await service.saveProduct(product(), false)).status, "invalid"); assert.equal(mutations().length, 0);
  reset(); const f = product(); f.set("allowsFractionalQuantity", "true"); assert.equal((await service.saveProduct(f, false)).status, "saved"); assert.equal(store.product.at(-1).allowsFractionalQuantity, true);
});

test("exact native DECIMAL values are read as strings without rounding or numeric conversion", async () => {
  reset(); const result = await service.getProduct(XA); assert.equal(result.status, "ok");
  assert.equal(result.data.presentations.length, 1);
  assert.equal(result.data.presentations[0].factor, "999999999999999.999");
  assert.equal(result.data.presentations[0].price, "9999999999999999.99"); assert.equal(result.data.currency, "ARS");
  store.productPresentation[0].price = null; assert.equal((await service.getProduct(XA)).data.presentations[0].price, null);
});

test("revocation and membership reassignment are denied inside the transaction", async () => {
  for (const mutate of [() => { store.userProfile[0].tenantId = B; }, () => { store.userRoleAssignment[0].branchId = "memory"; }, () => { store.userRoleAssignment[0].role.code = "SALES"; }]) {
    reset(); mutate(); assert.equal((await service.saveProduct(product(true), true)).status, "forbidden"); assert.equal((await service.listCategories(query)).status, "forbidden"); assert.equal(mutations().length, 0);
  }
});

test("stale versions, concurrent changes and duplicate tenant SKU do not overwrite", async () => {
  reset(); store.product[0].updatedAt = new Date("2026-11-09T00:00:01.000Z"); assert.equal((await service.saveProduct(product(true), true)).status, "conflict"); assert.equal(mutations().length, 0);
  reset(); concurrent = true; assert.equal((await service.saveCategory(category(true), true)).status, "conflict"); assert.equal(store.category[0].name, "Categoría A"); assert.equal(store.auditEvent.length, 0);
  reset(); const f = product(); f.set("sku", "A-1"); assert.equal((await service.saveProduct(f, false)).status, "invalid"); assert.equal(store.product.length, 2); assert.equal(store.auditEvent.length, 0);
  const separate = product(); separate.set("sku", "B-1"); assert.equal((await service.saveProduct(separate, false)).status, "saved");
});

test("audit failures roll back simulated creates/edits and expose no provider details", async () => {
  for (const [fn, f, edit] of [[service.saveCategory, category(), false], [service.saveCategory, category(true), true], [service.saveProduct, product(), false], [service.saveProduct, product(true), true]]) {
    reset(); auditFailure = true; const before = JSON.stringify(store); const result = await fn(f, edit); assert.equal(result.status, "error"); assert.equal(JSON.stringify(store), before); assert.equal(result.message.includes("private"), false);
  }
});

test("unchanged edits do not audit and no deletion API or history mutations exist", async () => {
  reset(); const c = category(true); c.set("name", "Categoría A"); assert.equal((await service.saveCategory(c, true)).status, "saved");
  const p = product(true); p.set("sku", "A-1"); p.set("name", "Producto A"); p.set("description", ""); assert.equal((await service.saveProduct(p, true)).status, "saved");
  assert.equal(mutations().length, 0);
  assert.ok(!Object.keys(service).some(key => /delete|remove/i.test(key)));
});

test("brand CRUD is tenant-scoped, versioned, audited and does not invent name uniqueness", async () => {
  reset(); assert.equal((await service.listBrands(query)).data.total, 1);
  assert.equal((await service.listBrands({ q: "Marca B", page: "1" })).data.total, 0);
  assert.equal((await service.getBrand(BB)).status, "missing");
  const created = await service.saveBrand(form({ name: "Marca A" }), false);
  assert.equal(created.status, "saved"); assert.equal(store.brand.length, 3);
  const updated = await service.saveBrand(form({ id: BA, version, name: "Actualizada" }), true);
  assert.equal(updated.status, "saved"); assert.equal(store.brand[0].name, "Actualizada"); assert.equal(store.brand[1].name, "Marca B");
  assert.deepEqual(store.auditEvent.map(e => e.action), ["BRAND_CREATED", "BRAND_UPDATED"]);
  assert.equal((await service.saveBrand(form({ id: BA, version, name: "Vieja" }), true)).status, "conflict");
  assert.equal((await service.saveBrand(form({ id: BB, version, name: "Ajena" }), true)).status, "error");
});

test("brands deny operational users and rollback when auditing fails", async () => {
  reset(); access.context = context(A, "SALES");
  assert.equal((await service.saveBrand(form({ name: "No" }), false)).status, "forbidden"); assert.equal(calls.length, 0);
  reset(); auditFailure = true; const before = JSON.stringify(store);
  assert.equal((await service.saveBrand(form({ name: "No" }), false)).status, "error"); assert.equal(JSON.stringify(store), before);
});
