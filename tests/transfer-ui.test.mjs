import assert from "node:assert/strict";
import test,{afterEach} from "node:test";
import {readFile} from "node:fs/promises";
import {JSDOM} from "jsdom";
import {act,createElement as h} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {componentURL,recordEditorURL} from "./record-editor-loader.mjs";
const dom=new JSDOM("<!doctype html><div id='root'></div>",{url:"https://milo.invalid/panel/clientes?q=Fixture&page=2",pretendToBeVisual:true});
for(const name of ["window","document","Element","HTMLElement","HTMLDialogElement","HTMLFormElement","Event","MouseEvent","KeyboardEvent"])globalThis[name]=name==="window"?dom.window:dom.window[name];
globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;this.querySelector("button")?.focus();};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};dom.window.history.back=()=>{};dom.window.history.forward=()=>{};
let refresh=0,loaded=[],requests=[],downloads=[],deferred=null,fail=false,previewErrors=false;
globalThis[Symbol.for("milo.transfer-ui")]={useRouter:()=>({refresh(){refresh++;}})};
const interactions=componentURL(await readFile(new URL("../components/panel/editor-interactions.ts",import.meta.url),"utf8"));
const workspace=componentURL((await readFile(new URL("../components/panel/record-workspace.tsx",import.meta.url),"utf8")).replace('import { useRouter } from "next/navigation";','const {useRouter}=globalThis[Symbol.for("milo.transfer-ui")];').replace('from "./editor-interactions"',`from ${JSON.stringify(interactions)}`));
const {RecordWorkspace}=await import(workspace);
const link=componentURL('import {createElement} from "react";export default function Link(props){return createElement("a",props,props.children);}');
const columns=componentURL(await readFile(new URL("../lib/data-transfer/columns.ts",import.meta.url),"utf8"));
const source=(await readFile(new URL("../components/panel/transfer-toolbar.tsx",import.meta.url),"utf8")).replace('from "next/link"',`from ${JSON.stringify(link)}`).replace('from "@/lib/data-transfer/columns"',`from ${JSON.stringify(columns)}`).replace('from "./record-workspace"',`from ${JSON.stringify(workspace)}`).replace('from "./record-editor"',`from ${JSON.stringify(recordEditorURL)}`).replace('from "./editor-interactions"',`from ${JSON.stringify(interactions)}`);
const {TransferToolbar}=await import(componentURL(source)),{createRoot}=await import("react-dom/client");
dom.window.HTMLAnchorElement.prototype.click=function(){if(this.download){downloads.push(this.download);return;}this.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,button:0}));};
globalThis.fetch=async(url,options)=>{
 requests.push({url,options});if(fail)return Response.json({error:"Fixture request denied"},{status:403});
 if(url.includes("mode=preview"))return Response.json({preview:{fingerprint:"a".repeat(64),total:21,created:previewErrors?20:21,skipped:0,errors:previewErrors?1:0,lines:Array.from({length:21},(_,i)=>({row:i+2,status:previewErrors&&i===20?"error":"new",name:"Fixture "+i,message:previewErrors&&i===20?"Invalid fiscal data":"New fixture"}))}});
 if(url.includes("mode=confirm"))return new Promise(resolve=>{deferred=resolve;});
 return new Response(new Uint8Array([80,75,3,4]),{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}});
};
const previewDialog=()=>document.querySelector(".milo-import-dialog"),recordDialog=()=>document.querySelector("dialog:not(.milo-import-dialog)");
const click=async element=>act(async()=>element.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,button:0})));
const key=async(element,value,extra={})=>act(async()=>element.dispatchEvent(new KeyboardEvent("keydown",{bubbles:true,cancelable:true,key:value,...extra})));
const button=(text,scope=document)=>[...scope.querySelectorAll("button")].find(element=>element.textContent===text);
let root;
async function mount(kind="clientes"){
 refresh=0;loaded=[];requests=[];downloads=[];deferred=null;fail=previewErrors=false;dom.window.history.replaceState({},"",`/panel/${kind}?q=Fixture&page=2`);
 root=createRoot(document.getElementById("root"));await act(async()=>root.render(h("main",null,h(RecordWorkspace,{loadEditor:async id=>{loaded.push(id);return{status:"ok",data:{}};},Editor:()=>h("input",{autoFocus:true,"aria-label":"Fixture editor"}),createTitle:"New fixture",editTitle:"Edit fixture",description:"Fixture"},h(TransferToolbar,{kind,q:"Fixture"}),h("div",{className:"milo-catalog-table-wrap"},"Mounted list")))));
}
async function choose(){const input=previewDialog().querySelector('input[type="file"]');Object.defineProperty(input,"files",{value:[new dom.window.File(["fixture"],"fixture.xlsx")],configurable:true});await act(async()=>input.dispatchEvent(new Event("change",{bubbles:true})));}
async function analyze(){await choose();await act(async()=>previewDialog().querySelector("form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));}
afterEach(async()=>{if(root)await act(async()=>root.unmount());root=null;});
test("shared toolbar exposes each module, current-filter exports, real print link and F4 only with no modal/modifiers",async()=>{
 for(const kind of ["clientes","proveedores"]){
  if(root){await act(async()=>root.unmount());root=null;}await mount(kind);
  const print=document.querySelector('a[target="_blank"]');assert.equal(print.getAttribute("href"),`/panel/${kind}/imprimir?q=Fixture`);assert.match(print.rel,/noopener/);
  await key(document,"F4",{altKey:true});assert.equal(recordDialog().open,false);await key(document,"F4");assert.equal(recordDialog().open,true);assert.deepEqual(loaded,[null]);await key(recordDialog(),"Escape");
  await click(button("Exportar Excel"));assert.ok(requests.at(-1).url.includes(`/${kind}/archivo?mode=export&q=Fixture`));assert.equal(downloads.length,1);
  await click(button("Importar Excel"));assert.equal(previewDialog().open,true);const input=previewDialog().querySelector('input[type="file"]');assert.equal(document.activeElement,input);await key(document,"F4");assert.deepEqual(loaded,[null]);await key(previewDialog(),"Escape");assert.equal(previewDialog().open,false);assert.equal(document.activeElement,button("Importar Excel"));
 }
});
test("import template, preview pagination and explicit confirmation preserve list state; pending guards dismissal",async()=>{
 await mount();const main=document.querySelector("main"),table=document.querySelector("main > div > .milo-catalog-table-wrap");main.scrollTop=120;table.scrollTop=65;table.scrollLeft=20;
 await click(button("Importar Excel"));await click(button("Descargar plantilla",previewDialog()));assert.equal(downloads.length,1);
 await analyze();assert.equal(requests.filter(row=>row.url.includes("confirm")).length,0);assert.equal(previewDialog().querySelectorAll("tbody tr").length,20);await click(button("Siguiente",previewDialog()));assert.equal(previewDialog().querySelectorAll("tbody tr").length,1);
 assert.equal(previewDialog().querySelector("footer").closest(".milo-record-editor-body"),null);
 await act(async()=>{previewDialog().querySelector("form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));await Promise.resolve();});assert.ok(deferred);assert.equal(button("Cancelar",previewDialog()).disabled,true);await key(previewDialog(),"Escape");assert.equal(previewDialog().open,true);
 const warn=new Event("beforeunload",{cancelable:true});window.dispatchEvent(warn);assert.equal(warn.defaultPrevented,true);
 const request=requests.find(row=>row.url.includes("confirm"));assert.equal(request.options.headers["X-Milo-Confirm"],"IMPORT");assert.match(request.options.headers["X-Milo-Operation"],/^[a-f0-9-]{36}$/);
 await act(async()=>deferred(Response.json({message:"Imported fixture batch",created:21})));assert.equal(previewDialog().open,false);assert.equal(refresh,1);assert.equal(main.scrollTop,120);assert.equal(table.scrollTop,65);assert.equal(table.scrollLeft,20);assert.equal(window.location.search,"?q=Fixture&page=2");assert.equal(document.activeElement,button("Importar Excel"));
});
test("invalid preview prevents confirmation and failed requests keep import dialog/file without writes or refresh",async()=>{
 await mount();previewErrors=true;await click(button("Importar Excel"));await analyze();assert.equal(button("Confirmar importación",previewDialog()).disabled,true);assert.equal(refresh,0);await click(button("Volver a analizar",previewDialog()));fail=true;await analyze();assert.equal(previewDialog().open,true);assert.ok(previewDialog().querySelector('[role="alert"]'));assert.equal(refresh,0);assert.equal(requests.filter(row=>row.url.includes("confirm")).length,0);
});
test("print view escapes uploaded text, includes record context and omits internal notes and row actions",async()=>{
 const controls=componentURL(await readFile(new URL("../components/panel/print-controls.tsx",import.meta.url),"utf8"));const printSource=(await readFile(new URL("../components/panel/print-list.tsx",import.meta.url),"utf8")).replace('from "./print-controls"',`from ${JSON.stringify(controls)}`);const {PrintList}=await import(componentURL(printSource));
 for(const kind of ["clientes","proveedores"]){const html=renderToStaticMarkup(h(PrintList,{kind,company:"Fixture company",q:"Fixture",rows:[{code:"C000001",legalName:'<img src=x onerror="bad()">',internalNotes:"Never print this note",phone:"00123"}]}));assert.match(html,/Fixture company/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img|Never print this note|Eliminar|Editar/);assert.match(html,/Guardar como PDF/);}
 const css=await readFile(new URL("../components/panel/transfer.css",import.meta.url),"utf8");assert.match(css,/A4 landscape/);assert.match(css,/table-header-group/);assert.match(css,/overflow: visible !important/);
});
