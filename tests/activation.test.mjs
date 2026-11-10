import "../scripts/activation/register-loader.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { EventEmitter } from "node:events";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { plan, activationEnvironment } from "./activation-plan-fixture.mjs";
import { simulatedDatabase } from "./activation-fake.mjs";

const { activate, inspectActivation } = await import("../scripts/activation/core.ts");
const { readActivationPlan } = await import("../scripts/activation/plan.ts");
const { parseArgs } = await import("../scripts/activation/cli.ts");
const { targetURL, checkVersions } = await import("../scripts/activation/preflight.ts");
const { readHidden } = await import("../scripts/activation/terminal.ts");
const { createIdentity, marker } = await import("../scripts/activation/identity.ts");
const { verifyMigrationHistory } = await import("../scripts/activation/preflight.ts");
const password = randomBytes(24).toString("base64");
const total = fake => Object.values(fake.state()).reduce((sum, rows) => sum + rows.length, 0);

test("activation requires a complete explicit plan and never exposes invalid private values", () => {
  assert.deepEqual(readActivationPlan(activationEnvironment), plan);
  assert.equal(Object.isFrozen(plan), true);
  assert.throws(() => readActivationPlan({}), error => error.code === "ACTIVATION_CONFIGURATION_INVALID");
  for (const key of Object.keys(activationEnvironment)) {
    const missing = { ...activationEnvironment }; delete missing[key];
    assert.throws(() => readActivationPlan(missing), error => error.code === "ACTIVATION_CONFIGURATION_INVALID");
  }
  for (const extra of [
    { MILO_ACTIVATION_OWNER_EMAIL: "private-invalid-value" },
    { MILO_ACTIVATION_OWNER_NAME: "bad\nname" },
    { MILO_ACTIVATION_ID: "../private-path" },
    { MILO_ACTIVATION_TENANT_ID: activationEnvironment.MILO_ACTIVATION_ID },
  ]) assert.throws(() => readActivationPlan({ ...activationEnvironment, ...extra }), error => error.message === "ACTIVATION_CONFIGURATION_INVALID");
});

test("activation CLI defaults to dry-run and rejects passwords, foreign plans and ambiguous execution flags", async () => {
  assert.deepEqual(parseArgs([], plan.activationId), { execute: false, help: false });
  assert.equal(parseArgs(["--dry-run"], plan.activationId).execute, false);
  assert.equal(parseArgs(["--execute", `--confirm=${plan.activationId}`], plan.activationId).execute, true);
  for (const args of [["--execute"], ["--password=never-accept"], ["--confirm=other"], ["--dry-run", "--execute"], ["--dry-run", "--dry-run"]])
    assert.throws(() => parseArgs(args, plan.activationId));
  await checkVersions();
});

test("target validation rejects remote/wrong databases and connection overrides without exposing credentials", () => {
  assert.equal(new URL(targetURL("postgresql://localhost:5432/milo_dev?schema=public")).hostname, "127.0.0.1");
  for (const value of [undefined, "invalid", "postgresql://localhost/other", "postgresql://remote/milo_dev", "postgresql://127.0.0.1:5433/milo_dev", "postgresql://localhost/milo_dev?options=override", "postgresql://localhost/milo_dev?schema=other"])
    assert.throws(() => targetURL(value), error => !error.message.includes("postgresql://"));
});

test("simulated inspection writes nothing and detects empty activation", async () => {
  const fake = simulatedDatabase();
  assert.equal((await inspectActivation(fake.read(), plan)).status, "ready");
  assert.equal(fake.calls.length, 0);
  assert.equal(total(fake), 0);
});

test("real Better Auth 1.7.18 writes only through the simulated outer tx, with no session or verified email", async () => {
  const fake = simulatedDatabase();
  const result = await activate(fake.db, password, plan);
  assert.equal(result.authWrites, 2);
  assert.equal(result.transactionChecked, true);
  assert.ok(fake.markerCalls() >= 6);
  assert.ok(fake.calls.every(call => call.transaction === "outer-only"));
  const state = fake.state();
  for (const name of ["authUser", "authAccount", "tenant", "userProfile", "roleDefinition", "userRoleAssignment"]) assert.equal(state[name].length, 1);
  assert.equal(state.authSession.length, 0);
  assert.equal(state.authVerification.length, 0);
  assert.equal(state.authUser[0].emailVerified, false);
  assert.equal(typeof state.authAccount[0].password, "string");
  assert.equal(state.authAccount[0].password === password, false);
  assert.equal(state.userProfile[0].authUserId, state.authUser[0].id);
  assert.equal(state.userRoleAssignment[0].assignmentScope, "COMPANY");
  assert.equal(state.userRoleAssignment[0].branchId, null);
  assert.equal((await inspectActivation(fake.read(), plan)).status, "complete");
  await assert.rejects(activate(fake.db, password, plan), error => error.code === "ALREADY_ACTIVATED");
  assert.equal(total(fake), 6);
});

test("simulated rollback discards every table after faults at each creation stage", async () => {
  for (const failAt of ["identity", "tenant", "profile", "assignment"]) {
    const fake = simulatedDatabase();
    let reached = false;
    await assert.rejects(activate(fake.db, password, plan, stage => {
      if (stage === failAt) { reached = true; throw new Error("INJECTED_FAILURE"); }
    }), error => error.message === "INJECTED_FAILURE");
    assert.equal(reached, true);
    assert.equal(total(fake), 0);
    assert.ok(fake.calls.some(call => call.name === "authUser"));
    assert.ok(fake.calls.some(call => call.name === "authAccount"));
  }
});

test("mismatched PostgreSQL transaction marker aborts before credential writes", async () => {
  const fake = simulatedDatabase({ markerMismatch: true });
  await assert.rejects(activate(fake.db, password, plan), error => error.code === "AUTH_TRANSACTION_MISMATCH");
  assert.equal(total(fake), 0);
  assert.equal(fake.calls.length, 0);
});

test("a credential insert failure discards the already-created identity in the simulated outer transaction", async () => {
  const fake = simulatedDatabase({ failAuthAccount: true });
  await assert.rejects(activate(fake.db, password, plan));
  assert.equal(fake.calls.some(call => call.name === "authUser"), true);
  assert.equal(fake.calls.some(call => call.name === "authAccount"), true);
  assert.equal(total(fake), 0);
});

test("Better Auth synthetic duplicate-success cannot become an identity link", async () => {
  const fake = simulatedDatabase();
  fake.seed("authUser", { id: "preexisting", email: plan.ownerEmail, name: plan.ownerName, emailVerified: false });
  const tx = fake.read();
  await assert.rejects(createIdentity(tx, password, await marker(tx), plan), error => error.code === "AUTH_WRITES_INCOMPLETE");
  assert.equal(fake.calls.length, 0);
  assert.equal(total(fake), 1);
});

test("missing, altered or failed migration history blocks provisioning", async () => {
  const row = { migration_name: "expected", checksum: "checked", finished_at: new Date(), rolled_back_at: null, applied_steps_count: 1, has_logs: false };
  const expected = new Map([["expected", "checked"]]);
  for (const history of [[], [{ ...row, checksum: "changed" }], [{ ...row, finished_at: null }], [{ ...row, rolled_back_at: new Date() }], [{ ...row, has_logs: true }], [row, row]]) {
    await assert.rejects(verifyMigrationHistory({ $queryRaw: async () => history }, expected), error => error.code === "MIGRATION_HISTORY_MISMATCH");
  }
  await verifyMigrationHistory({ $queryRaw: async () => [row] }, expected);
});

test("duplicates, partial activation and invalid OWNER definitions cannot be adopted or promoted", async () => {
  for (const seed of [
    fake => fake.seed("authUser", { id: "unrelated", email: plan.ownerEmail.toUpperCase(), name: "Existing" }),
    fake => fake.seed("tenant", { id: "other", commercialName: plan.commercialName.toLowerCase() }),
    fake => fake.seed("userProfile", { id: plan.profileId, tenantId: "other", authUserId: "other" }),
    fake => fake.seed("roleDefinition", { id: plan.roleIdIfMissing, code: "ADMIN", assignmentScope: "COMPANY" }),
    fake => fake.seed("roleDefinition", { id: "existing", code: "OWNER", assignmentScope: "BRANCH" }),
  ]) {
    const fake = simulatedDatabase(); seed(fake);
    await assert.rejects(activate(fake.db, password, plan), error => error.code === "ACTIVATION_CONFLICT");
    assert.equal(total(fake), 1);
    assert.equal(fake.calls.length, 0);
  }
});

test("existing correct OWNER definition is reused without mutation", async () => {
  const fake = simulatedDatabase();
  fake.seed("roleDefinition", { id: "existing-owner", code: "OWNER", name: "Dueño", assignmentScope: "COMPANY" });
  await activate(fake.db, password, plan);
  assert.equal(fake.state().roleDefinition.length, 1);
  assert.equal(fake.state().userRoleAssignment[0].roleId, "existing-owner");
  assert.equal(fake.calls.some(call => call.name === "roleDefinition"), false);
});

test("lost commit acknowledgement is reconciled by stable IDs without a second activation", async () => {
  const fake = simulatedDatabase({ commitUncertain: true });
  await assert.rejects(activate(fake.db, password, plan), error => error.message === "SIMULATED_COMMIT_ACK_LOST");
  assert.equal((await inspectActivation(fake.read(), plan)).status, "complete");
  await assert.rejects(activate(fake.db, password, plan), error => error.code === "ALREADY_ACTIVATED");
  assert.equal(total(fake), 6);
});

test("hidden password input does not echo and restores raw mode on success and cancellation", async () => {
  function terminal() {
    const input = new EventEmitter();
    Object.assign(input, { isTTY: true, isRaw: false, isPaused: () => true, setRawMode: raw => { input.isRaw = raw; }, pause() {}, resume() {} });
    let text = "";
    return { input, output: { isTTY: true, write: value => { text += value; } }, text: () => text };
  }
  const t = terminal();
  const pending = readHidden("Hidden: ", t.input, t.output);
  t.input.emit("data", Buffer.from(password + "\r"));
  assert.equal((await pending) === password, true);
  assert.equal(t.text().includes(password), false);
  assert.equal(t.input.isRaw, false);
  const unicode = readHidden("Hidden: ", t.input, t.output);
  const encoded = Buffer.from("\u00e1\u00f1\r");
  t.input.emit("data", encoded.subarray(0, 1));
  t.input.emit("data", encoded.subarray(1));
  assert.equal(await unicode, "\u00e1\u00f1");
  const broken = readHidden("Hidden: ", t.input, t.output);
  t.input.emit("error", new Error("private input failure"));
  await assert.rejects(broken, error => error.code === "INPUT_FAILED");
  assert.equal(t.input.isRaw, false);
  const cancelled = readHidden("Hidden: ", t.input, t.output);
  t.input.emit("data", Buffer.from("\u0003"));
  await assert.rejects(cancelled, error => error.code === "CANCELLED");
  assert.equal(t.input.isRaw, false);
  assert.throws(() => readHidden("", { isTTY: false }, t.output), error => error.code === "INTERACTIVE_TERMINAL_REQUIRED");
});

test("public Better Auth configuration remains signup-disabled", async () => {
  const auth = await readFile(new URL("../lib/auth.ts", import.meta.url), "utf8");
  assert.match(auth, /disableSignUp:\s*true/);
});
