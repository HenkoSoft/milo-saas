import "../scripts/activation/register-loader.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
const { Prisma } = await import("../generated/prisma/client.ts");
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = uuid(1), B = uuid(2), P = uuid(3), Q = uuid(4), X = uuid(5), Y = uuid(6), S = uuid(7), T = uuid(8), Z = uuid(9);
const version = "2026-11-09T00:00:00.000Z";
let access, store, calls, auditFailure, concurrent, sequence;
function reset(role = "OWNER") {
  access = { status: "allowed", context: { authUserId: "auth-a", profileId: P, tenant: { id: A }, assignments: [{ code: role, scope: "COMPANY", branch: null }] } };
  calls = []; auditFailure = false; concurrent = false; sequence = 100;
  store = {
    userProfile: [{ id: P, tenantId: A, authUserId: "auth-a" }],
    userRoleAssignment: [{ tenantId: A, userProfileId: P, assignmentScope: "COMPANY", branchId: null, role: { code: role, assignmentScope: "COMPANY" } }],
    tenant: [{ id: A, currency: "ARS" }, { id: B, currency: "USD" }],
    unitOfMeasure: [{ code: "UN", name: "Memory unit", dimensionCode: "COUNT" }, { code: "OTHER", name: "Memory compatible", dimensionCode: "COUNT" }, { code: "M", name: "Memory length", dimensionCode: "LENGTH" }],
    product: [{ id: X, tenantId: A, baseUnitCode: "UN", baseUnitDimensionCode: "COUNT", updatedAt: new Date(version) }, { id: Y, tenantId: B, baseUnitCode: "M", baseUnitDimensionCode: "LENGTH", updatedAt: new Date(version) }, { id: Z, tenantId: A, baseUnitCode: "UN", baseUnitDimensionCode: "COUNT", updatedAt: new Date(version) }].map((p, i) => ({ ...p, sku: `SKU-${i}`, name: "Memory product", description: "", categoryId: null, brandId: null, isPublished: false, allowsFractionalQuantity: false })),
    category: [{ id: uuid(20), tenantId: A, name: "Memory category" }, { id: uuid(22), tenantId: B, name: "Memory foreign category" }],
    brand: [{ id: uuid(21), tenantId: A, name: "Memory brand" }, { id: uuid(23), tenantId: B, name: "Memory foreign brand" }],
    productPresentation: [{ id: S, tenantId: A, productId: X, name: "Memory A", unitCode: "UN", dimensionCode: "COUNT", conversionFactor: "10.000", isEnabled: true, updatedAt: new Date(version) }, { id: T, tenantId: B, productId: Y, name: "Memory B", unitCode: "M", dimensionCode: "LENGTH", conversionFactor: "1.000", isEnabled: true, updatedAt: new Date(version) }],
    wholesalePrice: [], orderLine: [], auditEvent: [],
  };
}
function match(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (value instanceof Date) return row[key]?.getTime() === value.getTime();
    if (value && typeof value === "object") return "in" in value ? value.in.includes(row[key]) : match(row[key], value);
    return row[key] === value;
  });
}
function moduleURL(source) { return `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`; }
globalThis[Symbol.for("milo.presentation-test")] = {
  getPanelAccess: async () => access,
  prisma: { async $transaction(callback, options) {
    calls.push({ model: "$transaction", options });
    const draft = structuredClone(store);
    const hydrate = (model, row) => {
      if (!row) return null;
      if (model === "wholesalePrice") return { ...row, amount: new Prisma.Decimal(row.amount) };
      if (model === "productPresentation") return { ...row, conversionFactor: new Prisma.Decimal(row.conversionFactor), price: hydrate("wholesalePrice", draft.wholesalePrice.find(p => p.tenantId === row.tenantId && p.productPresentationId === row.id)), _count: { orderLines: draft.orderLine.filter(l => l.tenantId === row.tenantId && l.productPresentationId === row.id).length } };
      return row;
    };
    const project = (row, select) => !row || !select ? row : Object.fromEntries(Object.entries(select).map(([key, spec]) => [key, spec === true ? row[key] : row[key] == null ? null : project(row[key], spec.select)]));
    const normalize = data => Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Prisma.Decimal.isDecimal(v) ? v.toFixed(k === "amount" ? 2 : 3) : v]));
    const tx = Object.fromEntries(Object.keys(draft).map(model => [model, {
      async findMany(args = {}) { calls.push({ model, operation: "findMany", args }); return draft[model].filter(r => match(r, args.where)).map(r => project(hydrate(model, r), args.select)); },
      async findFirst(args) { return (await this.findMany(args))[0] ?? null; },
      async findUnique(args) { return this.findFirst(args); },
      async findUniqueOrThrow(args) { const row = await this.findFirst(args); assert.ok(row); return row; },
      async count(args) { calls.push({ model, operation: "count", args }); return draft[model].filter(r => match(r, args.where)).length; },
      async create(args) {
        calls.push({ model, operation: "create", args });
        if (model === "auditEvent" && (auditFailure === true || auditFailure === args.data.action)) throw new Error("secret provider detail");
        if (model === "product" && draft.product.some(p => p.tenantId === args.data.tenantId && p.sku === args.data.sku)) throw Object.assign(new Error("duplicate"), { code: "P2002" });
        const row = { id: uuid(sequence++), updatedAt: new Date(version), ...normalize(args.data) }; draft[model].push(row); return project(hydrate(model, row), args.select);
      },
      async updateMany(args) { calls.push({ model, operation: "updateMany", args }); if (concurrent) return { count: 0 }; const row = draft[model].find(r => match(r, args.where)); if (!row) return { count: 0 }; Object.assign(row, normalize(args.data)); return { count: 1 }; },
    }]));
    tx.$executeRaw = async strings => { calls.push({ model: "$executeRaw", sql: strings.join("?") }); return 0; };
    tx.$queryRaw = async (strings, ...values) => {
      const sql = strings.join("?"); const model = sql.includes("public.product_presentations") ? "productPresentation" : "product";
      assert.match(sql, /FOR UPDATE/); calls.push({ model, operation: "lock", values });
      const [tenantId, parent, id] = values;
      return draft[model].filter(r => r.tenantId === tenantId && (model === "product" ? r.id === parent : r.productId === parent && r.id === id)).map(r => ({ id: r.id }));
    };
    const result = await callback(tx); store = draft; return result;
  } },
};
const policy = moduleURL(await readFile(new URL("../lib/panel/catalog-permission.ts", import.meta.url), "utf8"));
const zodURL = import.meta.resolve("zod");
const schema = moduleURL((await readFile(new URL("../lib/catalog/schema.ts", import.meta.url), "utf8")).replace('from "zod"', `from ${JSON.stringify(zodURL)}`));
const presentationsSchema = moduleURL((await readFile(new URL("../lib/catalog/presentation-schema.ts", import.meta.url), "utf8")).replace('from "zod"', `from ${JSON.stringify(zodURL)}`));
const quickSchema = moduleURL((await readFile(new URL("../lib/catalog/quick-product-schema.ts", import.meta.url), "utf8")).replace('from "zod"', `from ${JSON.stringify(zodURL)}`).replace('from "./schema"', `from ${JSON.stringify(schema)}`).replace('from "./presentation-schema"', `from ${JSON.stringify(presentationsSchema)}`));
const quickSale = moduleURL(await readFile(new URL("../lib/catalog/quick-sale.ts", import.meta.url), "utf8"));
let source = await readFile(new URL("../lib/catalog/presentation-service.ts", import.meta.url), "utf8");
for (const [from, to] of [
  ['import "server-only";', ""],
  ['from "@/generated/prisma/client"', `from ${JSON.stringify(new URL("../generated/prisma/client.ts", import.meta.url).href)}`],
  ['import { prisma } from "@/lib/prisma";', 'const { prisma } = globalThis[Symbol.for("milo.presentation-test")];'],
  ['import { getPanelAccess, type PanelContext } from "@/lib/panel/access";', 'const { getPanelAccess } = globalThis[Symbol.for("milo.presentation-test")];'],
  ['from "@/lib/panel/catalog-permission"', `from ${JSON.stringify(policy)}`],
  ['from "./schema"', `from ${JSON.stringify(schema)}`],
  ['from "./presentation-schema"', `from ${JSON.stringify(presentationsSchema)}`],
  ['from "./quick-product-schema"', `from ${JSON.stringify(quickSchema)}`],
  ['from "./quick-sale"', `from ${JSON.stringify(quickSale)}`],
]) { assert.ok(source.includes(from)); source = source.replace(from, to); }
const service = await import(moduleURL(source));
function form(values) { const f = new FormData(); for (const [k, v] of Object.entries(values)) f.set(k, v); return f; }
const presentation = (edit = false, overrides = {}) => form({ productId: X, productVersion: version, name: "Memory edited", unitCode: "UN", factor: "10", isEnabled: "false", ...(edit ? { id: S, version } : {}), ...overrides });
const price = (overrides = {}) => form({ productId: X, productVersion: version, id: S, version, priceVersion: "", currency: "ARS", amount: "123.45", ...overrides });
const mutations = () => calls.filter(c => ["create", "updateMany"].includes(c.operation));

test("presentation operations require OWNER/ADMIN COMPANY and revalidate membership", async () => {
  for (const role of ["MANAGER", "SALES", "TECHNICIAN", "WAREHOUSE"]) {
    reset(role); assert.equal((await service.getPresentationManagement(X)).status, "forbidden"); assert.equal((await service.savePresentation(presentation(), false)).status, "forbidden"); assert.equal((await service.savePresentationPrice(price())).status, "forbidden"); assert.equal(calls.length, 0);
  }
  for (const corrupt of [() => { access = { status: "anonymous" }; }, () => { store.userProfile[0].tenantId = B; }, () => { store.userRoleAssignment[0].role.code = "SALES"; }, () => { store.userRoleAssignment[0].branchId = Q; }, () => { store.userRoleAssignment[0].assignmentScope = "BRANCH"; }]) {
    reset(); corrupt(); assert.equal((await service.savePresentation(presentation(), false)).status, "forbidden"); assert.equal(mutations().length, 0);
  }
  reset("ADMIN"); assert.equal((await service.savePresentation(presentation(), false)).status, "saved");
});

test("reads and all parent locks isolate tenant and product; unit options match dimension", async () => {
  reset(); const result = await service.getPresentationManagement(X);
  assert.equal(result.status, "ok"); assert.deepEqual(result.data.units.map(u => u.code), ["UN", "OTHER"]); assert.equal(result.data.presentations.length, 1); assert.equal(result.data.presentations[0].factor, "10.000"); assert.equal(result.data.presentations[0].price, null);
  assert.equal((await service.getPresentationManagement(Y)).status, "missing");
  for (const values of [{ productId: Y }, { id: T }, { productId: Z }]) { reset(); assert.equal((await service.savePresentation(presentation(true, values), true)).status, "error"); assert.equal(mutations().length, 0); }
  reset(); assert.equal((await service.savePresentationPrice(price({ id: T }))).status, "error"); assert.equal(mutations().length, 0);
});

test("creation uses explicit exact factor, enabled state, dimension and transactional audit without implicit price", async () => {
  reset(); const result = await service.savePresentation(presentation(false, { factor: "999999999999999,999" }), false);
  assert.equal(result.status, "saved"); const row = store.productPresentation.at(-1);
  assert.equal(row.tenantId, A); assert.equal(row.productId, X); assert.equal(row.dimensionCode, "COUNT"); assert.equal(row.conversionFactor, "999999999999999.999"); assert.equal(row.isEnabled, false); assert.equal(store.wholesalePrice.length, 0);
  assert.deepEqual(store.auditEvent.map(e => [e.action, e.actorUserId, e.entityId]), [["PRESENTATION_CREATED", P, row.id]]);
});

test("Zod rejects excess precision, exponent, grouping, zero factors, negative prices, unknown fields and missing explicit selections", async () => {
  for (const factor of ["0", "-1", "1.0000", "1000000000000000", "1e3", "1,000.000", "NaN", "Infinity"]) { reset(); assert.equal((await service.savePresentation(presentation(false, { factor }), false)).status, "invalid"); assert.equal(calls.length, 0); }
  for (const amount of ["", "-0", "-0.01", "-1", "1.001", "10000000000000000", "1e2", "1,000.00"]) { reset(); assert.equal((await service.savePresentationPrice(price({ amount }))).status, "invalid"); assert.equal(calls.length, 0); }
  for (const values of [{ tenantId: B }, { dimensionCode: "LENGTH" }, { isEnabled: "" }, { factor: "" }, { name: "bad\nname" }]) { reset(); assert.equal((await service.savePresentation(presentation(false, values), false)).status, "invalid"); assert.equal(calls.length, 0); }
  reset(); const f = presentation(); f.append("name", "duplicate"); assert.equal((await service.savePresentation(f, false)).status, "invalid");
});

test("missing units and cross-dimension units cannot change presentation identity", async () => {
  for (const unitCode of ["M", "MISSING"]) { reset(); assert.equal((await service.savePresentation(presentation(true, { unitCode }), true)).status, "invalid"); assert.equal(mutations().length, 0); }
});

test("history freezes identity after parent lock, permits rename/state/price, and preserves snapshots", async () => {
  reset(); store.orderLine.push({ tenantId: A, productPresentationId: S, conversionFactorSnapshot: "10.000", unitPriceSnapshot: "20.00" }); const original = JSON.stringify(store.orderLine);
  assert.equal((await service.getPresentationManagement(X)).data.presentations[0].hasHistory, true);
  assert.equal((await service.savePresentation(presentation(true, { factor: "11" }), true)).status, "invalid");
  const historyRead = calls.findIndex(c => c.model === "orderLine" && c.operation === "count"); const lock = calls.findIndex(c => c.model === "productPresentation" && c.operation === "lock"); assert.ok(historyRead > lock);
  assert.equal((await service.savePresentation(presentation(true), true)).status, "saved"); assert.equal(store.productPresentation[0].name, "Memory edited"); assert.equal(store.productPresentation[0].isEnabled, false); assert.equal(store.productPresentation[0].conversionFactor, "10.000");
  const updatedVersion = store.productPresentation[0].updatedAt.toISOString(); assert.equal((await service.savePresentationPrice(price({ version: updatedVersion }))).status, "saved"); assert.equal(JSON.stringify(store.orderLine), original);
  assert.equal(calls.find(c => c.model === "$transaction" && c.options.isolationLevel === "ReadCommitted").options.timeout, 20000);
});

test("unreferenced identity edits are scoped, optimistic and acquire Product then Presentation locks", async () => {
  reset(); assert.equal((await service.savePresentation(presentation(true, { unitCode: "OTHER", factor: "12.345" }), true)).status, "saved");
  assert.equal(store.productPresentation[0].unitCode, "OTHER"); assert.equal(store.productPresentation[0].conversionFactor, "12.345"); assert.equal(store.productPresentation[1].unitCode, "M");
  assert.deepEqual(calls.filter(c => c.operation === "lock").map(c => c.model), ["product", "productPresentation"]);
  assert.equal((await service.savePresentation(presentation(true), true)).status, "conflict");
  reset(); store.product[0].updatedAt = new Date("2026-11-09T00:00:01.000Z"); assert.equal((await service.savePresentation(presentation(), false)).status, "conflict"); assert.equal(mutations().length, 0);
  reset(); concurrent = true; assert.equal((await service.savePresentation(presentation(true), true)).status, "conflict"); assert.equal(store.productPresentation[0].name, "Memory A"); assert.equal(store.auditEvent.length, 0);
});

test("prices persist exact DECIMAL(18,2), validate currency and version and never change foreign records", async () => {
  reset(); assert.equal((await service.savePresentationPrice(price({ amount: "9999999999999999,99" }))).status, "saved");
  assert.equal(store.wholesalePrice.length, 1); assert.equal(store.wholesalePrice[0].amount, "9999999999999999.99"); assert.equal(store.wholesalePrice[0].tenantId, A); assert.equal(store.productPresentation[1].updatedAt.toISOString(), version);
  const view = (await service.getPresentationManagement(X)).data.presentations[0]; assert.equal(view.price, "9999999999999999.99");
  assert.equal((await service.savePresentationPrice(price({ version: view.version, priceVersion: view.priceVersion, amount: "0.01" }))).status, "saved"); assert.equal(store.wholesalePrice[0].amount, "0.01");
  assert.deepEqual(store.auditEvent.map(e => e.action), ["WHOLESALE_PRICE_CREATED", "WHOLESALE_PRICE_UPDATED"]);
  assert.equal((await service.savePresentationPrice(price())).status, "conflict");
  for (const currency of [null, "USD"]) { reset(); store.tenant[0].currency = currency; assert.equal((await service.savePresentationPrice(price())).status, "invalid"); assert.equal(mutations().length, 0); }
  reset(); assert.equal((await service.savePresentationPrice(price({ priceVersion: version }))).status, "conflict"); assert.equal(mutations().length, 0);
});

test("audit errors rollback simulated presentation/price creation and edits without leaking details", async () => {
  for (const operation of [() => service.savePresentation(presentation(), false), () => service.savePresentation(presentation(true), true), () => service.savePresentationPrice(price())]) {
    reset(); auditFailure = true; const before = JSON.stringify(store); const result = await operation(); assert.equal(result.status, "error"); assert.equal(JSON.stringify(store), before); assert.ok(!result.message.includes("secret"));
  }
  reset(); store.wholesalePrice.push({ id: uuid(50), tenantId: A, productPresentationId: S, amount: "50.00", updatedAt: new Date(version) }); auditFailure = true; const before = JSON.stringify(store);
  assert.equal((await service.savePresentationPrice(price({ priceVersion: version }))).status, "error"); assert.equal(JSON.stringify(store), before);
});

test("explicit zero prices persist and audit exactly, remain distinct from no price and can replace positive prices", async () => {
  for (const amount of ["0", "0.00", "0,00"]) {
    reset(); assert.equal((await service.getPresentationManagement(X)).data.presentations[0].price, null);
    assert.equal((await service.savePresentationPrice(price({ amount }))).status, "saved");
    assert.equal(store.wholesalePrice.length, 1); assert.equal(store.wholesalePrice[0].amount, "0.00");
    assert.equal((await service.getPresentationManagement(X)).data.presentations[0].price, "0.00");
    assert.deepEqual(store.auditEvent.map(e => e.action), ["WHOLESALE_PRICE_CREATED"]);
    const view = (await service.getPresentationManagement(X)).data.presentations[0];
    assert.equal((await service.savePresentationPrice(price({ amount: "0", version: view.version, priceVersion: view.priceVersion }))).status, "saved");
    assert.equal(store.auditEvent.length, 1);
  }
  reset(); store.wholesalePrice.push({ id: uuid(50), tenantId: A, productPresentationId: S, amount: "123.45", updatedAt: new Date(version) });
  assert.equal((await service.savePresentationPrice(price({ amount: "0.00", priceVersion: version }))).status, "saved");
  assert.equal(store.wholesalePrice[0].amount, "0.00"); assert.equal(store.auditEvent[0].action, "WHOLESALE_PRICE_UPDATED");
});

test("unchanged writes do not audit and there is no deletion or commercial operation API", async () => {
  reset(); assert.equal((await service.savePresentation(presentation(true, { name: "Memory A", isEnabled: "true" }), true)).status, "saved"); assert.equal(mutations().length, 0);
  store.wholesalePrice.push({ id: uuid(50), tenantId: A, productPresentationId: S, amount: "123.45", updatedAt: new Date(version) });
  assert.equal((await service.savePresentationPrice(price({ priceVersion: version }))).status, "saved"); assert.equal(mutations().length, 0);
  assert.deepEqual(Object.keys(service).sort(), ["getPresentationManagement", "savePresentation", "savePresentationPrice", "saveQuickProduct"]);
});

const quickProduct = (edit = false, overrides = {}) => form({ name: "Memory product", sku: edit ? "SKU-0" : "NEW-SKU", description: "", categoryId: "", brandId: "", isPublished: "false", currency: "ARS", amount: "12,50", ...(edit ? { id: X, version, presentationId: "", presentationVersion: "", priceVersion: "" } : { mode: "individual" }), ...overrides });

test("quick creation atomically creates only product, individual factor-one presentation, explicit price and audit", async () => {
  for (const amount of ["0", "12,50", "9999999999999999.99"]) {
    reset(); const result = await service.saveQuickProduct(quickProduct(false, { amount }), false); assert.equal(result.status, "saved");
    const product = store.product.at(-1), presentation = store.productPresentation.at(-1), price = store.wholesalePrice[0];
    assert.equal(store.product.length, 4); assert.equal(store.productPresentation.length, 3); assert.equal(store.wholesalePrice.length, 1);
    assert.equal(product.tenantId, A); assert.equal(product.baseUnitCode, "UN"); assert.equal(product.baseUnitDimensionCode, "COUNT"); assert.equal(product.allowsFractionalQuantity, false);
    assert.equal(presentation.productId, product.id); assert.equal(presentation.conversionFactor, "1.000"); assert.equal(presentation.unitCode, "UN"); assert.equal(presentation.isEnabled, true);
    assert.equal(price.productPresentationId, presentation.id); assert.equal(price.amount, new Prisma.Decimal(amount.replace(",", ".")).toFixed(2));
    assert.deepEqual(store.auditEvent.map(e => e.action), ["PRODUCT_CREATED", "PRESENTATION_CREATED", "WHOLESALE_PRICE_CREATED"]);
    assert.equal(store.orderLine.length, 0); assert.ok(!calls.some(c => /stock|order/i.test(c.model)));
  }
});

test("quick creation never substitutes missing UN, a wrong dimension, missing currency or an implicit price", async () => {
  for (const corrupt of [() => { store.unitOfMeasure = store.unitOfMeasure.filter(u => u.code !== "UN"); }, () => { store.unitOfMeasure[0].dimensionCode = "LENGTH"; }, () => { store.tenant[0].currency = null; }, () => { store.tenant[0].currency = "USD"; }]) {
    reset(); corrupt(); const before = JSON.stringify(store); assert.equal((await service.saveQuickProduct(quickProduct(), false)).status, "invalid"); assert.equal(JSON.stringify(store), before);
  }
  for (const values of [{ amount: "" }, { amount: "-1" }, { amount: "1.001" }, { amount: "1e2" }, { tenantId: B }, { baseUnitCode: "M" }, { initialStock: "2" }]) {
    reset(); assert.equal((await service.saveQuickProduct(quickProduct(false, values), false)).status, "invalid"); assert.equal(calls.length, 0);
  }
});

test("special creation preserves explicit units and fractions without inventing a presentation or price", async () => {
  reset(); assert.equal((await service.saveQuickProduct(quickProduct(false, { mode: "advanced", baseUnitCode: "M", allowsFractionalQuantity: "true", amount: "" }), false)).status, "saved");
  assert.equal(store.product.at(-1).baseUnitCode, "M"); assert.equal(store.product.at(-1).allowsFractionalQuantity, true); assert.equal(store.productPresentation.length, 2); assert.equal(store.wholesalePrice.length, 0);
  assert.deepEqual(store.auditEvent.map(e => e.action), ["PRODUCT_CREATED"]);
});

test("existing eligible product reuses its unique individual without changing its name, identity, state or history", async () => {
  reset(); store.productPresentation[0].conversionFactor = "1.000";
  store.orderLine.push({ tenantId: A, productPresentationId: S, unitPriceSnapshot: "100.00" }); const history = JSON.stringify(store.orderLine);
  const before = structuredClone(store.productPresentation[0]);
  assert.equal((await service.saveQuickProduct(quickProduct(true, { presentationId: S, presentationVersion: version }), true)).status, "saved");
  assert.equal(store.productPresentation.length, 2); for (const key of ["name", "unitCode", "dimensionCode", "conversionFactor", "isEnabled", "productId"]) assert.equal(store.productPresentation[0][key], before[key]);
  assert.equal(JSON.stringify(store.orderLine), history); assert.equal(store.wholesalePrice[0].amount, "12.50"); assert.ok(!store.auditEvent.some(e => e.action === "PRODUCT_UPDATED"));
  const view = (await service.getPresentationManagement(X)).data.presentations[0];
  const currentProduct = store.product[0].updatedAt.toISOString();
  assert.equal((await service.saveQuickProduct(quickProduct(true, { version: currentProduct, presentationId: S, presentationVersion: view.version, priceVersion: view.priceVersion, amount: "0", name: "Changed" }), true)).status, "saved");
  assert.equal(store.wholesalePrice[0].amount, "0.00"); assert.equal(store.product[0].name, "Changed");
});

test("existing products without individual get one only when price is explicitly entered; metadata edits preserve all presentations", async () => {
  reset(); const before = JSON.stringify(store.productPresentation);
  assert.equal((await service.saveQuickProduct(quickProduct(true, { amount: "", name: "Changed" }), true)).status, "saved"); assert.equal(JSON.stringify(store.productPresentation), before); assert.equal(store.wholesalePrice.length, 0);
  reset(); assert.equal((await service.saveQuickProduct(quickProduct(true), true)).status, "saved"); assert.equal(store.productPresentation.length, 3); assert.equal(store.productPresentation[0].conversionFactor, "10.000"); assert.equal(store.productPresentation.at(-1).conversionFactor, "1.000");
});

test("ambiguous, disabled, fractional and metre products retain their configurations and do not get an invented default", async () => {
  for (const corrupt of [() => { store.product[0].baseUnitCode = "M"; store.product[0].baseUnitDimensionCode = "LENGTH"; }, () => { store.product[0].allowsFractionalQuantity = true; }, () => { store.productPresentation[0].conversionFactor = "1.000"; store.productPresentation[0].isEnabled = false; }, () => { store.productPresentation[0].conversionFactor = "1.000"; store.productPresentation.push({ ...store.productPresentation[0], id: uuid(60) }); }]) {
    reset(); corrupt(); const before = JSON.stringify(store);
    assert.equal((await service.saveQuickProduct(quickProduct(true), true)).status, "invalid"); assert.equal(JSON.stringify(store), before);
    const presentations = JSON.stringify(store.productPresentation);
    assert.equal((await service.saveQuickProduct(quickProduct(true, { amount: "", name: "Metadata only" }), true)).status, "saved"); assert.equal(JSON.stringify(store.productPresentation), presentations);
  }
});

test("quick save denies foreign relations, roles, duplicate SKU and stale product/presentation/price tokens", async () => {
  for (const role of ["SALES", "MANAGER", "TECHNICIAN", "WAREHOUSE"]) { reset(role); assert.equal((await service.saveQuickProduct(quickProduct(), false)).status, "forbidden"); assert.equal(calls.length, 0); }
  for (const values of [{ categoryId: uuid(22) }, { brandId: uuid(23) }]) { reset(); assert.equal((await service.saveQuickProduct(quickProduct(false, values), false)).status, "invalid"); assert.equal(mutations().length, 0); }
  reset(); assert.equal((await service.saveQuickProduct(quickProduct(true, { id: Y }), true)).status, "error"); assert.equal(mutations().length, 0);
  reset(); assert.equal((await service.saveQuickProduct(quickProduct(false, { sku: "SKU-0" }), false)).status, "conflict"); assert.equal(store.product.length, 3);
  for (const values of [{ version: "2026-11-09T00:00:01.000Z" }, { presentationId: T, presentationVersion: version }, { presentationId: S, presentationVersion: "2026-11-09T00:00:01.000Z" }, { presentationId: S, presentationVersion: version, priceVersion: version }]) {
    reset(); store.productPresentation[0].conversionFactor = "1.000"; const before = JSON.stringify(store);
    assert.equal((await service.saveQuickProduct(quickProduct(true, values), true)).status, "conflict"); assert.equal(JSON.stringify(store), before);
  }
});

test("quick create and edits roll back all simulated writes if any audit stage fails", async () => {
  for (const stage of ["PRODUCT_CREATED", "PRESENTATION_CREATED", "WHOLESALE_PRICE_CREATED"]) {
    reset(); auditFailure = stage; const before = JSON.stringify(store); assert.equal((await service.saveQuickProduct(quickProduct(), false)).status, "error"); assert.equal(JSON.stringify(store), before);
  }
  for (const stage of ["PRESENTATION_CREATED", "WHOLESALE_PRICE_CREATED", "PRODUCT_UPDATED"]) {
    reset(); auditFailure = stage; const before = JSON.stringify(store); assert.equal((await service.saveQuickProduct(quickProduct(true, { name: "Changed" }), true)).status, "error"); assert.equal(JSON.stringify(store), before);
  }
});
