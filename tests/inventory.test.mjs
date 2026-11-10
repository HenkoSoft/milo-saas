import assert from "node:assert/strict";
import test from "node:test";
import { loadInventory } from "./inventory-loader.mjs";

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const tenantId = id(1), profileId = id(2), branchId = id(3), productId = id(4);
let access, revoked, storageFailure, calls;
const context = role => ({ authUserId: "memory-auth", profileId, tenant: { id: tenantId }, assignments: [{ code: role, scope: "COMPANY", branch: null }] });
const db = { async $transaction(run, options) {
  calls.push({ model: "$transaction", options });
  if (storageFailure) throw Error("private storage details");
  return run({
    $queryRaw: async () => [{ ready: false }],
    $executeRaw: async () => 0,
    userProfile: { async findUnique(args) { calls.push({ model: "userProfile", args }); return { id: profileId, tenantId: revoked ? id(99) : tenantId }; } },
    userRoleAssignment: { async findMany(args) { calls.push({ model: "userRoleAssignment", args }); return [{ tenantId, userProfileId: profileId, assignmentScope: "COMPANY", branchId: null, branch: null, role: { code: "OWNER", assignmentScope: "COMPANY" } }]; } },
    branch: { async findMany(args) { calls.push({ model: "branch", args }); return [{ id: branchId, name: "Memory only" }]; }, async findFirst() { return { id: branchId }; } },
    product: { async count(args) { calls.push({ model: "product-count", args }); return 1; }, async findMany(args) { calls.push({ model: "product", args }); return [{ id: productId, name: "Memory product", sku: "MEMORY", baseUnitCode: "UN" }]; } },
    stockBalance: { async findMany(args) { calls.push({ model: "stockBalance", args }); return []; } },
  });
} };
const service = await loadInventory(db, async () => access);
function reset(role = "OWNER") { access = { status: "allowed", context: context(role) }; revoked = false; storageFailure = false; calls = []; }

test("inventory consultation denies anonymous and incorrectly scoped operational roles before queries", async () => {
  for (const role of ["MANAGER", "SALES", "TECHNICIAN", "WAREHOUSE"]) { reset(role); assert.equal((await service.listInventory({})).status, "forbidden"); assert.equal(calls.length, 0); }
  reset(); access = { status: "unauthenticated" }; assert.equal((await service.listInventory({})).status, "forbidden");
});
test("branch selection is explicit, foreign branches fail closed, missing balances are never invented zeroes", async () => {
  reset(); const empty = await service.listInventory({}); assert.equal(empty.status, "ok"); assert.equal(empty.data.branch, null); assert.equal(calls.some(c => c.model === "product"), false);
  assert.equal((await service.listInventory({ branch: id(99) })).status, "missing");
  const result = await service.listInventory({ branch: branchId }); assert.equal(result.data.items[0].quantity, null);
  assert.deepEqual(calls.find(c => c.model === "stockBalance").args.where, { tenantId, branchId, productId: { in: [productId] } });
});
test("inventory rejects forged filters and malformed IDs; revoked membership and provider failures disclose no values", async () => {
  reset(); for (const query of [{ branch: "bad" }, { q: ["array"] }, { page: "0" }, { tenantId: id(99) }]) assert.equal((await service.listInventory(query)).status, "invalid"); assert.equal(calls.length, 0);
  assert.equal((await service.inventoryHistory("bad", {})).status, "missing"); assert.equal((await service.inventoryHistory(productId, {})).status, "invalid");
  revoked = true; assert.equal((await service.listInventory({})).status, "forbidden");
  reset(); storageFailure = true; assert.deepEqual(await service.listInventory({}), { status: "error" });
});
test("manual operations validate input and cannot reach a balance write before the migration is ready", async () => {
  assert.deepEqual(Object.keys(service).sort(), ["inventoryHistory", "listInventory", "recordAdjustment", "recordReceipt"]);
  reset();
  const f = new FormData(); for (const [key, value] of Object.entries({ requestId: id(77), branchId, productId, baseUnitCode: "UN", quantity: "10", sourceReference: "" })) f.set(key, value);
  assert.equal((await service.recordReceipt(f)).status, "blocked");
  assert.equal((await service.recordAdjustment(f)).status, "invalid");
  for (const quantity of ["0", "-1", "1.5", "1e2", "1000000000000000"]) { f.set("quantity", quantity); assert.equal((await service.recordReceipt(f)).status, "invalid"); }
});
