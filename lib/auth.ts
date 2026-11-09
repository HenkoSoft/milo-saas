import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "./prisma";

const secret = process.env.BETTER_AUTH_SECRET;
const unsafeSecrets = new Set([
  "better-auth-secret-12345678901234567890",
  "replace_with_a_local_random_password",
  "replace_with_a_random_secret_at_least_32_characters",
  "your-super-secret-key-at-least-32-characters-long",
]);

if (
  !secret ||
  secret.trim().length < 32 ||
  secret !== secret.trim() ||
  unsafeSecrets.has(secret.toLowerCase()) ||
  /^(.)\1+$/u.test(secret)
) {
  throw new Error(
    "Invalid BETTER_AUTH_SECRET: provide a non-placeholder secret of at least 32 characters.",
  );
}

const baseURL = process.env.BETTER_AUTH_URL;
let parsedURL: URL;
try {
  if (!baseURL || baseURL !== baseURL.trim() || !/^https?:\/\//i.test(baseURL)) {
    throw new Error();
  }
  parsedURL = new URL(baseURL);
  if (parsedURL.username || parsedURL.password) throw new Error();
} catch {
  // Do not propagate URL parsing errors: they can include sensitive input.
  throw new Error("Invalid BETTER_AUTH_URL: provide an absolute HTTP(S) URL without credentials.");
}

const isProduction = process.env.NODE_ENV === "production";
const isLoopback =
  parsedURL.hostname === "localhost" ||
  parsedURL.hostname === "localhost." ||
  parsedURL.hostname === "[::1]" ||
  /^127(?:\.\d{1,3}){3}$/.test(parsedURL.hostname);

if (
  parsedURL.protocol !== "https:" &&
  !(process.env.NODE_ENV === "development" && isLoopback)
) {
  throw new Error(
    "Invalid BETTER_AUTH_URL: HTTPS is required except for loopback HTTP in development.",
  );
}

// Authentication does not grant tenant membership or commercial permissions.
// Business operations must resolve UserProfile by session.user.id (authUserId),
// then authorize tenant, branches and roles on the server. Never link by email.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL,
  secret,
  advanced: { useSecureCookies: isProduction || parsedURL.protocol === "https:" },
  // modelName addresses Prisma's lower-camel-case client delegates, not SQL tables.
  user: { modelName: "authUser" },
  session: { modelName: "authSession" },
  account: {
    modelName: "authAccount",
    accountLinking: { enabled: false },
  },
  verification: { modelName: "authVerification" },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  // No Organization, social sign-in, invitation or email provider plugins.
});
