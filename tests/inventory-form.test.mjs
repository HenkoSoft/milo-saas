import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

globalThis[Symbol.for("milo.inventory-form-test")] = { receiveStock: async () => ({ status: "idle" }), adjustStock: async () => ({ status: "idle" }) };
let source = await readFile(new URL("../components/panel/inventory-operation-form.tsx", import.meta.url), "utf8");
source = source.replace('from "react"', `from ${JSON.stringify(import.meta.resolve("react"))}`).replace('import { receiveStock, adjustStock } from "@/app/panel/inventario/actions";', 'const { receiveStock, adjustStock } = globalThis[Symbol.for("milo.inventory-form-test")];');
source = source.replace('from "@/lib/inventory/format"', `from ${JSON.stringify(new URL("../lib/inventory/format.ts", import.meta.url).href)}`);
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText.replace('from "react/jsx-runtime"', `from ${JSON.stringify(import.meta.resolve("react/jsx-runtime"))}`);
const { InventoryOperationForm } = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
const props = { operationId: "00000000-0000-4000-8000-000000000001", branch: { id: "branch-memory", name: "Memory branch" }, products: [{ id: "product-memory", sku: "MEMORY", name: "Memory only", unit: "UN", quantity: "10.000" }], selectedProduct: "product-memory" };

test("receipt form has a stable request identity, base-unit quantity, real optional reference and no balance overwrite input", () => {
  const html = renderToStaticMarkup(createElement(InventoryOperationForm, { ...props, adjustment: false }));
  assert.match(html, /name="requestId" value="00000000-0000-4000-8000-000000000001"/); assert.match(html, /name="baseUnitCode" value="UN"/);
  const quantity = html.match(/<input\b[^>]*name="quantity"[^>]*>/)?.[0]; assert.match(quantity, /inputMode="numeric"/);
  assert.match(html, /name="sourceReference"/); assert.doesNotMatch(html, /name="quantityOnHand"|name="tenantId"|name="actorUserId"|name="direction"|name="reason"/);
  assert.match(html, /Existencia consultada: 10 UN/); assert.doesNotMatch(html, /10\.000/);
  for (const match of html.matchAll(/<label for="([^"]+)"/g)) assert.ok(html.includes(`id="${match[1]}"`));
});

test("form displays fractional stock exactly but does not enable fractional input", () => {
  const html = renderToStaticMarkup(createElement(InventoryOperationForm, { ...props, products: [{ ...props.products[0], unit: "M", allowsFractionalQuantity: true, quantity: "1.500" }], adjustment: false }));
  assert.match(html, /Existencia consultada: 1,5 M/);
  assert.match(html.match(/<input\b[^>]*name="quantity"[^>]*>/)?.[0], /inputMode="numeric"/);
  assert.doesNotMatch(html, /1\.500/);
});
test("adjustment requires direction and a freely entered reason, with no invented motive options", () => {
  const html = renderToStaticMarkup(createElement(InventoryOperationForm, { ...props, adjustment: true }));
  assert.match(html, /name="direction" required/); assert.match(html, /name="reason" required/); assert.match(html, /value="add"/); assert.match(html, /value="subtract"/);
  assert.equal((html.match(/<form\b/g) ?? []).length, 1); assert.match(html, /role="|aria-busy="false"/); assert.doesNotMatch(html, /name="quantityOnHand"/);
});
