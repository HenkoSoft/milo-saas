import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { z } from "zod";

// Exercise the real read action with no database or credentials. Tenant/role
// enforcement inside these existing services is covered by catalog/presentations.
const calls = [];
let denied = null;
const options = { currency: "ARS", categories: [], brands: [], units: [] };
const product = { id: "9be544a6-994f-4b1b-80d0-02a6cbe5a531" };
const management = { productId: product.id, presentations: [] };
const read = (name, data) => async id => {
  calls.push([name, id]);
  return denied?.[name] ?? { status: "ok", data };
};
globalThis[Symbol.for("milo.editor-test")] = {
  catalogOptions: read("options", options), getProduct: read("product", { product }),
  getPresentationManagement: read("management", management), resourceId: z.uuid(),
};
let source = await readFile(new URL("../app/panel/productos/editor-actions.ts", import.meta.url), "utf8");
for (const declaration of [
  'import { catalogOptions, getProduct } from "@/lib/catalog/service";',
  'import { getPresentationManagement } from "@/lib/catalog/presentation-service";',
  'import { resourceId } from "@/lib/catalog/schema";',
]) { assert.ok(source.includes(declaration)); source = source.replace(declaration, ""); }
source = 'const { catalogOptions, getProduct, getPresentationManagement, resourceId } = globalThis[Symbol.for("milo.editor-test")];\n' + source;
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { loadProductEditor } = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

test("modal read rejects untrusted identifiers and never accepts tenant or product objects", async () => {
  for (const input of [undefined, "", "bad-id", {}, { id: product.id, tenantId: "other" }, [product.id]]) {
    calls.length = 0;
    assert.deepEqual(await loadProductEditor(input), { status: "invalid" });
    assert.equal(calls.length, 0);
  }
});

test("new modal reads only authorized options; editing uses the current protected product and management services", async () => {
  calls.length = 0; denied = null;
  assert.deepEqual(await loadProductEditor(null), { status: "ok", data: { options } });
  assert.deepEqual(calls, [["options", undefined]]);
  calls.length = 0;
  assert.deepEqual(await loadProductEditor(product.id), { status: "ok", data: { options, product, management } });
  assert.deepEqual(calls, [["options", undefined], ["product", product.id], ["management", product.id]]);
});

test("denied, missing and failed services stop loading without returning partial private data", async () => {
  for (const [name, status, count] of [["options", "forbidden", 1], ["product", "missing", 2], ["management", "forbidden", 3], ["management", "error", 3]]) {
    calls.length = 0; denied = { [name]: { status } };
    assert.deepEqual(await loadProductEditor(product.id), { status });
    assert.equal(calls.length, count);
  }
  denied = null;
});

globalThis[Symbol.for("milo.editor-test")].getBrand = read("brand", { id: product.id, name: "Memory", version: "2026-11-10T00:00:00.000Z" });
globalThis[Symbol.for("milo.editor-test")].getCategory = read("category", { id: product.id, name: "Memory", version: "2026-11-10T00:00:00.000Z" });
let taxonomy = await readFile(new URL("../app/panel/catalog-editor-actions.ts", import.meta.url), "utf8");
for (const declaration of [
  'import { catalogOptions, getBrand, getCategory } from "@/lib/catalog/service";',
  'import { resourceId } from "@/lib/catalog/schema";',
]) { assert.ok(taxonomy.includes(declaration)); taxonomy = taxonomy.replace(declaration, ""); }
taxonomy = 'const { catalogOptions, getBrand, getCategory, resourceId } = globalThis[Symbol.for("milo.editor-test")];\n' + taxonomy;
const taxonomyCode = ts.transpileModule(taxonomy, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { loadBrandEditor, loadCategoryEditor } = await import(`data:text/javascript;base64,${Buffer.from(taxonomyCode).toString("base64")}`);

test("brand/category editors reject browser tenant/record objects and use only protected reads", async () => {
  for (const [load, kind] of [[loadBrandEditor, "brand"], [loadCategoryEditor, "category"]]) {
    for (const invalid of [undefined, "", "invalid-id", { id: product.id, tenantId: "foreign" }]) {
      calls.length = 0; denied = null;
      assert.deepEqual(await load(invalid), { status: "invalid" }); assert.equal(calls.length, 0);
    }
    calls.length = 0;
    assert.deepEqual(await load(null), { status: "ok", data: {} });
    assert.deepEqual(calls, [["options", undefined]]);
    calls.length = 0;
    const result = await load(product.id);
    assert.equal(result.data.record.id, product.id); assert.deepEqual(calls, [[kind, product.id]]);
    for (const status of ["forbidden", "missing", "error"]) {
      denied = { [kind]: { status } };
      assert.deepEqual(await load(product.id), { status });
    }
    denied = { options: { status: "forbidden" } };
    assert.deepEqual(await load(null), { status: "forbidden" });
  }
  denied = null;
});
