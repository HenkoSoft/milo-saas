import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { formatInventoryQuantity as format } from "../lib/inventory/format.ts";

const unit = { unit: "UN", allowsFractionalQuantity: false };
const meter = { unit: "M", allowsFractionalQuantity: true };

test("inventory strips technical zeroes and preserves decimal precision in Argentine format", () => {
  for (const [input, expected] of [["10.000", "10"], ["7.000", "7"], ["0.000", "0"], ["-0.000", "0"], ["-7.000", "-7"], ["10000.000", "10.000"]]) {
    assert.equal(format(input, unit), expected);
  }
  for (const [input, expected] of [["1.500", "1,5"], ["0.001", "0,001"], ["-1.250", "-1,25"], ["12345.670", "12.345,67"], ["999999999999999.999", "999.999.999.999.999,999"]]) {
    assert.equal(format(input, meter), expected);
  }
  assert.equal(format(null, unit), "Sin saldo registrado");
});

test("unexpected fractions are never rounded or silently treated as permitted", () => {
  assert.equal(format("1.500", unit), "1,5 (fracción no habilitada)");
  assert.equal(format("1.500", { ...unit, allowsFractionalQuantity: true }), "1,5 (fracción no habilitada)");
  assert.equal(format("1.500", { unit: "M", allowsFractionalQuantity: false }), "1,5 (fracción no habilitada)");
  assert.equal(format("1.500", { unit: "M" }), "1,5 (fracción no habilitada)");
  for (const invalid of ["1,500", "1.000,000", "1e3", "1.2345", "", "NaN"]) assert.equal(format(invalid, meter), "Cantidad no válida");
});

const product = { id: "product-memory", sku: "SKU", name: "In-memory product", ...unit };
const branch = { id: "branch-memory", name: "In-memory branch" };
const fixture = {
  list: { branches: [branch], branch, operationsReady: true, items: [{ ...product, quantity: "10.000" }, { ...product, id: "empty", quantity: null }], total: 2, pages: 1, page: 1, q: "" },
  history: { product, branch, quantity: "7.000", movements: [{ id: "movement-memory", type: "MANUAL_ADJUSTMENT", quantity: "-3.000", date: "2026-11-10T12:00:00Z", actorId: "actor-memory", actorName: null, sourceOrderId: null, reason: "Test in memory", sourceReference: null }], pages: 1, page: 1, timeZone: "UTC" },
};
globalThis[Symbol.for("milo.inventory-format-test")] = fixture;

async function loadPage(path) {
  let source = await readFile(new URL(path, import.meta.url), "utf8");
  source = source
    .replace('import Link from "next/link";', 'const Link = ({children}) => children;')
    .replace('import { requirePanelContext } from "@/lib/panel/access";', 'const requirePanelContext = async () => ({});')
    .replace('import { listInventory } from "@/lib/inventory/service";', 'const listInventory = async () => ({status: "ok", data: globalThis[Symbol.for("milo.inventory-format-test")].list});')
    .replace('import { inventoryHistory } from "@/lib/inventory/service";', 'const inventoryHistory = async () => ({status: "ok", data: globalThis[Symbol.for("milo.inventory-format-test")].history});')
    .replace('import { canWriteInventory } from "@/lib/inventory/permission";', 'const canWriteInventory = () => false;')
    .replace(/^import \{[^\n]+\} from "@\/components\/panel\/inventory-ui";$/m, 'const InventoryOperations = () => null, InventoryPagination = () => null, InventoryProblem = () => null, inventoryParams = x => x, movementDate = x => x;')
    .replace('from "@/lib/inventory/format"', `from ${JSON.stringify(new URL("../lib/inventory/format.ts", import.meta.url).href)}`);
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText.replace('from "react/jsx-runtime"', `from ${JSON.stringify(import.meta.resolve("react/jsx-runtime"))}`);
  return (await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`)).default;
}

test("list and history render formatted balances and signed movements, without modifying source decimals", async () => {
  const list = await loadPage("../app/panel/inventario/page.tsx");
  const history = await loadPage("../app/panel/inventario/[id]/page.tsx");
  const html = renderToStaticMarkup(await list({ searchParams: Promise.resolve({}) }));
  assert.match(html, /class="milo-inventory-quantity">10<\/td>/);
  assert.match(html, /Sin saldo registrado/);
  assert.doesNotMatch(html, /10\.000/);
  const historyHTML = renderToStaticMarkup(await history({ params: Promise.resolve({ id: product.id }), searchParams: Promise.resolve({}) }));
  assert.match(historyHTML, /7 UN/);
  assert.match(historyHTML, /-3/);
  assert.doesNotMatch(historyHTML, /7\.000|-3\.000/);
  assert.equal(fixture.list.items[0].quantity, "10.000");
  assert.equal(fixture.history.movements[0].quantity, "-3.000");
});
