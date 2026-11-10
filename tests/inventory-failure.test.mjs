import assert from "node:assert/strict";
import test from "node:test";
import { loadInventory } from "./inventory-loader.mjs";
const { Prisma } = await import("../generated/prisma/client.ts");

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const tenantId = id(1), profileId = id(2), branchId = id(3), productId = id(4), requestId = id(5);
const secret = "DO_NOT_LOG_PROVIDER_SQL_OR_PASSWORD";
let scenario, store, calls, transactions;
const validation = () => new Prisma.PrismaClientValidationError(secret, { clientVersion: "7.10.1" });
function reset(value) { scenario = value; store = { movements: [], balance: null, audits: [] }; calls = []; transactions = 0; }
const db = { async $transaction(run) {
  const number = ++transactions;
  if (scenario === "failed-reconciliation") throw Object.assign(Error(secret), { code: "P1001" });
  const draft = structuredClone(store);
  const tx = {
    $executeRaw: async () => 0,
    $queryRaw: async strings => strings.join("").includes("information_schema") ? [{ ready: true }] : [{ id: productId, baseUnitCode: "UN" }],
    userProfile: { findUnique: async () => ({ id: profileId, tenantId }) },
    userRoleAssignment: { findMany: async () => [{ tenantId, userProfileId: profileId, assignmentScope: "COMPANY", branchId: null, branch: null, role: { code: "OWNER", assignmentScope: "COMPANY" } }] },
    branch: { findFirst: async () => ({ id: branchId }) },
    product: { findFirst: async () => ({ baseUnitCode: "UN" }) },
    stockMovement: {
      async findFirst() { calls.push("movement-read"); if (scenario === "validation-read" && number === 1) throw validation(); const row = draft.movements[0]; return row ? { ...row, quantityDelta: new Prisma.Decimal(row.quantityDelta) } : null; },
      async create({ data }) { calls.push("movement-write"); draft.movements.push({ ...data, quantityDelta: data.quantityDelta.toFixed(3) }); return { id: data.id }; },
    },
    stockBalance: {
      findUnique: async () => draft.balance ? { quantityOnHand: new Prisma.Decimal(draft.balance) } : null,
      create: async ({ data }) => { calls.push("balance-write"); draft.balance = data.quantityOnHand.toFixed(3); },
    },
    auditEvent: { async create({ data }) { calls.push("audit-write"); if (scenario === "validation-audit") throw validation(); draft.audits.push(data); } },
  };
  const result = await run(tx); store = draft;
  if (number === 1 && scenario === "lost-ack") throw Error(secret);
  if (number === 1 && scenario === "validation-after-commit") throw validation();
  return result;
} };
const service = await loadInventory(db, async () => ({ status: "allowed", context: { authUserId: "memory-only", profileId, tenant: { id: tenantId }, assignments: [{ code: "OWNER", scope: "COMPANY", branch: null }] } }));
function form() { const f = new FormData(); for (const [k, v] of Object.entries({ requestId, branchId, productId, baseUnitCode: "UN", quantity: "10", sourceReference: "PRIVATE_REFERENCE" })) f.set(k, v); return f; }
async function captured(run) {
  const previous = console.error, logs = []; console.error = (...args) => logs.push(args);
  try { const result = await run(); const text = JSON.stringify(logs); assert.ok(!text.includes(secret)); assert.ok(!text.includes("PRIVATE_REFERENCE")); assert.ok(!text.includes(profileId)); return { result, logs }; }
  finally { console.error = previous; }
}

test("stale-client validation before commit reports a definite application failure, without retry or reconciliation", async () => {
  for (const value of ["validation-read", "validation-audit"]) {
    reset(value); const { result, logs } = await captured(() => service.recordReceipt(form()));
    assert.equal(result.status, "blocked"); assert.match(result.message, /no se registró/); assert.equal(transactions, 1);
    assert.deepEqual(store, { movements: [], balance: null, audits: [] });
    assert.equal(logs[0][1].requestId, requestId); assert.equal(logs[0][1].code, "PRISMA_CLIENT_VALIDATION");
    assert.equal(logs[0][1].stage, value === "validation-read" ? "idempotency-read" : "audit-create");
  }
});
test("lost commit acknowledgement still reconciles the same identity without a second stock movement", async () => {
  for (const value of ["lost-ack", "validation-after-commit"]) {
    reset(value); const { result } = await captured(() => service.recordReceipt(form()));
    assert.equal(result.status, "saved"); assert.equal(result.repeated, true); assert.equal(result.movementId, requestId);
    assert.equal(transactions, 2); assert.equal(store.movements.length, 1); assert.equal(store.balance, "10.000"); assert.equal(store.audits.length, 1); assert.equal(calls.filter(c => c === "movement-write").length, 1);
  }
});
test("an unavailable reconciliation retains uncertainty and never automatically replays the operation", async () => {
  reset("failed-reconciliation"); const { result, logs } = await captured(() => service.recordReceipt(form()));
  assert.equal(result.status, "error"); assert.match(result.message, /No pudimos confirmar/); assert.equal(transactions, 2); assert.equal(calls.length, 0);
  assert.deepEqual(store, { movements: [], balance: null, audits: [] }); assert.equal(logs[1][1].stage, "commit-reconciliation");
});
