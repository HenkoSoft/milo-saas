import "../scripts/activation/register-loader.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { PrismaPg } from "@prisma/adapter-pg";
import { getPrismaClientClass } from "../generated/prisma/internal/class.ts";

test("development cache replaces a pre-regeneration Prisma client, reuses the current constructor and never disconnects in-flight clients", async () => {
  const original = { client: globalThis.prisma, constructor: globalThis.prismaConstructor, env: process.env.NODE_ENV, url: process.env.DATABASE_URL };
  const url = "postgresql://127.0.0.1:1/unused";
  const constructors = [getPrismaClientClass(process.cwd()), getPrismaClientClass(process.cwd())];
  assert.notEqual(constructors[0], constructors[1]);
  const clients = new Set(); let imports = 0, disconnects = 0;
  const old = new constructors[0]({ adapter: new PrismaPg({ connectionString: url }) }); clients.add(old);
  const disconnectOld = old.$disconnect.bind(old); old.$disconnect = async () => { disconnects++; };
  let source = await readFile(new URL("../lib/prisma.ts", import.meta.url), "utf8");
  source = source.replace('import "server-only";', "").replace('from "@prisma/adapter-pg"', `from ${JSON.stringify(import.meta.resolve("@prisma/adapter-pg"))}`).replace('import { PrismaClient } from "../generated/prisma/client";', 'const { PrismaClient } = globalThis[Symbol.for("milo.prisma-cache-test")];');
  async function load(ctor) {
    globalThis[Symbol.for("milo.prisma-cache-test")] = { PrismaClient: ctor };
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    const mod = await import(`data:text/javascript;base64,${Buffer.from(output + `\n// generation ${imports++}`).toString("base64")}`);
    clients.add(mod.prisma); return mod.prisma;
  }
  try {
    process.env.NODE_ENV = "development"; process.env.DATABASE_URL = url;
    // An old server had only global.prisma, with no generation tag.
    globalThis.prisma = old; delete globalThis.prismaConstructor;
    const fresh = await load(constructors[0]); assert.notEqual(fresh, old); assert.equal(disconnects, 0);
    assert.equal(await load(constructors[0]), fresh);
    const regenerated = await load(constructors[1]); assert.notEqual(regenerated, fresh); assert.equal(globalThis.prismaConstructor, constructors[1]);
    assert.equal(await load(constructors[1]), regenerated); assert.equal(disconnects, 0);
    process.env.NODE_ENV = "production";
    assert.notEqual(await load(constructors[1]), regenerated); assert.equal(globalThis.prisma, regenerated);
  } finally {
    old.$disconnect = disconnectOld; await Promise.all([...clients].map(c => c.$disconnect()));
    if (original.client === undefined) delete globalThis.prisma; else globalThis.prisma = original.client;
    if (original.constructor === undefined) delete globalThis.prismaConstructor; else globalThis.prismaConstructor = original.constructor;
    for (const [key, value] of [["NODE_ENV", original.env], ["DATABASE_URL", original.url]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
