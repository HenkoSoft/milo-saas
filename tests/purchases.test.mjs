import "../scripts/activation/register-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { purchaseModules } from "./purchases-loader.mjs";
const { Prisma } = await import("../generated/prisma/client.ts");
const { schema, service, permission } = await purchaseModules({ Prisma, getPanelAccess: async () => ({ status: "unauthenticated" }) });
const input = () => ({ id: randomUUID(), revision: 0, supplierId: randomUUID(), branchId: randomUUID(), date: "2026-11-11", reference: "", notes: "", lines: [{ id: randomUUID(), productId: randomUUID(), baseUnitCode: "UNIT", quantity: "10", unitCost: "100000.01" }] });

test("document IVA is exact, optional legacy fields stay absent, invalid fiscal metadata is rejected", () => {
  const data = input(), document = { type: "FA", pointOfSale: "00001", number: "00000042", category: "Mercadería", taxAmount: "210000.00" };
  const parsed = schema.purchaseInput.parse({ ...data, document });
  assert.equal(service.calculatePurchase(parsed).total.toFixed(2), "1210000.10");
  assert.equal(service.calculatePurchase(parsed).net.toFixed(2), "1000000.10");
  for (const taxAmount of ["", "-1", "1.001", "NaN", "1e3", "210.000,00"]) assert.equal(schema.purchaseInput.safeParse({ ...data, document: { ...document, taxAmount } }).success, false);
  for (const invalid of [{type:"NC"},{number:"123456789"},{pointOfSale:"123456"},{tenantId:randomUUID()},{category:"line\nbreak"}]) assert.equal(schema.purchaseInput.safeParse({ ...data, document: { ...document, ...invalid } }).success, false);
  const empty = schema.purchaseInput.parse({ ...data, document: { type: "", pointOfSale: "", number: "", category: "", taxAmount: null } });
  assert.equal(empty.document, undefined); assert.equal(JSON.stringify(empty), JSON.stringify(schema.purchaseInput.parse(data)));
  const maximum = { ...parsed, lines: [{...data.lines[0],quantity:"1",unitCost:"9999999999999999.99"}], document:{...document,taxAmount:"0.01"} }; assert.throws(() => service.calculatePurchase(maximum));
});
test("purchase totals use exact Decimal and preserve zero without coercing blanks", () => {
  const data = input(); assert.equal(service.calculatePurchase(data).total.toFixed(2), "1000000.10");
  data.lines[0].unitCost = "0"; assert.equal(service.calculatePurchase(data).total.toFixed(2), "0.00");
  for (const invalid of ["", "-1", "1.001", "1.000,00", "NaN", "1e3"]) { data.lines[0].unitCost = invalid; assert.equal(schema.purchaseInput.safeParse(data).success, false); }
});
test("purchase validation rejects fractions, impossible dates, duplicate ids and untrusted keys", () => {
  const data = input();
  for (const quantity of ["0", "1.5", "-10", "1,5", "1000000000000000"]) assert.equal(schema.purchaseInput.safeParse({ ...data, lines: [{ ...data.lines[0], quantity }] }).success, false);
  assert.equal(schema.purchaseInput.safeParse({ ...data, date: "2026-02-30" }).success, false);
  assert.equal(schema.purchaseInput.safeParse({ ...data, lines: [data.lines[0], data.lines[0]] }).success, false);
  assert.equal(schema.purchaseInput.safeParse({ ...data, tenantId: randomUUID() }).success, false);
  assert.equal(schema.receiveInput.safeParse({ id: data.id, revision: 1, operationId: randomUUID(), confirmation: "" }).success, false);
});
test("purchase arithmetic rejects overflow without rounding", () => {
  const data = input(); data.lines[0].unitCost = "9999999999999999.99";
  assert.throws(() => service.calculatePurchase(data), /máximo/);
});
test("only company OWNER and ADMIN may access purchases and costs", async () => {
  for (const code of ["OWNER", "ADMIN", "WAREHOUSE", "MANAGER", "SALES", "TECHNICIAN", "PLATFORM_ADMIN"]) {
    assert.equal(permission.canManagePurchases({ assignments: [{ code, scope: "COMPANY", branch: null }] }), ["OWNER", "ADMIN"].includes(code));
    assert.equal(permission.canManagePurchases({ assignments: [{ code, scope: "BRANCH", branch: { id: randomUUID() } }] }), false);
  }
  assert.equal((await service.loadPurchase(null)).status, "forbidden");
  assert.equal((await service.savePurchase(input())).status, "forbidden");
});
