// Explicit local-only test harness. Never migrates or writes business data in milo_dev.
import "dotenv/config";
import pg from "pg";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";

if (process.argv.slice(2).join(" ") !== "--run-isolated") {
  console.log("Usage: node scripts/inventory/test-postgres.mjs --run-isolated. Creates and removes only its own isolated PostgreSQL test database.");
  process.exit(0);
}
let admin, isolated, name, marker, created = false, phase = "preflight";
try {
  const main = new URL(process.env.DATABASE_URL);
  assert.ok(["postgres:", "postgresql:"].includes(main.protocol)); assert.ok(["localhost", "127.0.0.1"].includes(main.hostname)); assert.equal(main.port || "5432", "5432"); assert.equal(main.pathname, "/milo_dev");
  assert.ok([...main.searchParams].every(([k, v]) => k === "schema" && v === "public"));
  main.hostname = "127.0.0.1"; main.port = "5432";
  const root = new URL("../../", import.meta.url), migrations = new URL("prisma/migrations/", root);
  const expected = ["20261108225754_init", "20261109023000_add_better_auth", "20261109150000_add_tenant_storefront", "20261109220000_add_inventory_manual_trace"];
  const actual = (await readdir(migrations, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name).sort();
  assert.deepEqual(actual, expected, "Review changed migration set before running inventory tests");
  const adminURL = new URL(main); adminURL.pathname = "/postgres";
  admin = new pg.Client({ connectionString: adminURL.toString(), connectionTimeoutMillis: 5000 }); await admin.connect();
  assert.equal((await admin.query("SELECT current_database() AS name,inet_server_port() AS port")).rows[0].name, "postgres");
  name = `milo_inventory_test_${randomBytes(6).toString("hex")}`;
  assert.match(name, /^milo_inventory_test_[a-f0-9]{12}$/); assert.notEqual(name, "milo_dev");
  marker = `MILO isolated inventory test ${randomUUID()}`;
  const manifestPath = join(await mkdtemp(join(tmpdir(), "milo-inventory-test-")), "manifest.json");
  phase = "create-isolated";
  await admin.query(`CREATE DATABASE "${name}" TEMPLATE template0`); created = true;
  await admin.query(`COMMENT ON DATABASE "${name}" IS '${marker}'`);
  const testURL = new URL(main); testURL.pathname = `/${name}`;
  isolated = new pg.Client({ connectionString: testURL.toString(), connectionTimeoutMillis: 5000 }); await isolated.connect();
  assert.equal((await isolated.query("SELECT current_database() AS name")).rows[0].name, name);
  assert.equal((await isolated.query("SELECT count(*)::integer AS count FROM pg_tables WHERE schemaname='public'")).rows[0].count, 0);
  phase = "existing-migration-sql-only-in-test-db";
  // Applies the exact SQL, including CHECKs and triggers, without a shadow DB or
  // any connection to milo_dev. This fixture DB needs no Prisma migration journal.
  for (const migration of expected.slice(0, 3)) await isolated.query(await readFile(new URL(`${migration}/migration.sql`, migrations), "utf8"));
  const run = async testPhase => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--test", "tests/inventory-postgres.test.mjs"], {
      cwd: root, windowsHide: true, stdio: "inherit",
      env: { ...process.env, MILO_INVENTORY_TEST_DATABASE_URL: testURL.toString(), MILO_INVENTORY_TEST_ALLOW_WRITE: "YES_ISOLATED_DATABASE", MILO_INVENTORY_TEST_MANIFEST: manifestPath, MILO_INVENTORY_TEST_PHASE: testPhase },
    });
    child.once("error", reject); child.once("exit", resolve);
  });
  phase = "legacy-schema-compatibility";
  assert.equal(await run("legacy"), 0, "Legacy compatibility test failed");
  phase = "new-migration-only-in-isolated-db";
  await isolated.query(await readFile(new URL(`${expected[3]}/migration.sql`, migrations), "utf8"));
  phase = "integration-tests";
  const code = await run("full");
  assert.equal(code, 0, "Integration test failed; isolated database retained for inspection");
  phase = "verify-owned-database";
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")); assert.equal(manifest.database, name);
  const identity = (await admin.query("SELECT datname,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=$1", [name])).rows;
  assert.equal(identity.length, 1); assert.equal(identity[0].marker, marker);
  const tables = (await isolated.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r => r.tablename);
  assert.deepEqual(tables, Object.keys(manifest.fingerprints).sort());
  for (const table of tables) {
    assert.match(table, /^[a-z_]+$/);
    const fingerprint = (await isolated.query(`SELECT count(*)::integer AS count,md5(COALESCE(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) AS hash FROM public."${table}" t`)).rows[0];
    assert.deepEqual(fingerprint, manifest.fingerprints[table], "Unexpected isolated data; automatic cleanup stopped");
  }
  await isolated.end(); isolated = null;
  assert.equal((await admin.query("SELECT count(*)::integer AS count FROM pg_stat_activity WHERE datname=$1", [name])).rows[0].count, 0);
  phase = "drop-owned-isolated";
  await admin.query(`DROP DATABASE "${name}"`); created = false;
  assert.equal((await admin.query("SELECT count(*)::integer AS count FROM pg_database WHERE datname=$1", [name])).rows[0].count, 0);
  console.log("PostgreSQL isolated inventory operations, idempotency, isolation, concurrency, rollback and commit reconciliation passed; fixture fingerprints matched; temporary database removed. No milo_dev writes or migrations.");
} catch (e) {
  const code = typeof e?.code === "string" && /^[A-Z0-9_]+$/.test(e.code) ? e.code : "ASSERTION_OR_PROVIDER_FAILURE";
  console.error(`ISOLATED_INVENTORY_RUN_FAILED phase=${phase} code=${code}; sensitive diagnostics suppressed.`);
  if (created) console.error(`Owned test database retained: ${name}. No automatic restore or retry.`);
  process.exitCode = 1;
} finally {
  if (isolated) await isolated.end();
  if (admin) await admin.end();
}
