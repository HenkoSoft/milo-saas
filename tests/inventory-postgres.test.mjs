import "../scripts/activation/register-loader.mjs";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { loadInventory } from "./inventory-loader.mjs";

const connectionString = process.env.MILO_INVENTORY_TEST_DATABASE_URL;
const permitted = process.env.MILO_INVENTORY_TEST_ALLOW_WRITE === "YES_ISOLATED_DATABASE";
test("REAL PostgreSQL inventory receipts, adjustments, idempotency, permissions, concurrency, rollback and commit reconciliation", { skip: (!connectionString && !permitted) || process.env.MILO_INVENTORY_TEST_PHASE === "legacy" }, async () => {
  let db, phase = "target";
  try {
    assert.ok(connectionString && permitted);
    const url = new URL(connectionString);
    assert.ok(["postgres:", "postgresql:"].includes(url.protocol)); assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "5432"); assert.match(url.pathname, /^\/milo_inventory_test_[a-f0-9]{12}$/);
    assert.ok([...url.searchParams].every(([k, v]) => k === "schema" && v === "public"));
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient, Prisma } = await import("../generated/prisma/client.ts");
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name, url.pathname.slice(1));
    for (const model of ["tenant", "authUser", "branch", "product", "stockBalance", "stockMovement", "auditEvent"]) assert.equal(await db[model].count(), 0);
    phase = "isolated-fixtures";
    const tenantA = randomUUID(), tenantB = randomUUID(), branchA = randomUUID(), branchA2 = randomUUID(), branchB = randomUUID(), productA = randomUUID(), productA2 = randomUUID(), productB = randomUUID(), profileA = randomUUID(), profileB = randomUUID(), movement = randomUUID(), roleId = randomUUID();
    const authA = "inventory-test-a", authB = "inventory-test-b";
    await db.$transaction(async tx => {
      await tx.unitOfMeasure.create({ data: { code: "TEST-UNIT", name: "Isolated test unit", dimensionCode: "TEST-DIMENSION" } });
      for (const [tenantId, profileId, authId] of [[tenantA, profileA, authA], [tenantB, profileB, authB]]) {
        await tx.tenant.create({ data: { id: tenantId, commercialName: "Isolated inventory test", timeZone: "America/Argentina/Buenos_Aires" } });
        // Fixture identities have no credentials, account, session or verified email.
        await tx.authUser.create({ data: { id: authId, name: "Isolated test operator", email: `${authId}@example.invalid`, emailVerified: false } });
        await tx.userProfile.create({ data: { id: profileId, tenantId, authUserId: authId } });
      }
      await tx.roleDefinition.create({ data: { id: roleId, code: "OWNER", name: "Isolated test owner", assignmentScope: "COMPANY" } });
      for (const [tenantId, userProfileId] of [[tenantA, profileA], [tenantB, profileB]]) await tx.userRoleAssignment.create({ data: { tenantId, userProfileId, roleId, assignmentScope: "COMPANY", branchId: null } });
      for (const [id, tenantId] of [[branchA, tenantA], [branchA2, tenantA], [branchB, tenantB]]) await tx.branch.create({ data: { id, tenantId, name: "Isolated test branch" } });
      for (const [id, tenantId, sku] of [[productA, tenantA, "A-1"], [productA2, tenantA, "A-2"], [productB, tenantB, "B-1"]]) await tx.product.create({ data: { id, tenantId, sku, name: "Isolated test item", description: "Test only", baseUnitCode: "TEST-UNIT", baseUnitDimensionCode: "TEST-DIMENSION", allowsFractionalQuantity: false, isPublished: false } });
      for (const [tenantId, branchId, productId, quantity, actorUserId] of [[tenantA, branchA, productA, "10", profileA], [tenantA, branchA2, productA, "20", profileA], [tenantB, branchB, productB, "999", profileB]]) {
        await tx.stockBalance.create({ data: { tenantId, branchId, productId, quantityOnHand: new Prisma.Decimal(quantity) } });
        await tx.stockMovement.create({ data: { ...(branchId === branchA ? { id: movement } : {}), tenantId, branchId, productId, movementType: "ISOLATED_TEST_FIXTURE", quantityDelta: new Prisma.Decimal(quantity), actorUserId } });
      }
    });
    let access = { status: "allowed", context: { authUserId: authA, profileId: profileA, tenant: { id: tenantA }, assignments: [{ code: "OWNER", scope: "COMPANY", branch: null }] } };
    const service = await loadInventory(db, async () => access);
    const operation = (overrides = {}) => {
      const form = new FormData();
      for (const [key, value] of Object.entries({ requestId: randomUUID(), branchId: branchA, productId: productA2, baseUnitCode: "TEST-UNIT", quantity: "10", sourceReference: "ISOLATED-TEST-REFERENCE", ...overrides })) form.set(key, value);
      return form;
    };
    phase = "real-consultation";
    const listing = await service.listInventory({ branch: branchA }); assert.equal(listing.status, "ok"); assert.equal(listing.data.operationsReady, true); assert.equal(listing.data.total, 2); assert.equal(listing.data.items.find(p => p.id === productA).quantity, "10.000"); assert.equal(listing.data.items.find(p => p.id === productA2).quantity, null);
    assert.equal((await service.listInventory({ branch: branchA2 })).data.items.find(p => p.id === productA).quantity, "20.000");
    const history = await service.inventoryHistory(productA, { branch: branchA }); assert.equal(history.status, "ok"); assert.equal(history.data.movements.length, 1); assert.equal(history.data.movements[0].quantity, "10.000"); assert.equal(history.data.movements[0].actorId, profileA); assert.equal(history.data.movements[0].sourceOrderId, null);
    phase = "cross-tenant-branch-denial";
    assert.equal((await service.listInventory({ branch: branchB })).status, "missing"); assert.equal((await service.inventoryHistory(productB, { branch: branchA })).status, "missing");
    access.context.profileId = profileB; assert.equal((await service.listInventory({ branch: branchA })).status, "forbidden"); access.context.profileId = profileA;
    await db.userRoleAssignment.deleteMany({ where: { tenantId: tenantA } }); assert.equal((await service.listInventory({ branch: branchA })).status, "forbidden");
    await db.userRoleAssignment.create({ data: { tenantId: tenantA, userProfileId: profileA, roleId, assignmentScope: "COMPANY", branchId: null } });
    phase = "warehouse-assigned-branch-only";
    const warehouseRole = await db.roleDefinition.create({ data: { code: "WAREHOUSE", name: "Isolated test warehouse", assignmentScope: "BRANCH" } });
    await db.userRoleAssignment.deleteMany({ where: { tenantId: tenantA } });
    await db.userRoleAssignment.create({ data: { tenantId: tenantA, userProfileId: profileA, roleId: warehouseRole.id, assignmentScope: "BRANCH", branchId: branchA2 } });
    access.context.assignments = [{ code: "WAREHOUSE", scope: "BRANCH", branch: { id: branchA2, name: "Isolated test branch" } }];
    assert.equal((await service.listInventory({ branch: branchA })).status, "missing"); assert.equal((await service.inventoryHistory(productA, { branch: branchA })).status, "missing");
    assert.equal((await service.listInventory({ branch: branchA2 })).data.items.find(p => p.id === productA).quantity, "20.000");
    assert.equal((await service.listInventory({})).data.branches.length, 1);
    assert.equal((await service.recordReceipt(operation({ branchId: branchA }))).status, "forbidden");
    assert.equal((await service.recordReceipt(operation({ branchId: branchA2, quantity: "1" }))).status, "saved");
    const managerRole = await db.roleDefinition.create({ data: { code: "MANAGER", name: "Isolated test manager", assignmentScope: "BRANCH" } });
    await db.userRoleAssignment.deleteMany({ where: { tenantId: tenantA } });
    await db.userRoleAssignment.create({ data: { tenantId: tenantA, userProfileId: profileA, roleId: managerRole.id, assignmentScope: "BRANCH", branchId: branchA2 } });
    access.context.assignments = [{ code: "MANAGER", scope: "BRANCH", branch: { id: branchA2, name: "Isolated test branch" } }];
    assert.equal((await service.listInventory({ branch: branchA2 })).status, "ok"); assert.equal((await service.recordReceipt(operation({ branchId: branchA2 }))).status, "forbidden");
    assert.equal((await service.recordAdjustment(operation({ branchId: branchA2, direction: "add", reason: "ISOLATED TEST" }))).status, "forbidden");
    // A read-only Manager assignment must not expand Warehouse write scope.
    await db.userRoleAssignment.create({ data: { tenantId: tenantA, userProfileId: profileA, roleId: warehouseRole.id, assignmentScope: "BRANCH", branchId: branchA } });
    access.context.assignments.push({ code: "WAREHOUSE", scope: "BRANCH", branch: { id: branchA, name: "Isolated test branch" } });
    assert.equal((await service.recordReceipt(operation({ branchId: branchA2 }))).status, "forbidden");
    await db.userRoleAssignment.deleteMany({ where: { tenantId: tenantA } });
    await db.userRoleAssignment.create({ data: { tenantId: tenantA, userProfileId: profileA, roleId, assignmentScope: "COMPANY", branchId: null } });
    access.context.assignments = [{ code: "OWNER", scope: "COMPANY", branch: null }];
    phase = "existing-sql-invariants";
    await assert.rejects(db.stockBalance.update({ where: { tenantId_branchId_productId: { tenantId: tenantA, branchId: branchA, productId: productA } }, data: { quantityOnHand: new Prisma.Decimal("-1") } }));
    await assert.rejects(db.stockMovement.update({ where: { id: movement }, data: { quantityDelta: new Prisma.Decimal("99") } }));
    await assert.rejects(db.stockMovement.delete({ where: { id: movement } }));
    await assert.rejects(db.$executeRaw`TRUNCATE public.stock_movements`);
    // Cross-tenant actor/FKs must be rejected by PostgreSQL itself.
    await assert.rejects(db.stockMovement.create({ data: { tenantId: tenantA, branchId: branchA, productId: productA, movementType: "ISOLATED_TEST_FIXTURE", quantityDelta: new Prisma.Decimal("1"), actorUserId: profileB } }));
    await assert.rejects(db.stockMovement.create({ data: { tenantId: tenantA, branchId: branchA, productId: productA, movementType: "MANUAL_RECEIPT", quantityDelta: new Prisma.Decimal("-1"), actorUserId: profileA } }));
    await assert.rejects(db.stockMovement.create({ data: { tenantId: tenantA, branchId: branchA, productId: productA, movementType: "MANUAL_ADJUSTMENT", quantityDelta: new Prisma.Decimal("1"), reason: " ", actorUserId: profileA } }));
    phase = "storage-transaction-rollback";
    const before = { movements: await db.stockMovement.count(), audit: await db.auditEvent.count() };
    const abortedId = randomUUID();
    await assert.rejects(db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM public.products WHERE "tenantId"=${tenantA}::uuid AND id=${productA}::uuid FOR UPDATE`;
      await tx.stockBalance.update({ where: { tenantId_branchId_productId: { tenantId: tenantA, branchId: branchA, productId: productA } }, data: { quantityOnHand: { increment: new Prisma.Decimal("1") } } });
      await tx.stockMovement.create({ data: { id: abortedId, tenantId: tenantA, branchId: branchA, productId: productA, movementType: "ISOLATED_TEST_FIXTURE", quantityDelta: new Prisma.Decimal("1"), actorUserId: profileA } });
      await tx.auditEvent.create({ data: { tenantId: tenantA, actorUserId: profileA, action: "ISOLATED_STORAGE_TEST", entityType: "StockMovement", entityId: abortedId } });
      throw Error("EXPECTED_TEST_ROLLBACK");
    }), /EXPECTED_TEST_ROLLBACK/);
    assert.equal(await db.stockMovement.count(), before.movements); assert.equal(await db.auditEvent.count(), before.audit); assert.equal((await service.inventoryHistory(productA, { branch: branchA })).data.quantity, "10.000");
    phase = "concurrent-product-lock";
    let release, announce;
    const gate = new Promise(r => { release = r; }), held = new Promise(r => { announce = r; });
    const owner = db.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM public.products WHERE "tenantId"=${tenantA}::uuid AND id=${productA}::uuid FOR UPDATE`; announce(); await gate; });
    await held;
    try { await assert.rejects(db.$transaction(async tx => { await tx.$executeRaw`SET LOCAL lock_timeout='200ms'`; await tx.$queryRaw`SELECT id FROM public.products WHERE "tenantId"=${tenantA}::uuid AND id=${productA}::uuid FOR UPDATE`; })); }
    finally { release(); await owner; }
    assert.equal((await service.inventoryHistory(productA, { branch: branchA })).data.quantity, "10.000");
    phase = "real-receipt-10-and-idempotency";
    const first = operation();
    assert.equal((await service.recordReceipt(first)).status, "saved");
    assert.equal((await service.inventoryHistory(productA2, { branch: branchA })).data.quantity, "10.000");
    const countAfterFirst = await db.stockMovement.count();
    const repeated = await service.recordReceipt(first); assert.equal(repeated.status, "saved"); assert.equal(repeated.repeated, true);
    assert.equal(await db.stockMovement.count(), countAfterFirst); assert.equal((await service.inventoryHistory(productA2, { branch: branchA })).data.quantity, "10.000");
    const conflicting = operation({ requestId: first.get("requestId"), quantity: "11" }); assert.equal((await service.recordReceipt(conflicting)).status, "conflict");
    assert.equal((await service.recordReceipt(operation({ baseUnitCode: "STALE-UNIT" }))).status, "conflict");
    assert.equal((await service.recordReceipt(operation({ branchId: branchB }))).status, "forbidden");
    assert.equal((await service.recordReceipt(operation({ productId: productB }))).status, "forbidden");
    assert.equal((await service.recordReceipt(operation({ quantity: "999999999999999" }))).status, "invalid");
    assert.equal((await service.recordReceipt(operation({ quantity: "1.5" }))).status, "invalid");
    assert.equal(await db.stockMovement.count(), countAfterFirst);
    phase = "real-adjustment-and-history";
    const adjustment = operation({ quantity: "3", direction: "subtract", reason: "ISOLATED TEST COUNT CORRECTION", sourceReference: "ISOLATED-COUNT-REF" });
    assert.equal((await service.recordAdjustment(adjustment)).status, "saved");
    const adjusted = (await service.inventoryHistory(productA2, { branch: branchA })).data;
    assert.equal(adjusted.quantity, "7.000"); assert.equal(adjusted.movements.length, 2);
    const correction = adjusted.movements.find(m => m.type === "MANUAL_ADJUSTMENT"); assert.equal(correction.quantity, "-3.000"); assert.equal(correction.reason, "ISOLATED TEST COUNT CORRECTION"); assert.equal(correction.sourceReference, "ISOLATED-COUNT-REF"); assert.equal(correction.actorId, profileA);
    assert.equal((await service.recordAdjustment(adjustment)).repeated, true); assert.equal((await service.inventoryHistory(productA2, { branch: branchA })).data.quantity, "7.000");
    assert.equal((await service.recordAdjustment(operation({ direction: "add", quantity: "2", reason: "ISOLATED TEST POSITIVE CORRECTION" }))).status, "saved");
    const beforeNegative = await db.stockMovement.count(); assert.equal((await service.recordAdjustment(operation({ direction: "subtract", quantity: "99", reason: "ISOLATED TEST INSUFFICIENT" }))).status, "invalid"); assert.equal(await db.stockMovement.count(), beforeNegative);
    assert.equal((await service.recordAdjustment(operation({ direction: "add", reason: "" }))).status, "invalid");
    phase = "real-concurrent-receipts";
    const concurrent = await Promise.all([service.recordReceipt(operation({ quantity: "4" })), service.recordReceipt(operation({ quantity: "6" }))]); assert.ok(concurrent.every(r => r.status === "saved")); assert.equal((await service.inventoryHistory(productA2, { branch: branchA })).data.quantity, "19.000");
    const same = operation({ quantity: "2" }); const duplicates = await Promise.all([service.recordReceipt(same), service.recordReceipt(same)]); assert.ok(duplicates.every(r => r.status === "saved")); assert.equal(duplicates.filter(r => r.repeated).length, 1); assert.equal((await service.inventoryHistory(productA2, { branch: branchA })).data.quantity, "21.000");
    phase = "real-audit-failure-rollback";
    let reachedAudit = false;
    const failingDB = { $transaction: (run, options) => db.$transaction(tx => run(new Proxy(tx, { get(target, key) {
      if (key === "auditEvent") return { create: async () => { reachedAudit = true; throw Error("INJECTED_AUDIT_FAILURE"); } };
      const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
    } })), options) };
    const failing = await loadInventory(failingDB, async () => access);
    const auditCounts = { movements: await db.stockMovement.count(), events: await db.auditEvent.count() };
    assert.equal((await failing.recordReceipt(operation({ quantity: "3" }))).status, "error"); assert.equal(reachedAudit, true); assert.equal(await db.stockMovement.count(), auditCounts.movements); assert.equal(await db.auditEvent.count(), auditCounts.events); assert.equal((await service.inventoryHistory(productA2, { branch: branchA })).data.quantity, "21.000");
    phase = "lost-commit-acknowledgement";
    let loseAck = true;
    const uncertainDB = { async $transaction(run, options) { const result = await db.$transaction(run, options); if (loseAck) { loseAck = false; throw Error("INJECTED_LOST_COMMIT_ACK"); } return result; } };
    const uncertain = await loadInventory(uncertainDB, async () => access);
    const reconciled = await uncertain.recordReceipt(operation({ quantity: "3" })); assert.equal(reconciled.status, "saved"); assert.equal(reconciled.repeated, true); assert.equal((await service.inventoryHistory(productA2, { branch: branchA })).data.quantity, "24.000");
    assert.equal(await db.authAccount.count(), 0); assert.equal(await db.authSession.count(), 0);
    phase = "cleanup-manifest";
    // The runner validates this complete fingerprint before dropping its own DB.
    const tables = await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
    const fingerprints = {};
    for (const { tablename } of tables) {
      assert.match(tablename, /^[a-z_]+$/);
      fingerprints[tablename] = (await db.$queryRawUnsafe(`SELECT count(*)::integer AS count,md5(COALESCE(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) AS hash FROM public."${tablename}" t`))[0];
    }
    assert.ok(process.env.MILO_INVENTORY_TEST_MANIFEST);
    await writeFile(process.env.MILO_INVENTORY_TEST_MANIFEST, JSON.stringify({ database: url.pathname.slice(1), fingerprints }));
  } catch (e) {
    const code = typeof e?.code === "string" && /^[A-Z0-9_]+$/.test(e.code) ? e.code : "ASSERTION_OR_PROVIDER_FAILURE";
    throw Error(`ISOLATED_INVENTORY_TEST_FAILED phase=${phase} code=${code}; sensitive diagnostics suppressed`);
  } finally { if (db) await db.$disconnect(); }
});

test("REAL PostgreSQL old-schema reads remain compatible and manual writes fail closed before the new migration", { skip: !connectionString || !permitted || process.env.MILO_INVENTORY_TEST_PHASE !== "legacy" }, async () => {
  let db;
  try {
    const url = new URL(connectionString); assert.equal(url.hostname, "127.0.0.1"); assert.match(url.pathname, /^\/milo_inventory_test_[a-f0-9]{12}$/); assert.ok(["postgres:", "postgresql:"].includes(url.protocol));
    const { PrismaPg } = await import("@prisma/adapter-pg"); const { PrismaClient } = await import("../generated/prisma/client.ts");
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name, url.pathname.slice(1));
    const tenantId = randomUUID(), profileId = randomUUID(), branchId = randomUUID(), productId = randomUUID();
    await assert.rejects(db.$transaction(async tx => {
      await tx.tenant.create({ data: { id: tenantId } });
      await tx.authUser.create({ data: { id: "legacy-inventory-test", name: "Isolated legacy operator", email: "legacy-inventory@example.invalid" } });
      await tx.userProfile.create({ data: { id: profileId, tenantId, authUserId: "legacy-inventory-test" } });
      const role = await tx.roleDefinition.create({ data: { code: "OWNER", name: "Isolated legacy role", assignmentScope: "COMPANY" } });
      await tx.userRoleAssignment.create({ data: { tenantId, userProfileId: profileId, roleId: role.id, assignmentScope: "COMPANY", branchId: null } });
      await tx.branch.create({ data: { id: branchId, tenantId, name: "Isolated legacy branch" } });
      await tx.unitOfMeasure.create({ data: { code: "LEGACY-TEST", name: "Isolated unit", dimensionCode: "LEGACY-TEST" } });
      await tx.product.create({ data: { id: productId, tenantId, sku: "LEGACY-TEST", name: "Isolated legacy item", description: "Test only", baseUnitCode: "LEGACY-TEST", baseUnitDimensionCode: "LEGACY-TEST", allowsFractionalQuantity: false, isPublished: false } });
      await tx.stockBalance.create({ data: { tenantId, branchId, productId, quantityOnHand: "10" } });
      const movementId = randomUUID();
      await tx.$executeRaw`INSERT INTO public.stock_movements (id,"tenantId","branchId","productId","movementType","quantityDelta","actorUserId") VALUES (${movementId}::uuid,${tenantId}::uuid,${branchId}::uuid,${productId}::uuid,'LEGACY_TEST',10,${profileId}::uuid)`;
      const session = { status: "allowed", context: { authUserId: "legacy-inventory-test", profileId, tenant: { id: tenantId }, assignments: [{ code: "OWNER", scope: "COMPANY", branch: null }] } };
      const service = await loadInventory({ $transaction: run => run(tx) }, async () => session);
      const listing = await service.listInventory({ branch: branchId }); assert.equal(listing.status, "ok"); assert.equal(listing.data.operationsReady, false); assert.equal(listing.data.items[0].quantity, "10.000");
      const history = await service.inventoryHistory(productId, { branch: branchId }); assert.equal(history.status, "ok"); assert.equal(history.data.movements[0].reason, null); assert.equal(history.data.movements[0].sourceReference, null);
      const form = new FormData(); for (const [key, value] of Object.entries({ requestId: randomUUID(), branchId, productId, baseUnitCode: "LEGACY-TEST", quantity: "1" })) form.set(key, value);
      assert.equal((await service.recordReceipt(form)).status, "blocked"); assert.equal(await tx.stockMovement.count(), 1); assert.equal((await service.inventoryHistory(productId, { branch: branchId })).data.quantity, "10.000");
      throw Error("EXPECTED_LEGACY_ROLLBACK");
    }, { timeout: 20000 }), /EXPECTED_LEGACY_ROLLBACK/);
    for (const model of ["tenant", "authUser", "branch", "product", "stockBalance", "stockMovement", "roleDefinition", "userRoleAssignment"]) assert.equal(await db[model].count(), 0);
  } catch (e) { throw Error(`ISOLATED_LEGACY_INVENTORY_TEST_FAILED code=${typeof e?.code === "string" && /^[A-Z0-9_]+$/.test(e.code) ? e.code : "ASSERTION_OR_PROVIDER_FAILURE"}; sensitive diagnostics suppressed`); }
  finally { if (db) await db.$disconnect(); }
});
