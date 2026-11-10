import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Load the actual server configuration, replacing only its Prisma transport.
// No PostgreSQL connection, local .env, real identity or session is used.
const calls = [];
const rows = new Map();
const prisma = Object.fromEntries(
  ["authUser", "authSession", "authAccount", "authVerification"].map((model) => [
    model,
    {
      async findFirst(args) {
        calls.push({ model, args });
        return rows.get(model) ?? null;
      },
      async findMany(args) {
        calls.push({ model, args });
        const row = rows.get(model);
        return row ? [row] : [];
      },
      async create(args) {
        calls.push({ model, args });
        rows.set(model, args.data);
        return args.data;
      },
      async deleteMany(args) {
        calls.push({ model, args });
        const deleted = rows.delete(model);
        return { count: deleted ? 1 : 0 };
      },
      async delete(args) {
        calls.push({ model, args });
        const row = rows.get(model);
        rows.delete(model);
        return row;
      },
    },
  ]),
);
globalThis[Symbol.for("milo.auth-test.prisma")] = prisma;
process.env.NODE_ENV = "development";
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.BETTER_AUTH_SECRET = randomBytes(32).toString("base64");

let moduleVersion = 0;
async function loadServerModule(path, replacements) {
  let source = await readFile(new URL(path, import.meta.url), "utf8");
  for (const [from, to] of replacements) {
    assert.ok(source.includes(from), `Expected import: ${from}`);
    source = source.replace(from, to);
  }
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const url = `data:text/javascript;base64,${Buffer.from(`${output}\n// test module ${moduleVersion++}`).toString("base64")}`;
  return { module: await import(url), url };
}

const authImports = [
  ['import "server-only";', "// Server boundary is checked by the Next.js build."],
  ['from "better-auth"', `from ${JSON.stringify(import.meta.resolve("better-auth"))}`],
  ['from "better-auth/adapters/prisma"', `from ${JSON.stringify(import.meta.resolve("better-auth/adapters/prisma"))}`],
  ['import { prisma } from "./prisma";', 'const prisma = globalThis[Symbol.for("milo.auth-test.prisma")];'],
];
const loaded = await loadServerModule("../lib/auth.ts", authImports);
const { auth } = loaded.module;
const { module: route } = await loadServerModule("../app/api/auth/[...all]/route.ts", [
  ['from "better-auth/next-js"', `from ${JSON.stringify(import.meta.resolve("better-auth/next-js"))}`],
  ['from "@/lib/auth"', `from ${JSON.stringify(loaded.url)}`],
]);

test("public signup is rejected before any database access, including forged membership", async () => {
  calls.length = 0;
  const body = {
    name: "Test only",
    email: "test@example.invalid",
    password: "test-only-password-123",
    tenantId: "forged-tenant",
    role: "OWNER",
    authUserId: "forged-user",
  };
  const response = await route.POST(new Request("http://localhost:3000/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify(body),
  }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "EMAIL_PASSWORD_SIGN_UP_DISABLED");
  await assert.rejects(auth.api.signUpEmail({ body }), (error) =>
    error.body?.code === "EMAIL_PASSWORD_SIGN_UP_DISABLED");
  assert.deepEqual(calls, []);
});

test("all four model names resolve to the expected Prisma delegates", async () => {
  const context = await auth.$context;
  for (const [model, delegate] of Object.entries({
    user: "authUser", session: "authSession", account: "authAccount", verification: "authVerification",
  })) {
    calls.length = 0;
    await context.adapter.findOne({ model, where: [{ field: "id", value: "test-id" }] });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].model, delegate);
  }
});

test("real email/password handler signs in, issues a cookie and sign-out invalidates the in-memory session", async () => {
  const { hashPassword } = await import("better-auth/crypto");
  const now = new Date();
  const account = {
    id: "memory-account", userId: "memory-identity", accountId: "memory-identity",
    providerId: "credential", password: await hashPassword("memory-only-password"),
    createdAt: now, updatedAt: now,
  };
  rows.set("authUser", {
    id: "memory-identity", name: "Memory only", email: "memory@example.invalid",
    emailVerified: false, image: null, createdAt: now, updatedAt: now,
  });
  rows.set("authAccount", account);
  calls.length = 0;
  try {
    const response = await route.POST(new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ email: "memory@example.invalid", password: "memory-only-password", rememberMe: false }),
    }));
    assert.equal(response.status, 200);
    const cookieHeader = response.headers.getSetCookie().find(cookie => cookie.startsWith("better-auth.session_token="));
    assert.ok(cookieHeader);
    assert.match(cookieHeader, /HttpOnly/i);
    assert.equal((await response.json()).user.id, "memory-identity");
    const cookie = cookieHeader.split(";")[0];
    const active = await route.GET(new Request("http://localhost:3000/api/auth/get-session?disableRefresh=true", { headers: { cookie } }));
    assert.equal(active.status, 200);
    assert.equal((await active.json()).user.id, "memory-identity");
    const signedOut = await route.POST(new Request("http://localhost:3000/api/auth/sign-out", {
      method: "POST", headers: { cookie, origin: "http://localhost:3000", "content-type": "application/json" }, body: "{}",
    }));
    assert.equal(signedOut.status, 200);
    assert.equal(rows.has("authSession"), false);
    const revoked = await route.GET(new Request("http://localhost:3000/api/auth/get-session?disableRefresh=true", { headers: { cookie } }));
    assert.equal(await revoked.json(), null);
    assert.ok(calls.every(({ model }) => ["authUser", "authAccount", "authSession"].includes(model)));
  } finally {
    rows.clear();
  }
});

test("malformed and invalid credentials are rejected by the real sign-in handler", async () => {
  rows.clear();
  for (const [body, expected] of [
    [{ email: "not-an-email", password: "invalid" }, 400],
    [{ email: "unknown@example.invalid", password: "wrong-memory-password" }, 401],
  ]) {
    const response = await route.POST(new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3000" }, body: JSON.stringify(body),
    }));
    assert.equal(response.status, expected);
    assert.equal(response.headers.getSetCookie().some(cookie => cookie.startsWith("better-auth.session_token=")), false);
    if (expected === 401) assert.equal((await response.json()).code, "INVALID_EMAIL_OR_PASSWORD");
  }
});

test("an identity without UserProfile receives identity data only, with no business permissions", async () => {
  calls.length = 0;
  const now = new Date();
  rows.set("authUser", {
    id: "identity-only", name: "Test only", email: "test@example.invalid",
    emailVerified: false, image: null, createdAt: now, updatedAt: now,
  });
  rows.set("authSession", {
    id: "test-session", userId: "identity-only", token: "test-token",
    createdAt: now, updatedAt: now, expiresAt: new Date(now.getTime() + 86400000),
  });
  const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET).update("test-token").digest("base64");
  const response = await route.GET(new Request("http://localhost:3000/api/auth/get-session?disableRefresh=true", {
    headers: { cookie: `better-auth.session_token=${encodeURIComponent(`test-token.${signature}`)}` },
  }));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.user.id, "identity-only");
  for (const key of ["tenantId", "userProfile", "roles", "permissions", "customer", "priceVisibility"]) {
    assert.equal(key in result, false);
    assert.equal(key in result.user, false);
    assert.equal(key in result.session, false);
  }
  assert.ok(calls.length > 0);
  assert.ok(calls.every(({ model }) => ["authSession", "authUser"].includes(model)));
  rows.clear();
});

async function withEnvironment(overrides, run) {
  const previous = Object.fromEntries(Object.keys(overrides).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("missing, short, blank and known insecure secrets fail without exposing values", async () => {
  for (const secret of [
    undefined, "", " ".repeat(40), "sensitive-short-value",
    "better-auth-secret-12345678901234567890",
    "BETTER-AUTH-SECRET-12345678901234567890",
    "replace_with_a_local_random_password",
    "replace_with_a_random_secret_at_least_32_characters",
    "your-super-secret-key-at-least-32-characters-long",
    "a".repeat(40), ` ${randomBytes(32).toString("base64")} `,
  ]) {
    await withEnvironment({ BETTER_AUTH_SECRET: secret }, async () => {
      await assert.rejects(loadServerModule("../lib/auth.ts", authImports), (error) => {
        assert.equal(error.message,
          "Invalid BETTER_AUTH_SECRET: provide a non-placeholder secret of at least 32 characters.");
        if (secret) assert.equal(error.stack.includes(secret), false);
        assert.equal(error.cause, undefined);
        return true;
      });
    });
  }
});

test("invalid URLs and non-local HTTP fail without exposing URL credentials or secrets", async () => {
  const secret = randomBytes(32).toString("base64");
  for (const [url, nodeEnv] of [
    [undefined, "development"], ["", "development"], [" ", "development"],
    ["/relative", "development"], ["not-a-url-sensitive-value", "development"],
    ["https://", "development"], ["https://example.invalid:99999", "development"],
    ["https://user:private-password@example.invalid", "production"],
    [" http://localhost:3000", "development"], ["https:example.invalid", "production"],
    ["ftp://localhost", "development"], ["http://example.invalid", "development"],
    ["http://localhost.example.invalid", "development"], ["http://0.0.0.0", "development"],
    ["http://192.168.1.10", "development"], ["http://[::]", "development"],
    ["http://localhost:3000", "production"], ["http://127.0.0.1", "production"],
    ["http://[::1]", "production"], ["http://localhost:3000", "test"],
    ["http://localhost:3000", undefined],
  ]) {
    await withEnvironment({ BETTER_AUTH_URL: url, BETTER_AUTH_SECRET: secret, NODE_ENV: nodeEnv }, async () => {
      await assert.rejects(loadServerModule("../lib/auth.ts", authImports), (error) => {
        assert.match(error.message, /^Invalid BETTER_AUTH_URL:/);
        for (const value of [url, secret, "private-password"].filter((value) => value?.trim())) {
          assert.equal(error.stack.includes(value), false);
        }
        assert.equal(error.cause, undefined);
        return true;
      });
    });
  }
});

test("valid URLs and secrets configure actual cookies securely for each environment", async () => {
  for (const [url, nodeEnv, secure] of [
    ["http://localhost:3000", "development", false],
    ["http://localhost.:3000", "development", false],
    ["http://127.0.0.1:3000", "development", false],
    ["http://127.42.0.2:3000", "development", false],
    ["http://[::1]:3000", "development", false],
    ["https://milo.example.invalid", "development", true],
    ["https://milo.example.invalid", "production", true],
    ["https://localhost:3000", "production", true],
  ]) {
    // Exactly 32 characters is accepted. Values are generated only in tests.
    const secret = randomBytes(24).toString("base64");
    await withEnvironment({ BETTER_AUTH_URL: url, BETTER_AUTH_SECRET: secret, NODE_ENV: nodeEnv }, async () => {
      const { module: { auth: configured } } = await loadServerModule("../lib/auth.ts", authImports);
      assert.equal(configured.options.secret, secret);
      assert.equal(configured.options.baseURL, url);
      assert.equal(configured.options.advanced.useSecureCookies, secure);
      const cookie = (await configured.$context).authCookies.sessionToken;
      assert.equal(cookie.attributes.secure, secure);
      assert.equal(cookie.attributes.httpOnly, true);
      assert.equal(cookie.attributes.sameSite, "lax");
    });
  }
});
