import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { JSDOM } from "jsdom";
import { act, createElement as h } from "react";
import { componentURL, loadRecordWorkspace, recordEditorURL } from "./record-editor-loader.mjs";
const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "http://localhost/panel/compras?q=fixture&status=DRAFT&branch=branch&page=2", pretendToBeVisual: true });
for (const key of ["window", "document", "Element", "HTMLElement", "HTMLDetailsElement", "HTMLDialogElement", "Event", "MouseEvent", "KeyboardEvent", "FormData"]) globalThis[key] = key === "window" ? dom.window : dom.window[key];
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; this.querySelector("button")?.focus(); };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
let refreshes = 0, discard = true, confirmations = 0, quoteCalls = 0, writes = [], saveResult, receiptPromise, data, root;
dom.window.confirm = () => { confirmations++; return discard; }; dom.window.history.back = () => {};
const router = { refresh() { refreshes++; }, replace() {}, push() {} };
const supplierId = randomUUID(), productId = randomUUID(), branchId = randomUUID();
const dependencies = {
  Link: ({ children, ...props }) => h("a", props, children), useRouter: () => router,
  searchPurchaseChoices: async ({ kind }) => ({ status: "ok", data: kind === "suppliers" ? [{ id: supplierId, label: "Fixture supplier" }] : [{ id: productId, label: "SKU · Fixture product", unit: "UNIT" }] }),
  calculatePurchaseQuote: async input => { quoteCalls++; return { status: "ok", data: { total: input.document?.taxAmount === "210000.00" ? "1210000.10" : "1000000.10", net: "1000000.10", subtotals: ["1000000.10"] } }; },
  savePurchaseDraft: async input => { writes.push({ kind: "draft", input }); return saveResult; },
  confirmPurchaseReceipt: async input => { writes.push({ kind: "receive", input }); return receiptPromise ?? saveResult; },
};
globalThis[Symbol.for("milo.purchase-ui-test")] = dependencies;
const moneyURL = componentURL(await readFile(new URL("../lib/catalog/price-format.ts", import.meta.url), "utf8"));
const previewURL = componentURL(await readFile(new URL("../lib/purchases/preview.ts", import.meta.url), "utf8"));
const interactionsURL = componentURL(await readFile(new URL("../components/panel/editor-interactions.ts", import.meta.url), "utf8"));
let source = await readFile(new URL("../components/panel/purchase-form.tsx", import.meta.url), "utf8");
source = source.replace('import Link from "next/link";', 'const {Link}=globalThis[Symbol.for("milo.purchase-ui-test")];')
  .replace('import { useRouter } from "next/navigation";', 'const {useRouter}=globalThis[Symbol.for("milo.purchase-ui-test")];')
  .replace('import { confirmPurchaseReceipt, savePurchaseDraft, searchPurchaseChoices } from "@/app/panel/compras/actions";', 'const {confirmPurchaseReceipt,savePurchaseDraft,searchPurchaseChoices}=globalThis[Symbol.for("milo.purchase-ui-test")];')
  .replace('from "@/lib/purchases/preview"', `from ${JSON.stringify(previewURL)}`)
  .replace('from "@/lib/catalog/price-format"', `from ${JSON.stringify(moneyURL)}`)
  .replace('from "./record-editor"', `from ${JSON.stringify(recordEditorURL)}`)
  .replace('from "./editor-interactions"', `from ${JSON.stringify(interactionsURL)}`);
const { PurchaseForm } = await import(componentURL(source));
const { RecordWorkspace } = await loadRecordWorkspace(() => router);
const { createRoot } = await import("react-dom/client");
const click = async element => act(async () => element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, detail: 0 })));
const key = async (element, value, shiftKey = false) => act(async () => element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: value, shiftKey })));
async function change(element, value) { await act(async () => { const prototype = element.tagName === "SELECT" ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, value); element.dispatchEvent(new Event("input", { bubbles: true })); element.dispatchEvent(new Event("change", { bubbles: true })); }); }
const dialog = () => document.querySelector("dialog");
const button = text => [...dialog().querySelectorAll("button")].find(b => b.textContent === text);
function Editor({ data, callbacks }) { return h(PurchaseForm, { data, ...callbacks }); }
async function mount(edit = false, received = false, options = {}) {
  refreshes = confirmations = quoteCalls = 0; discard = true; writes = []; receiptPromise = null;
  const id = randomUUID(), lineId = randomUUID();
  saveResult = { status: "saved", id, message: "Saved fixture" };
  data = { id, date: "2026-11-12", branches: [{ id: branchId, label: "Fixture branch" }], documentReady: options.documentReady ?? false };
  if (edit) data.purchase = {
    input: { id, revision: 1, supplierId, branchId, date: data.date, reference: "", notes: "", lines: [{ id: lineId, productId, baseUnitCode: "UNIT", quantity: "10", unitCost: "100000.01" }] },
    code: "CP000001", status: received ? "RECEIVED" : "DRAFT", total: "1000000.10", supplier: "Fixture supplier", branch: "Fixture branch", creator: "Fixture user", receiver: received ? "Fixture receiver" : null, createdAt: "2026-11-12T12:00:00Z", receivedAt: received ? "2026-11-12T13:00:00Z" : null,
    lines: [{ id: lineId, productId, sku: "SKU", name: "Fixture product", unit: "UNIT", quantity: "10", unitCost: "100000.01", subtotal: "1000000.10", movementId: received ? randomUUID() : null }],
  };
  root = createRoot(document.getElementById("root"));
  await act(async () => root.render(h("main", null, h(RecordWorkspace, { createTitle: "Nueva compra", editTitle: "Detalle de compra", description: "Recepción", loadEditor: async () => ({ status: "ok", data }), Editor }, h("a", { href: edit ? `/panel/compras/${id}` : "/panel/compras/nueva", "data-record-editor": edit ? id : "" }, "Abrir compra"), h("div", { className: "milo-catalog-table-wrap" }, "List")))));
  const trigger = document.querySelector("[data-record-editor]"); trigger.focus(); await click(trigger); return trigger;
}
afterEach(async () => { if (root) await act(async () => root.unmount()); root = null; });
test("purchase modal preserves list, focus and keyboard trap with footer outside scrolling body", async () => {
  const trigger = await mount(true);
  assert.equal(dialog().open, true); assert.equal(dialog().querySelector("footer").closest(".milo-record-editor-body"), null);
  const first = dialog().querySelector('[aria-label="Cerrar formulario"]'); first.focus(); await key(first, "Tab", true); assert.equal(document.activeElement, button("Guardar borrador"));
  await key(document.activeElement, "Tab"); assert.equal(document.activeElement, first);
  await key(first, "Escape"); assert.equal(dialog().open, false); assert.equal(document.activeElement, trigger); assert.equal(confirmations, 0);
  assert.equal(window.location.search, "?q=fixture&status=DRAFT&branch=branch&page=2");
});
test("purchase draft search, localized money and save preserve page and scroll", async () => {
  const trigger = await mount(); const main = document.querySelector("main"), table = document.querySelector(".milo-catalog-table-wrap");
  await key(dialog().querySelector("button"), "Escape"); main.scrollTop = 90; table.scrollTop = 65; table.scrollLeft = 30; await click(trigger);
  const searches = dialog().querySelectorAll(".milo-purchase-lookup"); await click(searches[0].querySelector("button")); await change(searches[0].querySelector("select"), supplierId);
  await change(dialog().querySelector('select[id$="-branch"]'), branchId);
  await click(searches[1].querySelector("button")); await change(searches[1].querySelector("select"), productId);
  await change(dialog().querySelector('[aria-label="Cantidad del renglón 1"]'), "10");
  const cost = dialog().querySelector('[aria-label="Costo unitario ARS del renglón 1"]'); await change(cost, "100.000,01");
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 300)); }); assert.match(dialog().querySelector("footer").textContent, /1\.000\.000,10/);
  discard = false; await key(cost, "Escape"); assert.equal(dialog().open, true); assert.equal(confirmations, 1);
  await click(button("Guardar borrador")); assert.equal(writes.length, 1); assert.equal(writes[0].input.lines[0].unitCost, "100000.01"); assert.equal(writes[0].input.lines[0].quantity, "10");
  assert.equal(dialog().open, false); assert.equal(refreshes, 1); assert.equal(main.scrollTop, 90); assert.equal(table.scrollTop, 65); assert.equal(table.scrollLeft, 30); assert.equal(document.activeElement, trigger);
});
test("receipt requires explicit confirmation; dirty or pending forms cannot receive or close", async () => {
  await mount(true); assert.equal(button("Confirmar recepción").disabled, true);
  const quantity = dialog().querySelector('[aria-label="Cantidad del renglón 1"]'); await change(quantity, "11"); assert.equal(dialog().querySelector('[data-purchase-receipt]').disabled, true); assert.equal(button("Confirmar recepción").disabled, true);
  await change(quantity, "10"); await click(dialog().querySelector('[data-purchase-receipt]')); assert.equal(button("Confirmar recepción").disabled, false);
  let finish; receiptPromise = new Promise(resolve => { finish = resolve; }); await click(button("Confirmar recepción")); assert.equal(writes.length, 1); assert.equal(writes[0].input.confirmation, "RECEIVE"); assert.ok(writes[0].input.operationId);
  await key(dialog().querySelector("button"), "Escape"); assert.equal(dialog().open, true); await click(button("Confirmar recepción")); assert.equal(writes.length, 1);
  await act(async () => finish(saveResult)); assert.equal(dialog().open, false); assert.equal(refreshes, 1);
});
test("purchase conflict preserves values and never retries or closes", async () => {
  await mount(true); saveResult = { status: "conflict", message: "Stale purchase" }; await change(dialog().querySelector('[aria-label="Cantidad del renglón 1"]'), "12"); await click(button("Guardar borrador"));
  assert.equal(dialog().open, true); assert.equal(refreshes, 0); assert.equal(writes.length, 1); assert.equal(dialog().querySelector('[aria-label="Cantidad del renglón 1"]').value, "12"); assert.equal(button("Guardar borrador").disabled, true); assert.match(dialog().querySelector('[role="alert"]').textContent, /Stale purchase/);
});
test("received purchase is read-only, shows historical costs and linked movement", async () => {
  await mount(true, true); assert.equal(button("Guardar borrador"), undefined); assert.equal(button("Confirmar recepción"), undefined); assert.equal(dialog().querySelector("fieldset fieldset").disabled, true);
  assert.match(dialog().textContent, /100\.000,01/); assert.match(dialog().textContent, /Fixture receiver/); assert.match(dialog().querySelector('a[href*="/panel/inventario/"]').href, new RegExp(productId));
  assert.equal(writes.length, 0); await click(button("Cerrar")); assert.equal(dialog().open, false);
});

test("document metadata stays blocked before migration, V1 remains usable and F3/F5 focus searches", async () => {
  await mount(true);
  assert.equal(dialog().querySelector('.milo-purchase-document').disabled, true);
  assert.match(dialog().textContent, /migración adicional pendiente/);
  assert.equal(button("Guardar borrador").disabled, false);
  const quantity = dialog().querySelector('[aria-label="Cantidad del renglón 1"]');
  await key(quantity, "F3"); assert.equal(document.activeElement, dialog().querySelector('[data-lookup="suppliers"] input'));
  await key(document.activeElement, "F5"); assert.equal(document.activeElement, dialog().querySelector('[data-lookup="products"] input'));
  assert.equal(writes.length, 0);
});

test("document entry preserves leading zeroes and sends localized manual IVA as canonical exact money", async () => {
  await mount(true, false, { documentReady: true });
  await change(dialog().querySelector('[id$="-document-type"]'), "FA");
  await change(dialog().querySelector('[id$="-pos"]'), "00001");
  await change(dialog().querySelector('[id$="-document-number"]'), "00000042");
  await change(dialog().querySelector('[id$="-category"]'), "Mercadería");
  await click(dialog().querySelector('.milo-purchase-document input[type="checkbox"]'));
  const iva = dialog().querySelector('[id$="-iva"]'); assert.equal(iva.value, "");
  await change(iva, "210.000,00");
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
  assert.match(dialog().textContent, /Neto ARS: 1\.000\.000,10/);
  assert.match(dialog().querySelector("footer").textContent, /Total ARS: 1\.210\.000,10/);
  await click(button("Guardar borrador")); assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].input.document, { type: "FA", pointOfSale: "00001", number: "00000042", category: "Mercadería", taxAmount: "210000.00" });
  assert.equal(writes[0].input.lines[0].unitCost, "100000.01");
});

test("discarding IVA requires confirmation and never changes line costs", async () => {
  await mount(true, false, { documentReady: true });
  const toggle = dialog().querySelector('.milo-purchase-document input[type="checkbox"]'); await click(toggle);
  await change(dialog().querySelector('[id$="-iva"]'), "210.000,00");
  discard = false; await click(toggle); assert.equal(toggle.checked, true); assert.equal(dialog().querySelector('[id$="-iva"]').value, "210.000,00");
  discard = true; await click(toggle); assert.equal(toggle.checked, false); assert.equal(dialog().querySelector('[id$="-iva"]'), null);
  assert.equal(dialog().querySelector('[aria-label="Costo unitario ARS del renglón 1"]').value, "100.000,01");
  assert.equal(writes.length, 0);
});

test("purchase tabs preserve values, reveal shortcut targets and estimate edits without server requests", async () => {
  await mount(true, false, { documentReady: true });
  const tabs = [...dialog().querySelectorAll('[role="tab"]')];
  assert.deepEqual(tabs.map(tab => tab.textContent), ["Datos de la compra", "Artículos", "Observaciones"]);
  await key(tabs[0], "ArrowRight");
  assert.equal(tabs[1].getAttribute("aria-selected"), "true");
  const quantity = dialog().querySelector('[aria-label="Cantidad del renglón 1"]');
  await change(quantity, "11");
  assert.match(dialog().querySelector("footer").textContent, /1\.100\.000,11/);
  const cost = dialog().querySelector('[aria-label="Costo unitario ARS del renglón 1"]');
  await change(cost, ""); assert.match(dialog().querySelector("footer").textContent, /Total ARS: —/);
  await change(cost, "0,00"); assert.match(dialog().querySelector("footer").textContent, /Total ARS: 0,00/);
  await click(tabs[2]);
  const notes = dialog().querySelector('textarea[id$="-notes"]');
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, "value").set.call(notes, "Conservar notas");
    notes.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await key(notes, "F3");
  assert.equal(tabs[0].getAttribute("aria-selected"), "true");
  assert.equal(document.activeElement, dialog().querySelector('[data-lookup="suppliers"] input'));
  await key(document.activeElement, "F5");
  assert.equal(tabs[1].getAttribute("aria-selected"), "true");
  assert.equal(quantity.value, "11");
  assert.equal(cost.value, "0,00");
  assert.equal(notes.value, "Conservar notas");
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 300)); });
  assert.equal(quoteCalls, 0);
  assert.equal(writes.length, 0);
});
