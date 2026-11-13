import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { recordEditorURL } from "./record-editor-loader.mjs";

function moduleURL(source) {
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText.replace('from "react/jsx-runtime"', `from ${JSON.stringify(import.meta.resolve("react/jsx-runtime"))}`);
  return `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
}
const quickSale = moduleURL(await readFile(new URL("../lib/catalog/quick-sale.ts", import.meta.url), "utf8"));
const priceFormat = moduleURL(await readFile(new URL("../lib/catalog/price-format.ts", import.meta.url), "utf8"));
globalThis[Symbol.for("milo.product-form-test")] = {
  useRouter: () => ({ replace() {}, refresh() {} }), createProduct: async () => ({ status: "idle" }), updateProduct: async () => ({ status: "idle" }),
};
let source = await readFile(new URL("../components/panel/product-form.tsx", import.meta.url), "utf8");
for (const [from, to] of [
  ['from "react"', `from ${JSON.stringify(import.meta.resolve("react"))}`],
  ['import { useRouter } from "next/navigation";', 'const { useRouter } = globalThis[Symbol.for("milo.product-form-test")];'],
  ['import { createProduct, updateProduct } from "@/app/panel/productos/actions";', 'const { createProduct, updateProduct } = globalThis[Symbol.for("milo.product-form-test")];'],
  ['from "@/lib/catalog/quick-sale"', `from ${JSON.stringify(quickSale)}`],
  ['from "@/lib/catalog/price-format"', `from ${JSON.stringify(priceFormat)}`],
  ['from "./record-editor"', `from ${JSON.stringify(recordEditorURL)}`],
]) { assert.ok(source.includes(from)); source = source.replace(from, to); }
const { ProductForm } = await import(moduleURL(source));
const version = "2026-11-09T00:00:00.000Z";
const options = { currency: "ARS", categories: [], brands: [], units: [{ code: "UN", name: "Unidad", dimensionCode: "COUNT" }, { code: "M", name: "Metro", dimensionCode: "LENGTH" }] };
const product = { id: "memory-product", version, name: "Memory only", sku: "MEMORY", description: "", categoryId: null, brandId: null, isPublished: false, baseUnitCode: "UN", baseUnitDimensionCode: "COUNT", baseUnitName: "Unidad", allowsFractionalQuantity: false };
const presentation = { id: "memory-presentation", version, priceVersion: version, name: "Individual", unitCode: "UN", isEnabled: true, factor: "1.000", price: "0.00", hasHistory: true };
const management = { productId: product.id, productVersion: version, baseUnitCode: "UN", currency: "ARS", units: options.units, presentations: [presentation] };
const render = props => renderToStaticMarkup(createElement(ProductForm, props));

test("new normal form defaults to unit sale with required explicit price and no technical or stock fields", () => {
  const html = render({ options });
  assert.match(html, /name="mode" value="individual"/); assert.match(html, /name="amount"/); assert.match(html, /Precio de venta/);
  assert.doesNotMatch(html, /name="(?:baseUnitCode|allowsFractionalQuantity|factor|initialStock|quantity)"/);
  assert.match(html, /<summary>Opciones avanzadas<\/summary>/); assert.doesNotMatch(html, /<details[^>]*\bopen/);
  assert.match(html, /Marca \(opcional\)/); assert.equal((html.match(/<form\b/g) ?? []).length, 1);
});

test("zero-price editing keeps its value and technical management outside the principal form", () => {
  const html = render({ product, options, management, advanced: createElement("div", { "data-advanced": true }, "Advanced presentations") });
  assert.match(html, /name="amount"[^>]*value="0.00"/); assert.match(html, /name="presentationId" value="memory-presentation"/);
  assert.match(html, /id="product-price"[^>]*value="0,00"/);
  assert.ok(html.indexOf("</form>") < html.indexOf("<summary>Opciones avanzadas</summary>"));
  assert.match(html, /data-advanced="true"/); assert.doesNotMatch(html, /name="(?:baseUnitCode|allowsFractionalQuantity)"/);
});

test("editing shows Argentine money while submitting the exact original decimal", () => {
  const html = render({ product, options, management: { ...management, presentations: [{ ...presentation, price: "100000.25" }] } });
  assert.match(html, /id="product-price"[^>]*value="100.000,25"/);
  assert.match(html, /name="amount"[^>]*value="100000.25"/);
});

test("missing UN and ambiguous existing presentations never imply a default unit or price target", () => {
  const missing = render({ options: { ...options, units: options.units.slice(1) } });
  assert.match(missing, /name="mode" value="advanced"/); assert.match(missing, /name="baseUnitCode"/); assert.match(missing, /name="amount" value=""/);
  const ambiguous = render({ product, options, management: { ...management, presentations: [presentation, { ...presentation, id: "second" }] } });
  assert.match(ambiguous, /name="presentationId" value=""/); assert.match(ambiguous, /name="amount" value=""/); assert.match(ambiguous, /varias presentaciones individuales/);
  const noCurrency = render({ product, options, management: { ...management, currency: null } });
  assert.match(noCurrency, /name="priceVersion" value=""/); assert.match(noCurrency, /necesita una moneda/);
});

test("editor tabs preserve all submitted fields and the footer submits the principal form outside the scroll body", () => {
  const html = render({ options, onCancel() {}, onSaved() {} });
  const formId = html.match(/<form id="([^"]+)"/)[1];
  assert.match(html, /role="tablist" aria-label="Secciones del formulario"/);
  assert.equal((html.match(/role="tab"/g) ?? []).length, 2);
  assert.match(html, /aria-selected="true"[^>]*>Datos/);
  assert.match(html, /aria-selected="false"[^>]*>Precios/);
  assert.match(html, /data-tab="prices" hidden/);
  for (const field of ["name", "sku", "description", "categoryId", "brandId", "isPublished", "amount", "currency", "mode"]) assert.ok(html.includes(`name="${field}"`), field);
  assert.ok(html.indexOf("</form>") < html.indexOf('class="milo-record-editor-footer"'));
  assert.ok(html.includes(`form="${formId}"`));
  assert.match(html, /type="button">Cancelar/);
  assert.match(html, />Guardar<\/button>/);
  assert.doesNotMatch(html, /IVA|Costo|Lista de precios/);
});
