import { readFile } from "node:fs/promises";
import ts from "typescript";
const url = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`;
export async function customerModules(dependencies) {
  globalThis[Symbol.for("milo.customer-commercial-test")] = dependencies;
  const modules = {};
  modules["@/lib/panel/customer-permission"] = url(await readFile(new URL("../lib/panel/customer-permission.ts", import.meta.url), "utf8"));
  for (const name of ["commercial-fields", "schema", "commercial-schema", "basic-service", "expanded-service", "storage", "service"]) {
    let source = await readFile(new URL(`../lib/customers/${name}.ts`, import.meta.url), "utf8");
    source = source.replace('import "server-only";', "")
      .replace(/import \{ prisma \} from "@\/lib\/prisma";/g, 'const { prisma } = globalThis[Symbol.for("milo.customer-commercial-test")];')
      .replace(/import \{ getPanelAccess(?:, type PanelContext)? \} from "@\/lib\/panel\/access";/g, 'const { getPanelAccess } = globalThis[Symbol.for("milo.customer-commercial-test")];')
      .replace('from "zod"', `from ${JSON.stringify(import.meta.resolve("zod"))}`);
    for (const [key, value] of Object.entries(modules)) source = source.replaceAll(`from "${key}"`, `from ${JSON.stringify(value)}`);
    const value = url(source); modules[`./${name}`] = value;
  }
  return { service: await import(modules["./service"]), schema: await import(modules["./commercial-schema"]), fields: await import(modules["./commercial-fields"]), storage: await import(modules["./storage"]) };
}
