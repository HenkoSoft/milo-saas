import "../scripts/activation/register-loader.mjs";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import ts from "typescript";

const moduleURL = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`;
export async function loadInventory(db, resolveAccess) {
  const key = `milo.inventory-test.${randomUUID()}`;
  globalThis[Symbol.for(key)] = { prisma: db, getPanelAccess: resolveAccess };
  const policy = moduleURL(await readFile(new URL("../lib/inventory/permission.ts", import.meta.url), "utf8"));
  const schema = moduleURL((await readFile(new URL("../lib/inventory/schema.ts", import.meta.url), "utf8")).replace('from "zod"', `from ${JSON.stringify(import.meta.resolve("zod"))}`));
  let source = await readFile(new URL("../lib/inventory/service.ts", import.meta.url), "utf8");
  for (const [from, to] of [
    ['import "server-only";', ""],
    ['from "@/generated/prisma/client"', `from ${JSON.stringify(new URL("../generated/prisma/client.ts", import.meta.url).href)}`],
    ['import { prisma } from "@/lib/prisma";', `const { prisma } = globalThis[Symbol.for(${JSON.stringify(key)})];`],
    ['import { getPanelAccess, type PanelContext } from "@/lib/panel/access";', `const { getPanelAccess } = globalThis[Symbol.for(${JSON.stringify(key)})];`],
    ['from "./permission"', `from ${JSON.stringify(policy)}`],
    ['from "./schema"', `from ${JSON.stringify(schema)}`],
  ]) { if (!source.includes(from)) throw new Error("Inventory test loader import mismatch"); source = source.replace(from, to); }
  return import(moduleURL(source));
}
