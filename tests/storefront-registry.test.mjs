import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

function moduleURL(source) {
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
}

// Load the actual registry and public editorial data. Only the server-only
// marker is omitted here; Next's build verifies the server component boundary.
const siteURL = moduleURL(await readFile(new URL("../lib/site.ts", import.meta.url), "utf8"));
const source = (await readFile(new URL("../lib/storefront/registry.ts", import.meta.url), "utf8"))
  .replace('import "server-only";', "")
  .replace('from "next/navigation"', `from ${JSON.stringify(import.meta.resolve("next/navigation.js"))}`)
  .replace('from "zod"', `from ${JSON.stringify(import.meta.resolve("zod"))}`)
  .replace('from "@/lib/site"', `from ${JSON.stringify(siteURL)}`);
const { getStorefront, requireStorefront, getStorefrontSlugs } = await import(moduleURL(source));

test("the public registry recognizes only the existing Milo Store editorial site", () => {
  assert.deepEqual(getStorefrontSlugs(), ["milo-store"]);
  const config = requireStorefront("milo-store");
  assert.equal(config.identity.name, "Milo Store");
  assert.equal(config.template, "wholesale");
  assert.equal(config.identity.logo.src, "/brand-mark.svg");
  assert.equal("tenantId" in config, false);
  assert.equal("authUserId" in config, false);
  assert.equal("permissions" in config, false);
  const slugs = getStorefrontSlugs();
  slugs.push("unregistered");
  assert.equal(getStorefront("unregistered"), null);
});

test("unknown stores, malformed values and object prototype names resolve to 404", () => {
  for (const slug of [
    "other-store", "constructor", "toString", "__proto__", "prototype",
    "Milo-Store", " milo-store", "milo-store ", "milo--store", "-milo-store",
    "milo-store-", "../milo-store", "milo-store/catalogo", "%6dilo-store",
    "milo_store", "milo.store", "milo\u0000store", "tienda-ñ", "a".repeat(64),
    "", undefined, null, 123, ["milo-store"], { slug: "milo-store" },
  ]) {
    assert.equal(getStorefront(slug), null);
    assert.throws(() => requireStorefront(slug), error =>
      error.digest === "NEXT_HTTP_ERROR_FALLBACK;404");
  }
});
