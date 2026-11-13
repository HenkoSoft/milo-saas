import assert from "node:assert/strict";
import test from "node:test";
import { customerModules } from "./customer-commercial-loader.mjs";
const { schema, fields, service } = await customerModules({ getPanelAccess: async () => ({ status: "denied" }), prisma: { $queryRaw() { throw Error("Unauthorized metadata query"); } } });
const input = () => ({ ...fields.emptyCommercialFields(), profileMode: "extended", contactName: "Synthetic fixture" });
test("commercial profile accepts an initial contact without mandatory fiscal data and preserves exact fields", () => {
  const data = { ...input(), phone: "123", mobilePhone: "456", whatsapp: "789", instagram: "@fixture", internalNotes: "Line 1\nLine 2", postalCode: "1000", country: "Argentina" };
  assert.deepEqual(schema.commercialCreate.parse(data), data);
  assert.equal(schema.commercialCreate.safeParse({ ...input(), contactName: "" }).success, false);
});
test("DNI/CUIT pair, checksum, canonical separators, email, limits, controls and unknown keys are validated", () => {
  for (const documentNumber of ["1", "12345678"]) assert.equal(schema.commercialCreate.safeParse({ ...input(), documentType: "DNI", documentNumber }).success, true);
  for (const [documentType, documentNumber] of [["", "123"], ["DNI", ""], ["DNI", "00000000"], ["DNI", "123456789"], ["CUIT", "20111111111"], ["OTHER", "1"]]) assert.equal(schema.commercialCreate.safeParse({ ...input(), documentType, documentNumber }).success, false);
  const prefix = "2098765432", weights = [5,4,3,2,7,6,5,4,3,2], digit = (11 - [...prefix].reduce((s,c,i) => s + Number(c)*weights[i], 0) % 11) % 11;
  const number = prefix + digit;
  assert.equal(schema.commercialCreate.parse({ ...input(), documentType: "CUIT", documentNumber: `${number.slice(0,2)}-${number.slice(2,10)}-${number[10]}` }).documentNumber, number);
  for (const invalid of [{ email: "bad" }, { vatCondition: "99" }, { phone: "x".repeat(51) }, { internalNotes: "\u0000" }, { tenantId: "other" }, { status: "APPROVED" }]) assert.equal(schema.commercialCreate.safeParse({ ...input(), ...invalid }).success, false);
});
test("delete requires literal confirmation, UUID and version; unauthorized users cannot inspect schema or invoke CRUD", async () => {
  assert.equal(schema.customerDelete.safeParse({ id: "bad", version: "bad", confirmation: "DELETE" }).success, false);
  assert.equal((await service.listCustomers({ q: "", page: 1 })).status, "forbidden");
  assert.equal((await service.saveCustomer(new FormData(), false)).status, "forbidden");
  assert.equal((await service.deleteCustomer(new FormData())).status, "forbidden");
});
