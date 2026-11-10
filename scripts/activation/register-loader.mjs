import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Node 24 strips TS types. Resolve only this script's and generated Prisma's
// extensionless relative TS imports; no transpilation or modification of files.
const roots = [new URL("./", import.meta.url).href, new URL("../../generated/prisma/", import.meta.url).href];
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL && roots.some(root => context.parentURL.startsWith(root)) && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (roots.some(root => candidate.href.startsWith(root)) && existsSync(fileURLToPath(candidate)))
        return nextResolve(candidate.href, context);
    }
    return nextResolve(specifier, context);
  },
});
