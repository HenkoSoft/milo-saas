import { readFile } from "node:fs/promises";
import ts from "typescript";
const url = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`;
export async function supplierModules(dependencies) {
  globalThis[Symbol.for("milo.suppliers-test")] = dependencies;
  const modules = { zod: import.meta.resolve("zod") };
  const files = [
    ["../customers/commercial-fields", "lib/customers/commercial-fields.ts"],
    ["../customers/schema", "lib/customers/schema.ts"],
    ["../customers/commercial-schema", "lib/customers/commercial-schema.ts"],
    ["./fields", "lib/suppliers/fields.ts"], ["./schema", "lib/suppliers/schema.ts"],
    ["@/lib/panel/supplier-permission", "lib/panel/supplier-permission.ts"],
    ["./storage", "lib/suppliers/storage.ts"], ["./service", "lib/suppliers/service.ts"],
  ];
  for (const [key,file] of files) {
    let source=await readFile(new URL("../"+file,import.meta.url),"utf8");
    source=source.replace('import "server-only";',"")
      .replace('import { prisma } from "@/lib/prisma";','const { prisma } = globalThis[Symbol.for("milo.suppliers-test")];')
      .replace('import { getPanelAccess, type PanelContext } from "@/lib/panel/access";','const { getPanelAccess } = globalThis[Symbol.for("milo.suppliers-test")];');
    if(key==="../customers/commercial-schema")source=source.replace('from "./commercial-fields"','from "../customers/commercial-fields"');
    for(const [specifier,value] of Object.entries(modules))source=source.replaceAll(`from "${specifier}"`,`from ${JSON.stringify(value)}`);
    modules[key]=url(source);
  }
  return { service:await import(modules["./service"]),schema:await import(modules["./schema"]),fields:await import(modules["./fields"]),storage:await import(modules["./storage"]),urls:modules,url };
}
