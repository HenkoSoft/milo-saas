import { readFile } from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
const root = fileURLToPath(new URL("../", import.meta.url));
export async function purchaseModules(dependencies) {
  globalThis[Symbol.for("milo.purchases-test")] = dependencies;
  const cache = new Map();
  async function load(file) {
    const full = resolve(root, file); if (cache.has(full)) return cache.get(full);
    let source = ts.transpileModule(await readFile(full, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    source = source.replace('import "server-only";', "")
      .replace('import { Prisma } from "@/generated/prisma/client";', 'const {Prisma}=globalThis[Symbol.for("milo.purchases-test")];')
      .replace('import { prisma } from "@/lib/prisma";', 'const {prisma}=globalThis[Symbol.for("milo.purchases-test")];')
      .replace('import { getPanelAccess } from "@/lib/panel/access";', 'const {getPanelAccess}=globalThis[Symbol.for("milo.purchases-test")];');
    for (const specifier of new Set([...source.matchAll(/\bfrom "([^"]+)"/g)].map(m => m[1]))) {
      if (specifier.startsWith("node:")) continue;
      const target = specifier.startsWith(".") ? await load(relative(root, resolve(dirname(full), specifier + ".ts"))) : specifier.startsWith("@/") ? await load(specifier.slice(2) + ".ts") : import.meta.resolve(specifier);
      source = source.replaceAll(`from "${specifier}"`, `from ${JSON.stringify(target)}`);
    }
    const url = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`; cache.set(full, url); return url;
  }
  return { service: await import(await load("lib/purchases/service.ts")), schema: await import(await load("lib/purchases/schema.ts")), permission: await import(await load("lib/panel/purchase-permission.ts")), suppliers: await import(await load("lib/suppliers/service.ts")) };
}
