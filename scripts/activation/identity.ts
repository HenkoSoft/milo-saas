import { randomBytes } from "node:crypto";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { Prisma } from "../../generated/prisma/client";
import { ActivationError, ensure, type ActivationPlan } from "./plan";

export type Transaction = Prisma.TransactionClient;
export type TransactionMarker = { xid: string; pid: number };

export async function marker(tx: Transaction): Promise<TransactionMarker> {
  const rows = await tx.$queryRaw<TransactionMarker[]>`SELECT pg_current_xact_id()::text AS xid, pg_backend_pid() AS pid`;
  ensure(rows.length === 1 && !!rows[0].xid && Number.isInteger(rows[0].pid), "TRANSACTION_MARKER_INVALID");
  return rows[0];
}

export async function createIdentity(tx: Transaction, password: string, expected: TransactionMarker, plan: ActivationPlan) {
  const writes: string[] = [];
  let transactionMismatch = false;
  async function verifyMarker() {
    const current = await marker(tx);
    if (current.xid !== expected.xid || current.pid !== expected.pid) {
      transactionMismatch = true;
      throw new ActivationError("AUTH_TRANSACTION_MISMATCH");
    }
  }
  // Capability-limited adapter: no root Prisma client, connection string,
  // nested $transaction, session writes, updates, deletes or upserts.
  function delegate(model: "authUser" | "authAccount" | "authSession" | "authVerification") {
    const actual = tx[model];
    return new Proxy({}, {
      get(_target, operation: string) {
        if (["findFirst", "findUnique", "findMany", "count"].includes(operation)) {
          const read = Reflect.get(actual, operation) as (...args: unknown[]) => unknown;
          return (...args: unknown[]) => Reflect.apply(read, actual, args);
        }
        if (operation === "create" && (model === "authUser" || model === "authAccount")) {
          return async (...args: unknown[]) => {
            await verifyMarker();
            const write = Reflect.get(actual, "create") as (...args: unknown[]) => Promise<unknown>;
            const result = await Reflect.apply(write, actual, args);
            await verifyMarker();
            writes.push(model);
            return result;
          };
        }
        throw new Error("BOOTSTRAP_AUTH_OPERATION_BLOCKED");
      },
    });
  }
  const scoped = {
    authUser: delegate("authUser"), authAccount: delegate("authAccount"),
    authSession: delegate("authSession"), authVerification: delegate("authVerification"),
  };
  // Only this unexported CLI instance permits signUpEmail. It has no HTTP handler.
  // Ephemeral secret: no sessions/cookies are issued; credential hashing belongs to Better Auth.
  const bootstrap = betterAuth({
    database: prismaAdapter(scoped, { provider: "postgresql", transaction: false }),
    baseURL: "https://bootstrap.milo.invalid",
    secret: randomBytes(32).toString("base64"),
    logger: { disabled: true },
    user: { modelName: "authUser" }, session: { modelName: "authSession" },
    account: { modelName: "authAccount", accountLinking: { enabled: false } },
    verification: { modelName: "authVerification" },
    emailAndPassword: { enabled: true, disableSignUp: false, autoSignIn: false },
  });
  const result = await bootstrap.api.signUpEmail({
    body: { name: plan.ownerName, email: plan.ownerEmail, password },
  }).catch(error => {
    // Better Auth wraps adapter failures. Preserve only our safe marker error.
    if (transactionMismatch) throw new ActivationError("AUTH_TRANSACTION_MISMATCH");
    throw error;
  });
  ensure(result.token === null && writes.join(",") === "authUser,authAccount", "AUTH_WRITES_INCOMPLETE");
  const user = await tx.authUser.findUnique({
    where: { id: result.user.id }, select: { id: true, name: true, email: true, emailVerified: true },
  });
  // Reject synthetic duplicate-success responses; never link by an email lookup.
  ensure(user && user.email === plan.ownerEmail && user.name === plan.ownerName && !user.emailVerified, "AUTH_IDENTITY_NOT_CREATED");
  const accounts = await tx.authAccount.findMany({
    where: { userId: user.id }, select: { providerId: true, accountId: true },
  });
  ensure(accounts.length === 1 && accounts[0].providerId === "credential" && accounts[0].accountId === user.id, "AUTH_CREDENTIAL_INVALID");
  ensure(await tx.authSession.count({ where: { userId: user.id } }) === 0, "AUTOMATIC_SESSION_DETECTED");
  return { authUserId: user.id, authWrites: writes.length };
}
