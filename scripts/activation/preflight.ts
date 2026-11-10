import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { PrismaClient, Prisma } from "../../generated/prisma/client";
import { ensure, migrationNames, type ActivationPlan } from "./plan";
import { inspectActivation } from "./core";

export function targetURL(raw: string | undefined): string {
  let url: URL;
  try { url = new URL(raw ?? ""); } catch { throw new Error("INVALID_DATABASE_TARGET"); }
  ensure(["postgres:", "postgresql:"].includes(url.protocol) &&
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
    (url.port || "5432") === "5432" && url.pathname === "/milo_dev" && !url.hash &&
    [...url.searchParams].every(([key, value]) => key === "schema" && value === "public"), "INVALID_DATABASE_TARGET");
  url.hostname = "127.0.0.1";
  url.port = "5432";
  return url.toString();
}

export async function checkVersions() {
  const require = createRequire(import.meta.url);
  const version = JSON.parse(await readFile(join(dirname(require.resolve("better-auth")), "../package.json"), "utf8")).version;
  const prismaVersion = JSON.parse(await readFile(require.resolve("prisma/package.json"), "utf8")).version;
  ensure(version === "1.7.18" && prismaVersion === "7.10.1", "DEPENDENCY_VERSION_CHANGED");
}

export async function migrationChecksums() {
  const directory = new URL("../../prisma/migrations/", import.meta.url);
  const dirs = (await readdir(directory, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name).sort();
  ensure(JSON.stringify(dirs) === JSON.stringify(migrationNames), "LOCAL_MIGRATION_SET_CHANGED");
  return new Map(await Promise.all(dirs.map(async name => [name, createHash("sha256").update(await readFile(new URL(`${name}/migration.sql`, directory))).digest("hex")] as const)));
}

export async function verifyMigrationHistory(tx: Prisma.TransactionClient, expected: Map<string, string>) {
  const history = await tx.$queryRaw<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null; applied_steps_count: number; has_logs: boolean }[]>`SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count, logs IS NOT NULL AS has_logs FROM public._prisma_migrations ORDER BY migration_name`;
  ensure(history.length === expected.size && history.every(r => !!r.finished_at && !r.rolled_back_at && !r.has_logs && r.applied_steps_count === 1 && expected.get(r.migration_name) === r.checksum), "MIGRATION_HISTORY_MISMATCH");
}

export async function inspectDatabase(db: PrismaClient, plan: ActivationPlan) {
  const expected = await migrationChecksums();
  return db.$transaction(async tx => {
    // Caller uses a separate connection with default_transaction_read_only=on.
    const identity = await tx.$queryRaw<{ database: string; port: number; schema: string; read_only: string; version: number }[]>`SELECT current_database() AS database, inet_server_port() AS port, current_schema() AS schema, current_setting('transaction_read_only') AS read_only, current_setting('server_version_num')::integer AS version`;
    ensure(identity.length === 1 && identity[0].database === "milo_dev" && identity[0].port === 5432 && identity[0].schema === "public" && identity[0].read_only === "on" && identity[0].version >= 170000 && identity[0].version < 180000, "DATABASE_IDENTITY_MISMATCH");
    await verifyMigrationHistory(tx, expected);
    const constraints = await tx.$queryRaw<{ conname: string; convalidated: boolean }[]>`SELECT conname, convalidated FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname IN ('role_definitions_scope_by_code_check','user_role_assignments_scope_branch_check','user_profiles_authUserId_fkey')`;
    ensure(constraints.length === 3 && constraints.every(c => c.convalidated), "REQUIRED_CONSTRAINT_MISSING");
    const indexes = await tx.$queryRaw<{ indisvalid: boolean; indisunique: boolean }[]>`SELECT indisvalid, indisunique FROM pg_index WHERE indexrelid IN ('public."user_profiles_authUserId_key"'::regclass,'public.user_role_assignments_company_role_unique'::regclass)`;
    ensure(indexes.length === 2 && indexes.every(i => i.indisvalid && i.indisunique), "REQUIRED_INDEX_MISSING");
    return inspectActivation(tx, plan);
  }, { isolationLevel: "RepeatableRead", maxWait: 5000, timeout: 20000 });
}
