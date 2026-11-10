import { mkdir, open, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { activate } from "./core";
import { checkVersions, inspectDatabase, targetURL, migrationChecksums, verifyMigrationHistory } from "./preflight";
import { passwordPrompt } from "./terminal";
import { ActivationError, ensure, readActivationPlan } from "./plan";

export function parseArgs(args: string[], activationId: string) {
  const allowed = ["--dry-run", "--execute", "--help", `--confirm=${activationId}`];
  ensure(new Set(args).size === args.length && args.every(a => allowed.includes(a)), "INVALID_ARGUMENTS");
  ensure(!(args.includes("--execute") && args.includes("--dry-run")), "INVALID_ARGUMENTS");
  const execute = args.includes("--execute");
  ensure(!execute || args.includes(`--confirm=${activationId}`), "ACTIVATION_CONFIRMATION_REQUIRED");
  ensure(execute || !args.some(a => a.startsWith("--confirm=")), "INVALID_ARGUMENTS");
  return { execute, help: args.includes("--help") };
}

export async function main(args: string[]) {
  let writable: PrismaClient | undefined;
  let password = "";
  let journal: Awaited<ReturnType<typeof open>> | undefined;
  let transactionStarted = false;
  let transactionReturned = false;
  try {
    if (args.length === 1 && args[0] === "--help") {
      console.log("Default: dry-run. Configure MILO_ACTIVATION_* privately. Execution requires --execute --confirm=<activation-id> and separate authorization.");
      return;
    }
    const { config } = await import("dotenv");
    config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });
    const plan = readActivationPlan(process.env);
    const activationId = plan.activationId;
    const mode = parseArgs(args, activationId);
    if (mode.help) {
      console.log(`Default: npm run activation:tenant -- --dry-run\nExecution (requires separate authorization): npm run activation:tenant -- --execute --confirm=${activationId}`);
      return;
    }
    await checkVersions();
    const connectionString = targetURL(process.env.DATABASE_URL);
    const readonly = new PrismaClient({ adapter: new PrismaPg({ connectionString, options: "-c default_transaction_read_only=on -c statement_timeout=15000" }) });
    let state;
    try { state = await inspectDatabase(readonly, plan); }
    finally { await readonly.$disconnect(); }
    const journalDirectory = new URL("../../.local/", import.meta.url);
    const journalPath = new URL(`activation-${activationId}.jsonl`, journalDirectory);
    let attempted = false;
    try { attempted = (await readdir(journalDirectory)).some(name => name.endsWith(`-${activationId}.jsonl`)); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    console.log(JSON.stringify({ mode: mode.execute ? "execute" : "dry-run", activationId: activationId, target: "127.0.0.1:5432/milo_dev", state: state.status, previousAttempt: attempted }));
    if (!mode.execute) {
      if (state.status !== "ready" || attempted) process.exitCode = 2;
      return; // No filesystem writes, password prompt or writable client.
    }
    ensure(!attempted, "PREVIOUS_ATTEMPT_REQUIRES_REVIEW");
    ensure(state.status === "ready", state.status === "complete" ? "ALREADY_ACTIVATED" : "ACTIVATION_CONFLICT");
    // No rollback-on-error password mutation, no piped input or environment fallback.
    password = await passwordPrompt();
    await mkdir(journalDirectory, { recursive: true, mode: 0o700 });
    journal = await open(journalPath, "wx", 0o600);
    const record = async (outcome: string) => {
      await journal!.writeFile(JSON.stringify({ activationId: activationId, tenantId: plan.tenantId, at: new Date().toISOString(), outcome }) + "\n");
      await journal!.sync();
    };
    await record("attempting-commit-not-confirmed");
    const expectedMigrations = await migrationChecksums();
    writable = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    transactionStarted = true;
    const result = await activate(writable, password, plan, undefined, async tx => {
      const identity = await tx.$queryRaw<{ database: string; port: number; schema: string }[]>`SELECT current_database() AS database, inet_server_port() AS port, current_schema() AS schema`;
      ensure(identity[0]?.database === "milo_dev" && identity[0].port === 5432 && identity[0].schema === "public", "DATABASE_IDENTITY_MISMATCH");
      await verifyMigrationHistory(tx, expectedMigrations);
    });
    transactionReturned = true;
    await record("committed");
    console.log(JSON.stringify({ outcome: "committed", ...result }));
  } catch (error) {
    // Never log raw API/Prisma errors, input, connection strings, hashes or stack traces.
    const code = error instanceof ActivationError ? error.code : "CHECK_FAILED";
    console.error(JSON.stringify({ outcome: transactionReturned ? "committed-journal-incomplete" : transactionStarted ? "commit-unconfirmed-review-required" : "stopped-before-activation", code, automaticRetry: false }));
    process.exitCode = 1;
  } finally {
    password = ""; // JS strings cannot be guaranteed securely erased; process must end.
    await journal?.close().catch(() => {});
    await writable?.$disconnect().catch(() => {});
  }
}
