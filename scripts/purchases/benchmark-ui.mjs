import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { JSDOM } from "jsdom";
import { act, Profiler, createElement as h } from "react";
import { componentURL, loadRecordWorkspace, recordEditorURL } from "../../tests/record-editor-loader.mjs";
const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "http://localhost/panel/compras?q=fixture&status=DRAFT&branch=branch&page=2", pretendToBeVisual: true });
for (const key of ["window", "document", "Element", "HTMLElement", "HTMLDetailsElement", "HTMLDialogElement", "Event", "MouseEvent", "KeyboardEvent", "FormData"]) globalThis[key] = key === "window" ? dom.window : dom.window[key];
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; this.querySelector("button")?.focus(); };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
let discard = true, writes = [], saveResult, receiptPromise, data, root;
dom.window.confirm = () => { return discard; }; dom.window.history.back = () => {};
const router = { refresh() {}, replace() {}, push() {} };
const supplierId = randomUUID(), productId = randomUUID(), branchId = randomUUID();
let quoteRequests=0, commits=0, renderMs=0;
const dependencies = {
  Link: ({ children, ...props }) => h("a", props, children), useRouter: () => router,
  searchPurchaseChoices: async ({ kind }) => ({ status: "ok", data: kind === "suppliers" ? [{ id: supplierId, label: "Fixture supplier" }] : [{ id: productId, label: "SKU · Fixture product", unit: "UNIT" }] }),
  calculatePurchaseQuote: async input => (quoteRequests++,{ status: "ok", data: { total: input.document?.taxAmount === "210000.00" ? "1210000.10" : "1000000.10", net: "1000000.10", subtotals: ["1000000.10"] } }),
  savePurchaseDraft: async input => { writes.push({ kind: "draft", input }); return saveResult; },
  confirmPurchaseReceipt: async input => { writes.push({ kind: "receive", input }); return receiptPromise ?? saveResult; },
};
globalThis[Symbol.for("milo.purchase-ui-test")] = dependencies;
const moneyURL = componentURL(await readFile(new URL("../../lib/catalog/price-format.ts", import.meta.url), "utf8"));
const previewURL = componentURL(await readFile(new URL("../../lib/purchases/preview.ts", import.meta.url), "utf8"));
const interactionsURL = componentURL(await readFile(new URL("../../components/panel/editor-interactions.ts", import.meta.url), "utf8"));
let source = await readFile((process.env.MILO_BENCH_LABEL ?? "after") === "before" ? ".local/purchase-performance/purchase-form.tsx.before" : "components/panel/purchase-form.tsx", "utf8");
source=source.replace('import { calculatePurchaseQuote, confirmPurchaseReceipt, savePurchaseDraft, searchPurchaseChoices } from "@/app/panel/compras/actions";','const {calculatePurchaseQuote,confirmPurchaseReceipt,savePurchaseDraft,searchPurchaseChoices}=globalThis[Symbol.for("milo.purchase-ui-test")];');
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
async function change(element, value) { await act(async () => { const prototype = element.tagName === "SELECT" ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, value); element.dispatchEvent(new Event("input", { bubbles: true })); element.dispatchEvent(new Event("change", { bubbles: true })); }); }
const dialog = () => document.querySelector("dialog");
function Editor({ data, callbacks }) { return h(Profiler, {id:"purchase",onRender(_id,_phase,duration){commits++;renderMs+=duration;}},h(PurchaseForm, { data, ...callbacks })); }
async function mount(edit = false, received = false, options = {}) {
  discard = true; writes = []; receiptPromise = null;
  const id = randomUUID(), lineId = randomUUID();
  saveResult = { status: "saved", id, message: "Saved fixture" };
  data = { id, date: "2026-11-12", branches: [{ id: branchId, label: "Fixture branch" }], documentReady: options.documentReady ?? false };
  if (edit) data.purchase = {
    input: { id, revision: 1, supplierId, branchId, date: data.date, reference: "", notes: "", lines: [{ id: lineId, productId, baseUnitCode: "UNIT", quantity: "10", unitCost: "100000.01" }] },
    code: "CP000001", status: received ? "RECEIVED" : "DRAFT", total: "1000000.10", supplier: "Fixture supplier", branch: "Fixture branch", creator: "Fixture user", receiver: received ? "Fixture receiver" : null, createdAt: "2026-11-12T12:00:00Z", receivedAt: received ? "2026-11-12T13:00:00Z" : null,
    lines: [{ id: lineId, productId, sku: "SKU", name: "Fixture product", unit: "UNIT", quantity: "10", unitCost: "100000.01", subtotal: "1000000.10", movementId: received ? randomUUID() : null }],
  };
  if (edit) {const original=data.purchase;original.input.lines=Array.from({length:100},()=>({...original.input.lines[0],id:randomUUID()}));original.lines=original.input.lines.map(l=>({...original.lines[0],id:l.id}));original.total="100000010.00";}
  root = createRoot(document.getElementById("root"));
  await act(async () => root.render(h("main", null, h(RecordWorkspace, { createTitle: "Nueva compra", editTitle: "Detalle de compra", description: "Recepción", loadEditor: async () => ({ status: "ok", data }), Editor }, h("a", { href: edit ? `/panel/compras/${id}` : "/panel/compras/nueva", "data-record-editor": edit ? id : "" }, "Abrir compra"), h("div", { className: "milo-catalog-table-wrap" }, "List")))));
  const trigger = document.querySelector("[data-record-editor]"); trigger.focus(); await click(trigger); return trigger;
}

const {mkdir}=await import('node:fs/promises'); await mkdir('.local/purchase-performance',{recursive:true});
const metrics={};
try{
 let start=performance.now();await mount(true,false,{documentReady:true});metrics.openDetail100Lines={ms:+(performance.now()-start).toFixed(2),commits,reactRenderMs:+renderMs.toFixed(2)};
 const articles=[...dialog().querySelectorAll('[role="tab"]')].find(e=>e.textContent==='Art\u00edculos');if(articles)await click(articles);
 let cost=dialog().querySelector('[aria-label="Costo unitario ARS del rengl\u00f3n 1"]');
 await act(async()=>{await new Promise(r=>setTimeout(r,300));});quoteRequests=commits=renderMs=0;
 async function settleQuote(previous){await act(async()=>{const limit=performance.now()+3000;while(quoteRequests<=previous){if(performance.now()>limit)throw Error('Quote timeout');await new Promise(r=>setTimeout(r,5));}});}
 const values=[];
 for(let i=0;i<8;i++){const previous=quoteRequests;start=performance.now();await change(cost,i%2?'100.000,01':'200.000,02');if(process.env.MILO_BENCH_LABEL==='before')await settleQuote(previous);values.push(performance.now()-start);}
 values.sort((a,b)=>a-b);metrics.costChange100Lines={medianMs:+values[4].toFixed(2),quoteRequests,commits,reactRenderMs:+renderMs.toFixed(2)};
 const previous=quoteRequests; const quantity=dialog().querySelector('[aria-label="Cantidad del rengl\u00f3n 1"]');start=performance.now();await change(quantity,'11');if(process.env.MILO_BENCH_LABEL==='before')await settleQuote(previous);metrics.quantityChange100Lines={ms:+(performance.now()-start).toFixed(2)};
 const suppliers=dialog().querySelector('[data-lookup="suppliers"]');const tab=[...dialog().querySelectorAll('[role="tab"]')].find(e=>e.textContent==='Datos de la compra');if(tab)await click(tab);
 start=performance.now();await click(suppliers.querySelector('button'));await change(suppliers.querySelector('select'),supplierId);metrics.supplierSearchAndSelect={ms:+(performance.now()-start).toFixed(2),note:'mock server response; React and event work only'};
 // Remove one line so a selected product can be added to the 100-line fixture.
 if(articles)await click(articles);await click(dialog().querySelector('[aria-label="Quitar rengl\u00f3n 100"]'));
 const products=dialog().querySelector('[data-lookup="products"]');start=performance.now();await click(products.querySelector('button'));await change(products.querySelector('select'),productId);metrics.productSearchAndAdd={ms:+(performance.now()-start).toFixed(2),note:'mock server response; React and event work only'};
 console.log(JSON.stringify({label:process.env.MILO_BENCH_LABEL,metrics},null,2));
 const {writeFile}=await import('node:fs/promises');await writeFile('.local/purchase-performance/ui-'+process.env.MILO_BENCH_LABEL+'.json',JSON.stringify(metrics,null,2));
}finally{if(root)await act(async()=>root.unmount());dom.window.close();}
