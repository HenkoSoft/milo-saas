import "../scripts/activation/register-loader.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { plan } from "./activation-plan-fixture.mjs";

const connectionString = process.env.MILO_ACTIVATION_TEST_DATABASE_URL;
const permitted = process.env.MILO_ACTIVATION_TEST_ALLOW_WRITE === "YES_ISOLATED_DATABASE";

test("REAL PostgreSQL rollback at all four stages (requires an explicitly authorized existing isolated database)", { skip: !connectionString && !permitted }, async () => {
  // Never loads .env, creates a database, applies migrations or allows milo_dev.
  assert.ok(connectionString && permitted, "Explicit isolated-test authorization is required");
  let url;
  try { url = new URL(connectionString); }
  catch { assert.fail("Invalid isolated database URL; sensitive details suppressed"); }
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol));
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.match(url.pathname, /^\/milo_activation_test_[a-z0-9_]+$/);
  assert.ok([...url.searchParams].every(([key, value]) => key === "schema" && value === "public"));
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("../generated/prisma/client.ts");
  const { activate, inspectActivation } = await import("../scripts/activation/core.ts");
  const { migrationChecksums, verifyMigrationHistory } = await import("../scripts/activation/preflight.ts");
  const { randomBytes } = await import("node:crypto");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  let phase = "database-identity";
  function safeCode(error) {
    const code = error?.code ?? error?.body?.code ?? error?.meta?.code;
    return typeof code === "string" && /^[A-Z0-9_]{2,70}$/.test(code) ? code : "ASSERTION_OR_PROVIDER_FAILURE";
  }
  try {
    const identity = await db.$queryRaw`SELECT current_database() AS name`;
    assert.equal(identity[0].name, url.pathname.slice(1));
    assert.notEqual(identity[0].name, "milo_dev");
    phase = "migration-history";
    const checksums = await migrationChecksums();
    await verifyMigrationHistory(db, checksums);
    assert.equal((await inspectActivation(db, plan)).status, "ready");
    const names = ["authUser", "authAccount", "authSession", "authVerification", "tenant", "userProfile", "roleDefinition", "userRoleAssignment"];
    const baseline = await Promise.all(names.map(name => db[name].count()));
    const password = randomBytes(24).toString("base64");
    for (const failAt of ["identity", "tenant", "profile", "assignment"]) {
      phase = `rollback-${failAt}`;
      let reached = false;
      try {
        await activate(db, password, plan, stage => {
          if (stage === failAt) { reached = true; throw new Error("INJECTED_ROLLBACK"); }
        }, tx => verifyMigrationHistory(tx, checksums));
        assert.fail("Expected injected rollback");
      } catch (error) {
        // No raw database/credential-bearing diagnostics in test output.
        if (error.message !== "INJECTED_ROLLBACK") {
          throw new Error(`ISOLATED_ROLLBACK_TEST_FAILED phase=${phase} code=${safeCode(error)} reached=${reached}`);
        }
      }
      assert.equal(reached, true);
      assert.deepEqual(await Promise.all(names.map(name => db[name].count())), baseline);
      assert.equal((await inspectActivation(db, plan)).status, "ready");
    }
  } catch (error) {
    // Test runners print unhandled errors: suppress all provider/URL details.
    if (error.message?.startsWith("ISOLATED_ROLLBACK_TEST_FAILED phase=")) throw error;
    throw new Error(`ISOLATED_ROLLBACK_TEST_FAILED phase=${phase} code=${safeCode(error)}; sensitive diagnostics suppressed`);
  } finally { await db.$disconnect(); }
});
