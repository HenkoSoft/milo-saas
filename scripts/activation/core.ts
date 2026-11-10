import type { PrismaClient, Prisma } from "../../generated/prisma/client";
import { createIdentity, marker, type Transaction } from "./identity";
import { ensure, type ActivationPlan } from "./plan";

export type Inspection = { status: "ready" | "complete" | "conflict"; roleId: string | null };

export async function inspectActivation(db: Transaction, plan: ActivationPlan): Promise<Inspection> {
  const [tenants, users, profiles, assignments, roles] = await Promise.all([
    db.tenant.findMany({ where: { OR: [{ id: plan.tenantId }, { commercialName: { equals: plan.commercialName, mode: "insensitive" } }] }, select: { id: true, commercialName: true, currency: true, locale: true, timeZone: true, priceVisibility: true } }),
    db.authUser.findMany({ where: { email: { equals: plan.ownerEmail, mode: "insensitive" } }, select: { id: true, name: true, email: true } }),
    db.userProfile.findMany({ where: { OR: [{ id: plan.profileId }, { tenantId: plan.tenantId }, { authUser: { email: { equals: plan.ownerEmail, mode: "insensitive" } } }] }, select: { id: true, tenantId: true, authUserId: true } }),
    db.userRoleAssignment.findMany({ where: { OR: [{ id: plan.assignmentId }, { tenantId: plan.tenantId }] }, select: { id: true, tenantId: true, userProfileId: true, roleId: true, assignmentScope: true, branchId: true } }),
    db.roleDefinition.findMany({ where: { OR: [{ code: "OWNER" }, { id: plan.roleIdIfMissing }] }, select: { id: true, code: true, assignmentScope: true } }),
  ]);
  if (roles.length > 1 || (roles.length === 1 && (roles[0].code !== "OWNER" || roles[0].assignmentScope !== "COMPANY")))
    return { status: "conflict", roleId: null };
  const roleId = roles[0]?.id ?? null;
  if (!tenants.length && !users.length && !profiles.length && !assignments.length) return { status: "ready", roleId };
  const t = tenants[0], u = users[0], p = profiles[0], a = assignments[0];
  const complete = tenants.length === 1 && users.length === 1 && profiles.length === 1 && assignments.length === 1 &&
    t.id === plan.tenantId && t.commercialName === plan.commercialName && t.currency === plan.currency && t.locale === plan.locale && t.timeZone === plan.timeZone && t.priceVisibility === plan.priceVisibility &&
    u.email === plan.ownerEmail && u.name === plan.ownerName && p.id === plan.profileId && p.tenantId === t.id && p.authUserId === u.id &&
    a.id === plan.assignmentId && a.tenantId === t.id && a.userProfileId === p.id && a.roleId === roleId && a.assignmentScope === "COMPANY" && a.branchId === null;
  if (complete) {
    const count = await db.authAccount.count({ where: { userId: u.id, providerId: "credential", accountId: u.id } });
    if (count === 1) return { status: "complete", roleId };
  }
  return { status: "conflict", roleId };
}

export type Stage = "identity" | "tenant" | "profile" | "assignment";
export async function activate(
  db: PrismaClient,
  password: string,
  plan: ActivationPlan,
  // Test-only injection, never exposed as CLI flags or environment variables.
  afterStage?: (stage: Stage) => void | Promise<void>,
  beforeWrites?: (tx: Transaction) => Promise<void>,
) {
  ensure(password.length >= 8 && password.length <= 128, "PASSWORD_LENGTH_INVALID");
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL lock_timeout = '10s'`;
    await tx.$executeRaw`SET LOCAL statement_timeout = '60s'`;
    // PostgreSQL returns void; cast it so Prisma raw queries can deserialize it.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(1936288879, 1001)::text AS locked`;
    await beforeWrites?.(tx);
    const state = await inspectActivation(tx, plan);
    ensure(state.status === "ready", state.status === "complete" ? "ALREADY_ACTIVATED" : "ACTIVATION_CONFLICT");
    const expected = await marker(tx);
    const identity = await createIdentity(tx, password, expected, plan);
    await afterStage?.("identity");
    const roleId = state.roleId ?? (await tx.roleDefinition.create({ data: { id: plan.roleIdIfMissing, code: "OWNER", name: "Dueño", assignmentScope: "COMPANY" }, select: { id: true } })).id;
    await tx.tenant.create({ data: {
      id: plan.tenantId, commercialName: plan.commercialName, currency: plan.currency,
      locale: plan.locale, timeZone: plan.timeZone, priceVisibility: plan.priceVisibility,
    } });
    await afterStage?.("tenant");
    await tx.userProfile.create({ data: { id: plan.profileId, tenantId: plan.tenantId, authUserId: identity.authUserId } });
    await afterStage?.("profile");
    await tx.userRoleAssignment.create({ data: {
      id: plan.assignmentId, tenantId: plan.tenantId, userProfileId: plan.profileId,
      roleId, assignmentScope: "COMPANY", branchId: null,
    } });
    await afterStage?.("assignment");
    ensure((await inspectActivation(tx, plan)).status === "complete", "FINAL_STATE_INVALID");
    const finalMarker = await marker(tx);
    ensure(finalMarker.xid === expected.xid && finalMarker.pid === expected.pid, "FINAL_TRANSACTION_MISMATCH");
    return { activationId: plan.activationId, tenantId: plan.tenantId, authWrites: identity.authWrites, transactionChecked: true };
  }, { isolationLevel: "Serializable" as Prisma.TransactionIsolationLevel, maxWait: 10000, timeout: 90000 });
}
