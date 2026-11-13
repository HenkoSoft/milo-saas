import { readFile } from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
const root=fileURLToPath(new URL("../",import.meta.url));
export async function transferModules(dependencies){
  globalThis[Symbol.for("milo.transfer-test")]=dependencies;
  const cache=new Map();
  async function load(file){
    const full=resolve(root,file);if(cache.has(full))return cache.get(full);
    let source=ts.transpileModule(await readFile(full,"utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
    source=source.replace('import "server-only";',"")
      .replace('import { prisma } from "@/lib/prisma";','const {prisma}=globalThis[Symbol.for("milo.transfer-test")];')
      .replace('import { getPanelAccess } from "@/lib/panel/access";','const {getPanelAccess}=globalThis[Symbol.for("milo.transfer-test")];')
      .replace('import { revalidatePath } from "next/cache";','const {revalidatePath}=globalThis[Symbol.for("milo.transfer-test")];');
    const imports=[...source.matchAll(/\bfrom "([^"]+)"/g)].map(match=>match[1]);
    for(const specifier of new Set(imports)){
      if(specifier.startsWith("node:")||specifier.startsWith("data:"))continue;
      let target;
      if(specifier.startsWith("."))target=await load(relative(root,resolve(dirname(full),specifier+".ts")));
      else if(specifier.startsWith("@/"))target=await load(specifier.slice(2)+".ts");
      else target=import.meta.resolve(specifier);
      source=source.replaceAll(`from "${specifier}"`,`from ${JSON.stringify(target)}`);
    }
    const url=`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;cache.set(full,url);return url;
  }
  return {service:await import(await load("lib/data-transfer/service.ts")),xlsx:await import(await load("lib/data-transfer/xlsx.ts")),http:await import(await load("lib/data-transfer/http.ts")),columns:await import(await load("lib/data-transfer/columns.ts"))};
}
