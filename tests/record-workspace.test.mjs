import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { act, createElement as h, createRef, StrictMode, useId, useState } from "react";
import { componentURL, loadRecordWorkspace, recordEditorURL } from "./record-editor-loader.mjs";
import { TableEditAction } from "./table-edit-action-loader.mjs";

const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "http://localhost/panel/marcas?q=Memory&page=2", pretendToBeVisual: true });
for (const name of ["window", "document", "Element", "HTMLElement", "HTMLDetailsElement", "HTMLDialogElement", "Event", "MouseEvent", "KeyboardEvent", "FormData"]) globalThis[name] = name === "window" ? dom.window : dom.window[name];
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// jsdom has no native top layer. Only that browser boundary is stubbed: real
// React components, events, focus, tabs and dirty/pending behavior run below.
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; this.querySelector("button")?.focus(); };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
let back = 0, refresh = 0, confirmations = 0, discard = true;
dom.window.history.back = () => { back++; };
dom.window.history.forward = () => {};
dom.window.confirm = () => { confirmations++; return discard; };
const router = { refresh: () => { refresh++; }, replace() {} };
const { RecordWorkspace } = await loadRecordWorkspace(() => router);
const { RecordEditor, EditorTabs, EditorTabPanel, EditorFooter } = await import(recordEditorURL);
const { createRoot } = await import("react-dom/client");
let writes = [], saveStatus = "saved";
const action = operation => async (_previous, data) => { writes.push({ operation, fields: Object.fromEntries(data) }); return { status: saveStatus, id: "memory-id", message: saveStatus === "saved" ? "Guardado." : "El registro cambió." }; };
globalThis[Symbol.for("milo.taxonomy-form-test")] = {
  useRouter: () => router,
  createCategory: action("createCategory"), updateCategory: action("updateCategory"),
  createBrand: action("createBrand"), updateBrand: action("updateBrand"),
};
let formSource = await readFile(new URL("../components/panel/catalog-forms.tsx", import.meta.url), "utf8");
for (const declaration of [
  'import { useRouter } from "next/navigation";',
  'import { createCategory, updateCategory } from "@/app/panel/categorias/actions";',
  'import { createBrand, updateBrand } from "@/app/panel/marcas/actions";',
  'export { ProductForm } from "./product-form";',
]) { assert.ok(formSource.includes(declaration)); formSource = formSource.replace(declaration, ""); }
formSource = 'const { useRouter, createCategory, updateCategory, createBrand, updateBrand } = globalThis[Symbol.for("milo.taxonomy-form-test")];\n' + formSource.replace('from "./record-editor"', `from ${JSON.stringify(recordEditorURL)}`);
const { CategoryForm } = await import(componentURL(formSource));
let customerSource = await readFile(new URL("../components/panel/customer-form.tsx", import.meta.url), "utf8");
globalThis[Symbol.for("milo.customer-form-test")] = { useRouter: () => router, createCustomer: action("createCustomer"), updateCustomer: action("updateCustomer") };
const fieldsURL = componentURL(await readFile(new URL("../lib/customers/commercial-fields.ts", import.meta.url), "utf8"));
let commercialSource = await readFile(new URL("../components/panel/commercial-customer-form.tsx", import.meta.url), "utf8");
commercialSource = commercialSource.replace('import { useRouter } from "next/navigation";', 'const { useRouter } = globalThis[Symbol.for("milo.customer-form-test")];')
  .replace('import { createCustomer, updateCustomer } from "@/app/panel/clientes/actions";', 'const { createCustomer, updateCustomer } = globalThis[Symbol.for("milo.customer-form-test")];')
  .replace('from "./record-editor"', `from ${JSON.stringify(recordEditorURL)}`)
  .replace('from "@/lib/customers/commercial-fields"', `from ${JSON.stringify(fieldsURL)}`);
const commercialURL = componentURL(commercialSource);
customerSource = customerSource.replace('import { useRouter } from "next/navigation";', 'const { useRouter } = globalThis[Symbol.for("milo.customer-form-test")];')
  .replace('import { createCustomer, updateCustomer } from "@/app/panel/clientes/actions";', 'const { createCustomer, updateCustomer } = globalThis[Symbol.for("milo.customer-form-test")];')
  .replace('from "./record-editor"', `from ${JSON.stringify(recordEditorURL)}`);
const { CustomerForm } = await import(componentURL(customerSource.replace('from "./commercial-customer-form"', `from ${JSON.stringify(commercialURL)}`)));
function ActualCustomer({ data, callbacks }) { return h(CustomerForm, { customer: data.customer, schemaReady: data.schemaReady, ...callbacks }); }
globalThis[Symbol.for("milo.supplier-form-test")] = { useRouter: () => router, createSupplier: action("createSupplier"), updateSupplier: action("updateSupplier") };
const supplierFieldsURL=componentURL((await readFile(new URL("../lib/suppliers/fields.ts",import.meta.url),"utf8")).replace('from "../customers/commercial-fields"',`from ${JSON.stringify(fieldsURL)}`));
const {emptySupplierFields}=await import(supplierFieldsURL);
let supplierSource=await readFile(new URL("../components/panel/supplier-form.tsx",import.meta.url),"utf8");
supplierSource=supplierSource.replace('import { useRouter } from "next/navigation";','const {useRouter}=globalThis[Symbol.for("milo.supplier-form-test")];')
  .replace('import { createSupplier, updateSupplier } from "@/app/panel/proveedores/actions";','const {createSupplier,updateSupplier}=globalThis[Symbol.for("milo.supplier-form-test")];')
  .replace('from "@/lib/suppliers/fields"',`from ${JSON.stringify(supplierFieldsURL)}`).replace('from "./record-editor"',`from ${JSON.stringify(recordEditorURL)}`);
const {SupplierForm}=await import(componentURL(supplierSource));
function ActualSupplier({data,callbacks}){return h(SupplierForm,{supplier:data.supplier,...callbacks});}
function ActualBrand({ data, callbacks }) { return h(CategoryForm, { category: data.record, kind: "brand", ...callbacks }); }
function ActualCategory({ data, callbacks }) { return h(CategoryForm, { category: data.record, ...callbacks }); }
let root, controls, loaded;

function TestForm({ callbacks }) {
  controls = callbacks;
  const id = useId();
  const [tab, setTab] = useState("data");
  return h(RecordEditor, {
    tabs: h(EditorTabs, { id, items: [["data", "Datos"], ["other", "Otra sección"]], value: tab, onChange: setTab }),
    footer: h(EditorFooter, { formId: id, pending: false, onCancel: callbacks.onCancel }),
  }, h("form", { id, onSubmit: event => { event.preventDefault(); callbacks.onSaved("Guardado."); } },
    h(EditorTabPanel, { id, tab: "data", active: tab }, h("label", null, "Nombre", h("input", { name: "name", autoFocus: true, defaultValue: "Memory" }))),
    h(EditorTabPanel, { id, tab: "other", active: tab }, h("button", { type: "button" }, "Acción adicional"))));
}

function Harness({ revision = 0, Editor = TestForm, path = "/panel/marcas", initialCreate = false, controllerRef, onModeChange, returnPath, loader = async id => { loaded.push(id); return { status: "ok", data: {} }; } }) {
  return h("main", null, h(RecordWorkspace, { createTitle: "Nueva marca", editTitle: "Editar marca", description: "Datos de la empresa", loadEditor: loader, Editor, initialCreate, controllerRef, onModeChange, returnPath },
    h("a", { href: path + (["/panel/clientes","/panel/proveedores"].includes(path) ? "/nuevo" : "/nueva"), "data-record-editor": "" }, "Nuevo registro"),
    h("div", { className: "milo-catalog-table-wrap", "data-revision": revision }, h(TableEditAction, { href: path + "/memory-id", label: "Memory", recordId: "memory-id" }))));
}
async function mount(props) {
  back = refresh = confirmations = 0; discard = true; loaded = []; controls = null; writes = []; saveStatus = "saved";
  dom.window.history.replaceState({}, "", (props?.path ?? "/panel/marcas") + "?q=Memory&page=2");
  root = createRoot(document.getElementById("root"));
  await act(async () => root.render(props?.strict ? h(StrictMode, null, h(Harness, props)) : h(Harness, props)));
}
const click = async element => act(async () => element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, detail: 0 })));
const key = async (element, value, shiftKey = false) => act(async () => element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: value, shiftKey })));
async function change(input) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set.call(input, "Memory edited");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
const dialog = () => document.querySelector("dialog");
const buttons = () => [...dialog().querySelectorAll("footer button")];

test("menu controller uses the same guarded modal and direct close returns to consultation with query intact", async () => {
  const controller = createRef(), modes = [];
  await mount({ path: "/panel/compras/ingresar", controllerRef: controller, onModeChange: mode => modes.push(mode), returnPath: "/panel/compras" });
  const main = document.querySelector("main"), table = document.querySelector(".milo-catalog-table-wrap");
  main.scrollTop = 90; table.scrollTop = 45; table.scrollLeft = 25;
  await act(async () => controller.current.openCreate());
  assert.equal(dialog().open, true); assert.deepEqual(loaded, [null]);
  await act(async () => controller.current.openCreate());
  assert.deepEqual(loaded, [null], "Repeated menu activation must not replace an open form");
  await change(dialog().querySelector("input")); discard = false;
  await act(async () => controller.current.close()); assert.equal(dialog().open, true);
  discard = true; await act(async () => controller.current.close());
  assert.equal(dialog().open, false);
  await act(async () => window.dispatchEvent(new dom.window.PopStateEvent("popstate", { state: {} })));
  assert.equal(window.location.pathname, "/panel/compras");
  assert.equal(window.location.search, "?q=Memory&page=2");
  assert.equal(main.scrollTop, 90); assert.equal(table.scrollTop, 45); assert.equal(table.scrollLeft, 25);
  assert.deepEqual(modes, ["create", "closed"]);
  main.scrollTop = 120;
  await act(async () => controller.current.close());
  assert.equal(main.scrollTop, 120, "Consultation is a no-op when already closed");
  assert.deepEqual(modes, ["create", "closed"]);
});

test("direct create opens the shared dialog once in StrictMode and refresh cannot reopen a saved form", async () => {
  const props = { path: "/panel/compras/ingresar", initialCreate: true, strict: true };
  await mount(props);
  assert.equal(dialog().open, true);
  assert.deepEqual(loaded, [null]);
  await act(async () => controls.onSaved("Guardado."));
  assert.equal(dialog().open, false);
  await act(async () => root.render(h(StrictMode, null, h(Harness, { ...props, revision: 1 }))));
  assert.equal(dialog().open, false);
  assert.deepEqual(loaded, [null]);
  assert.equal(window.location.pathname, "/panel/compras/ingresar");
  assert.equal(window.location.search, "?q=Memory&page=2");
});

test("Supplier real form keeps all fields visible, read-only code, dirty guard, fixed footer and list state",async()=>{
  await mount({path:"/panel/proveedores",Editor:ActualSupplier});
  const main=document.querySelector("main"),table=document.querySelector(".milo-catalog-table-wrap");main.scrollTop=100;table.scrollTop=60;table.scrollLeft=25;
  const trigger=document.querySelector("[data-record-editor]");trigger.focus();await click(trigger);assert.equal(document.activeElement.name,"legalName");
  await change(document.activeElement);
  assert.equal(dialog().querySelector('[role="tablist"]'),null);
  const code=dialog().querySelector('[data-field="code"] input');assert.equal(code.readOnly,true);assert.equal(code.name,"");assert.equal(code.value,"Asignado al guardar");
  for(const field of Object.keys(emptySupplierFields())){const input=dialog().querySelector(`[name="${field}"]`);assert.ok(input);assert.equal(input.closest('[hidden]'),null);assert.ok(dialog().querySelector(`label[for="${input.id}"]`));}
  const notes=dialog().querySelector('[name="internalNotes"]');await act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype,"value").set.call(notes,"Supplier internal notes");notes.dispatchEvent(new Event("input",{bubbles:true}));notes.dispatchEvent(new Event("change",{bubbles:true}));});
  discard=false;await key(notes,"Escape");assert.equal(dialog().open,true);assert.equal(confirmations,1);assert.equal(dialog().querySelector("footer").closest(".milo-record-editor-body"),null);
  await click(buttons().at(-1));assert.equal(dialog().open,false);assert.equal(refresh,1);assert.equal(writes[0].operation,"createSupplier");assert.equal(writes[0].fields.internalNotes,"Supplier internal notes");assert.deepEqual(Object.keys(writes[0].fields).sort(),Object.keys(emptySupplierFields()).sort());
  assert.equal(window.location.pathname,"/panel/proveedores");assert.equal(window.location.search,"?q=Memory&page=2");assert.equal(main.scrollTop,100);assert.equal(table.scrollTop,60);assert.equal(table.scrollLeft,25);assert.equal(document.activeElement,trigger);
  await act(async()=>root.unmount());root=null;
  const supplier={id:"memory-id",version:"2026-11-11T00:00:00.000Z",commercialCode:"P000042",name:"Memory",details:{...emptySupplierFields(),commercialName:"Memory",contactName:"Contact",cuit:"20987654327"}};
  await mount({path:"/panel/proveedores",Editor:ActualSupplier,loader:async()=>({status:"ok",data:{supplier}})});await click(document.querySelectorAll("[data-record-editor]")[1]);assert.equal(dialog().querySelector('[name="commercialName"]').value,"Memory");assert.equal(dialog().querySelector('[name="cuit"]').value,supplier.details.cuit);
  await change(dialog().querySelector('[name="contactName"]'));saveStatus="conflict";await click(buttons().at(-1));assert.equal(dialog().open,true);assert.equal(refresh,0);assert.equal(buttons().at(-1).disabled,true);assert.equal(writes[0].operation,"updateSupplier");assert.equal(writes[0].fields.version,supplier.version);assert.equal(dialog().querySelector('[name="contactName"]').value,"Memory edited");
});

test("Supplier delete uses shared accessible confirmation and refreshes only after success",async()=>{
  await mount();let deletes=0,result="invalid";
  globalThis[Symbol.for("milo.supplier-delete-test")]={action:async data=>{deletes++;assert.equal(data.get("confirmation"),"DELETE");return{status:result,message:result==="saved"?"Deleted supplier":"Protected supplier"};},useRecordListRefresh:()=>()=>{refresh++;}};
  const shared=componentURL((await readFile(new URL("../components/panel/record-delete-action.tsx",import.meta.url),"utf8")).replace('import { useRecordListRefresh } from "./record-workspace";','const {useRecordListRefresh}=globalThis[Symbol.for("milo.supplier-delete-test")];'));
  const source=(await readFile(new URL("../components/panel/supplier-delete-action.tsx",import.meta.url),"utf8")).replace('import { deleteSupplierRecord } from "@/app/panel/proveedores/actions";','const {action:deleteSupplierRecord}=globalThis[Symbol.for("milo.supplier-delete-test")];').replace('from "./record-delete-action"',`from ${JSON.stringify(shared)}`);
  const {SupplierDeleteAction}=await import(componentURL(source));await act(async()=>root.render(h(SupplierDeleteAction,{id:"memory-id",version:"memory-version",label:"Memory supplier"})));
  const button=document.querySelector("button");assert.equal(button.getAttribute("aria-label"),"Eliminar Memory supplier");button.focus();assert.equal(document.activeElement,button);discard=false;await click(button);assert.equal(deletes,0);discard=true;await click(button);assert.equal(document.querySelector('[role="alert"]').textContent,"Protected supplier");assert.equal(refresh,0);result="saved";await click(button);assert.equal(refresh,1);
});

test("expanded Customer modal keeps all three tab values, keyboard tabs, dirty Escape and fixed footer save", async () => {
  await mount({ path: "/panel/clientes", Editor: ActualCustomer, loader: async () => ({ status: "ok", data: { schemaReady: true } }) });
  const trigger=document.querySelector("[data-record-editor]");await click(trigger);
  assert.equal(document.activeElement.name,"legalName");
  await change(document.activeElement);
  const tabs=[...dialog().querySelectorAll('[role="tab"]')];assert.deepEqual(tabs.map(t=>t.textContent),["Datos","Datos comerciales","Observaciones"]);
  await key(tabs[0],"ArrowRight");assert.equal(document.activeElement,tabs[1]);
  assert.equal(tabs[1].getAttribute("aria-selected"),"true");
  assert.equal(dialog().querySelector('[name="documentNumber"]').closest('[role="tabpanel"]').hidden,false);
  await key(tabs[1],"End");assert.equal(document.activeElement,tabs[2]);
  const notes=dialog().querySelector('[name="internalNotes"]');
  await act(async()=>{ Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype,"value").set.call(notes,"Internal fixture notes");notes.dispatchEvent(new Event("input",{bubbles:true}));notes.dispatchEvent(new Event("change",{bubbles:true})); });
  discard=false;await key(notes,"Escape");assert.equal(dialog().open,true);assert.equal(confirmations,1);
  assert.equal(dialog().querySelector("footer").closest(".milo-record-editor-body"),null);
  await click(buttons().at(-1));assert.equal(dialog().open,false);assert.equal(refresh,1);
  assert.equal(writes[0].fields.profileMode,"extended");assert.equal(writes[0].fields.legalName,"Memory edited");assert.equal(writes[0].fields.internalNotes,"Internal fixture notes");
  assert.equal(window.location.search,"?q=Memory&page=2");
});

test("Customer delete requires explicit confirmation, reports protected history and refreshes only after success", async()=>{
  await mount();
  let deletes=0,result="invalid";
  globalThis[Symbol.for("milo.customer-delete-test")]={
    deleteCustomerRecord:async data=>{deletes++;assert.equal(data.get("confirmation"),"DELETE");assert.equal(data.get("version"),"fixture-version");return {status:result,message:result==="saved"?"Deleted fixture":"Protected history"};},
    useRecordListRefresh:()=>()=>{refresh++;},
  };
  let source=await readFile(new URL("../components/panel/customer-delete-action.tsx",import.meta.url),"utf8");
  const deleteSource=(await readFile(new URL("../components/panel/record-delete-action.tsx",import.meta.url),"utf8")).replace('import { useRecordListRefresh } from "./record-workspace";','const { useRecordListRefresh } = globalThis[Symbol.for("milo.customer-delete-test")];');
  source=source.replace('import { deleteCustomerRecord } from "@/app/panel/clientes/actions";','const { deleteCustomerRecord } = globalThis[Symbol.for("milo.customer-delete-test")];')
    .replace('from "./record-delete-action"',`from ${JSON.stringify(componentURL(deleteSource))}`);
  const {CustomerDeleteAction}=await import(componentURL(source));
  await act(async()=>root.render(h(CustomerDeleteAction,{id:"fixture-id",version:"fixture-version",label:"Fixture"})));
  const button=document.querySelector("button");assert.equal(button.title,"Eliminar");assert.equal(button.getAttribute("aria-label"),"Eliminar Fixture");button.focus();assert.equal(document.activeElement,button);
  discard=false;await click(button);assert.equal(deletes,0);
  discard=true;await click(button);assert.equal(deletes,1);assert.equal(refresh,0);assert.equal(document.querySelector('[role="alert"]').textContent,"Protected history");
  result="saved";await click(button);assert.equal(deletes,2);assert.equal(refresh,1);
});
afterEach(async () => { if (root) await act(async () => root.unmount()); root = null; });

test("keyboard-activated create/edit links open the shared dialog without replacing list URL and return focus on close", async () => {
  await mount();
  const trigger = document.querySelector("[data-record-editor]"); trigger.focus();
  await click(trigger);
  assert.equal(dialog().open, true);
  assert.deepEqual(loaded, [null]);
  assert.equal(dialog().querySelector("h2").textContent, "Nueva marca");
  assert.equal(document.activeElement, dialog().querySelector("input"));
  assert.equal(window.location.search, "?q=Memory&page=2");
  await key(document.activeElement, "Escape");
  assert.equal(dialog().open, false); assert.equal(document.activeElement, trigger); assert.equal(confirmations, 0);
  await click(document.querySelectorAll("[data-record-editor]")[1].querySelector("path"));
  assert.equal(dialog().querySelector("h2").textContent, "Editar marca");
  assert.deepEqual(loaded, [null, "memory-id"]);
  await click(dialog().querySelector('[aria-label="Cerrar formulario"]'));
  assert.equal(dialog().open, false); assert.equal(back, 2);
});

test("Tab/Shift+Tab stay in the dialog and optional tabs support arrows, Home and End", async () => {
  await mount(); await click(document.querySelector("[data-record-editor]"));
  const close = dialog().querySelector('[aria-label="Cerrar formulario"]');
  const save = buttons().at(-1); save.focus(); await key(save, "Tab"); assert.equal(document.activeElement, close);
  await key(close, "Tab", true); assert.equal(document.activeElement, save);
  const tabs = [...dialog().querySelectorAll('[role="tab"]')]; tabs[0].focus();
  await key(tabs[0], "ArrowRight"); assert.equal(document.activeElement, tabs[1]); assert.equal(tabs[1].getAttribute("aria-selected"), "true");
  assert.equal(dialog().querySelector('[data-tab="data"]').hidden, true);
  await key(tabs[1], "Home"); assert.equal(document.activeElement, tabs[0]);
  await key(tabs[0], "End"); assert.equal(document.activeElement, tabs[1]);
  await key(tabs[1], "ArrowLeft"); assert.equal(document.activeElement, tabs[0]);
});

test("Escape, Cancel, reload and browser Back protect unsaved changes; refusing keeps focus and data", async () => {
  await mount(); await click(document.querySelector("[data-record-editor]"));
  const input = dialog().querySelector("input"); await change(input); discard = false;
  await key(input, "Escape"); assert.equal(dialog().open, true); assert.equal(confirmations, 1); assert.equal(input.value, "Memory edited");
  await click(buttons()[0]); assert.equal(dialog().open, true); assert.equal(confirmations, 2);
  const unload = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(unload); assert.equal(unload.defaultPrevented, true);
  await act(async () => window.dispatchEvent(new window.PopStateEvent("popstate", { state: {} })));
  assert.equal(dialog().open, true); assert.equal(confirmations, 3);
  discard = true; await key(input, "Escape"); assert.equal(dialog().open, false);
});

test("pending writes block dismissal; success closes and refreshes the same list while restoring scroll", async () => {
  await mount(); const main = document.querySelector("main"), table = document.querySelector(".milo-catalog-table-wrap");
  main.scrollTop = 140; table.scrollTop = 80; table.scrollLeft = 20;
  await click(document.querySelector("[data-record-editor]"));
  await act(async () => controls.onPendingChange(true));
  assert.equal(dialog().querySelector('[aria-label="Cerrar formulario"]').disabled, true);
  await key(dialog(), "Escape"); assert.equal(dialog().open, true); assert.equal(confirmations, 0);
  main.scrollTop = table.scrollTop = table.scrollLeft = 0;
  await act(async () => { controls.onPendingChange(false); controls.onSaved("Guardado."); });
  assert.equal(dialog().open, false); assert.equal(refresh, 1);
  main.scrollTop = table.scrollTop = table.scrollLeft = 0;
  await act(async () => root.render(h(Harness, { revision: 1 })));
  assert.equal(main.scrollTop, 140); assert.equal(table.scrollTop, 80); assert.equal(table.scrollLeft, 20);
  assert.equal(window.location.search, "?q=Memory&page=2");
});

test("closing during loading ignores stale responses; denied reads never render the form", async () => {
  let resolve;
  await mount({ loader: () => new Promise(done => { resolve = done; }) });
  await click(document.querySelector("[data-record-editor]"));
  await key(dialog(), "Escape");
  await act(async () => resolve({ status: "ok", data: {} }));
  assert.equal(dialog().open, false); assert.equal(dialog().querySelector("input"), null);
  await act(async () => root.render(h(Harness, { loader: async () => ({ status: "forbidden" }) })));
  await click(document.querySelector("[data-record-editor]"));
  assert.match(dialog().querySelector('[role="alert"]').textContent, /acceso/);
  assert.equal(dialog().querySelector("input"), null);
});

test("real brand/category forms use the existing actions, exact version tokens and shared save/close behavior", async () => {
  for (const [Editor, create, update] of [[ActualBrand, "createBrand", "updateBrand"], [ActualCategory, "createCategory", "updateCategory"]]) {
    const record = { id: "memory-id", name: "Memory", version: "2026-11-10T00:00:00.000Z" };
    await mount({ Editor, loader: async id => ({ status: "ok", data: id ? { record } : {} }) });
    await click(document.querySelector("[data-record-editor]"));
    assert.equal(document.activeElement, dialog().querySelector("input[name=name]"));
    await change(document.activeElement);
    await click(buttons().at(-1));
    assert.equal(dialog().open, false); assert.equal(writes[0].operation, create); assert.equal(writes[0].fields.name, "Memory edited");
    await click(document.querySelectorAll("[data-record-editor]")[1]);
    await change(dialog().querySelector("input[name=name]"));
    await click(buttons().at(-1));
    assert.equal(dialog().open, false); assert.equal(writes[1].operation, update);
    assert.equal(writes[1].fields.id, record.id); assert.equal(writes[1].fields.version, record.version);
    assert.equal(refresh, 2); assert.equal(window.location.search, "?q=Memory&page=2");
    await act(async () => root.unmount()); root = null;
  }
});

test("failed/conflicting writes keep the real form open, preserve input and never refresh the list", async () => {
  await mount({ Editor: ActualBrand, loader: async () => ({ status: "ok", data: { record: { id: "memory-id", name: "Memory", version: "2026-11-10T00:00:00.000Z" } } }) });
  await click(document.querySelectorAll("[data-record-editor]")[1]);
  await change(dialog().querySelector("input[name=name]"));
  saveStatus = "conflict"; await click(buttons().at(-1));
  assert.equal(dialog().open, true); assert.equal(refresh, 0);
  assert.equal(dialog().querySelector("input[name=name]").value, "Memory edited");
  assert.equal(buttons().at(-1).disabled, true);
  assert.match(dialog().querySelector('[role="alert"]').textContent, /cambió/);
});

test("Customers use the shared modal for create/edit, keep contact data and versions, and never expose an editable status", async () => {
  const customer = { id: "memory-id", name: "Memory", email: "memory@example.invalid", phone: "123", address: "Memory address", version: "2026-11-11T00:00:00.000Z", editable: true, contactState: "current", statusLabel: "Estado previo (sin cambios)" };
  await mount({ path: "/panel/clientes", Editor: ActualCustomer, loader: async id => ({ status: "ok", data: id ? { customer } : {} }) });
  const main = document.querySelector("main"), table = document.querySelector(".milo-catalog-table-wrap"); main.scrollTop = 120; table.scrollTop = 60;
  await click(document.querySelector("[data-record-editor]"));
  assert.equal(document.activeElement, dialog().querySelector("input[name=name]"));
  assert.equal(dialog().querySelector("[name=status]"), null);
  assert.match(dialog().textContent, /sin autorización comercial/);
  await change(document.activeElement); discard = false; await key(document.activeElement, "Escape"); assert.equal(dialog().open, true);
  await click(buttons().at(-1)); assert.equal(dialog().open, false); assert.equal(writes[0].operation, "createCustomer"); assert.equal(refresh, 1);
  assert.deepEqual(writes[0].fields, { name: "Memory edited", email: "", phone: "", address: "" });
  assert.equal(main.scrollTop, 120); assert.equal(table.scrollTop, 60); assert.equal(window.location.pathname, "/panel/clientes");
  assert.equal(window.location.search, "?q=Memory&page=2");
  await click(document.querySelectorAll("[data-record-editor]")[1]);
  assert.equal(dialog().querySelector("input[name=email]").value, customer.email);
  await change(dialog().querySelector("input[name=name]")); await click(buttons().at(-1));
  assert.equal(writes[1].operation, "updateCustomer"); assert.equal(writes[1].fields.version, customer.version); assert.equal(writes[1].fields.id, customer.id);
  assert.equal(dialog().open, false); assert.equal(refresh, 2);
});

test("Customers keep conflicts open and protect incompatible legacy contact JSON against any UI submission", async () => {
  const customer = { id: "memory-id", name: "Memory", email: "", phone: "", address: "", version: "2026-11-11T00:00:00.000Z", editable: true, contactState: "current", statusLabel: "Estado previo (sin cambios)" };
  await mount({ path: "/panel/clientes", Editor: ActualCustomer, loader: async () => ({ status: "ok", data: { customer } }) });
  await click(document.querySelectorAll("[data-record-editor]")[1]);
  await change(dialog().querySelector("input[name=name]")); saveStatus = "conflict"; await click(buttons().at(-1));
  assert.equal(dialog().open, true); assert.equal(refresh, 0); assert.equal(dialog().querySelector("input[name=name]").value, "Memory edited");
  assert.equal(buttons().at(-1).disabled, true);
  await act(async () => root.unmount()); root = null;
  await mount({ path: "/panel/clientes", Editor: ActualCustomer, loader: async () => ({ status: "ok", data: { customer: { ...customer, name: "", editable: false, contactState: "legacy" } } }) });
  await click(document.querySelectorAll("[data-record-editor]")[1]); assert.equal(buttons().at(-1).disabled, true);
  assert.equal(dialog().querySelector("fieldset fieldset").disabled, true);
  assert.match(dialog().querySelector('[role="alert"]').textContent, /sin sobrescribir/); assert.equal(writes.length, 0);
});
