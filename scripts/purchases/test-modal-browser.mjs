// Native Chrome regression: actual list, PurchaseWorkspace, RecordWorkspace and form.
// Only server/router boundaries are replaced. No database, credentials or network service.
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import ts from "typescript";

if (process.argv[2] !== "--run-browser") {
  console.log("Use --run-browser to verify real modal behavior with isolated in-memory server responses.");
  process.exit(0);
}
const root = process.cwd(), output = path.resolve(".local/purchase-modal-browser");
await mkdir(output, { recursive: true });
const modules = [], ids = new Map();
const boundary = new Set(["next/link", "next/navigation", "@/components/auth/sign-out-button", "@/lib/panel/access", "@/lib/purchases/service", "@/app/panel/compras/actions"]);
const mock = `
const React=require('react');exports.__esModule=true;
exports.default=function Link({children,...props}){return React.createElement('a',props,children)};
exports.useRouter=()=>window.fixture.router;
exports.usePathname=()=>React.useSyncExternalStore(callback=>{window.addEventListener('popstate',callback);window.addEventListener('fixture:navigation',callback);return ()=>{window.removeEventListener('popstate',callback);window.removeEventListener('fixture:navigation',callback)}},()=>location.pathname,()=>location.pathname);
exports.SignOutButton=()=>React.createElement('button',{type:'button'},'Cerrar sesión');
exports.requirePanelContext=async()=>{};
exports.listPurchases=async input=>({status:'ok',data:{...input,page:2,pages:3,total:60,documentReady:true,branches:[{id:window.fixture.branch,name:'Sucursal de prueba'}],items:window.fixture.items}});
exports.loadPurchaseEditor=async id=>({status:'ok',data:window.fixture.editor(id)});
exports.searchPurchaseChoices=async({kind})=>({status:'ok',data:kind==='suppliers'?[{id:window.fixture.supplier,label:'Proveedor de prueba'}]:[{id:window.fixture.product,label:'SKU · Artículo de prueba',name:'Artículo de prueba',sku:'SKU',unit:'UNIT'}]});
exports.savePurchaseDraft=async input=>{const f=window.fixture;f.writes.push(input);f.items=[{...f.items[0],id:input.id,code:'CP000099'},...f.items.slice(0,24)];return {status:'saved',id:input.id,message:'Borrador guardado en memoria.'}};
exports.confirmPurchaseReceipt=async()=>{throw Error('Receipt is outside this UI-only test')};
`;
async function bundle(file, source) {
  if (ids.has(file)) return ids.get(file);
  const id = modules.length; ids.set(file, id); modules.push(null);
  let code = source ?? await readFile(file, "utf8");
  if (/\.tsx?$/.test(file)) code = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const map = {};
  for (const match of code.matchAll(/\brequire\(["']([^"']+)["']\)/g)) {
    const spec = match[1]; if (spec in map) continue;
    if (boundary.has(spec)) map[spec] = await bundle(path.join(root, "__modal_mock__.js"), mock);
    else {
      let target;
      if (spec.startsWith("@/") || spec.startsWith(".")) {
        const base = spec.startsWith("@/") ? path.join(root, spec.slice(2)) : path.resolve(path.dirname(file), spec);
        target = [base, base + ".tsx", base + ".ts", base + ".js"].find(p => existsSync(p) && path.extname(p));
      } else target = createRequire(file).resolve(spec);
      assert.ok(target && path.isAbsolute(target), "Unexpected browser dependency: " + spec);
      map[spec] = await bundle(target);
    }
  }
  modules[id] = { code, map }; return id;
}
const listId = await bundle(path.join(root, "app/panel/compras/purchase-list.tsx"));
const entryId = await bundle(path.join(root, "app/panel/compras/ingresar/page.tsx"));
const shellId = await bundle(path.join(root, "components/panel/panel-shell.tsx"));
const reactId = await bundle(createRequire(import.meta.url).resolve("react"));
const domId = await bundle(createRequire(import.meta.url).resolve("react-dom/client"));
const bootstrap = `
const React=load(${reactId}),{createRoot}=load(${domId});
for(const method of ['pushState','replaceState']){const original=history[method].bind(history);history[method]=(...args)=>{original(...args);window.dispatchEvent(new Event('fixture:navigation'))};}
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
window.fixture={branch:uuid(1),supplier:uuid(2),product:uuid(3),writes:[],refreshes:0,backgroundClicks:0,confirmations:0,allowDiscard:false};
const f=window.fixture;
f.items=Array.from({length:25},(_,i)=>({id:uuid(i+100),code:'CP'+String(i+1).padStart(6,'0'),date:'2026-11-13',status:'DRAFT',supplier:'Proveedor de prueba',branch:'Sucursal de prueba',reference:null,total:'1000000.10'}));
f.editor=id=>({id:id||uuid(4),date:'2026-11-13',documentReady:true,branches:[{id:f.branch,label:'Sucursal de prueba'}],...(id?{purchase:{input:{id,revision:1,supplierId:f.supplier,branchId:f.branch,date:'2026-11-13',reference:'',notes:'',lines:Array.from({length:50},(_,i)=>({id:uuid(i+200),productId:f.product,baseUnitCode:'UNIT',quantity:'10',unitCost:'100000.01'}))},code:'CP000001',status:'DRAFT',total:'50000005.00',supplier:'Proveedor de prueba',branch:'Sucursal de prueba',creator:'Usuario de prueba',receiver:null,createdAt:'2026-11-13T12:00:00Z',receivedAt:null,lines:Array.from({length:50},(_,i)=>({id:uuid(i+200),productId:f.product,sku:'SKU',name:'Artículo de prueba',unit:'UNIT',quantity:'10',unitCost:'100000.01',subtotal:'1000000.10',movementId:null}))}}:{})});
window.confirm=()=>{f.confirmations++;return f.allowDiscard};
const root=createRoot(document.getElementById('root'));
async function render(){const params=Object.fromEntries(new URLSearchParams(location.search));const view=location.pathname.endsWith('/ingresar')?await (async()=>{const e=load(${entryId}).default({searchParams:Promise.resolve(params)});return e.type(e.props)})():await load(${listId}).PurchaseList({searchParams:Promise.resolve(params)});root.render(React.createElement(load(${shellId}).PanelShell,{companyName:'Empresa de prueba',userName:'Usuario de prueba',scopeLabel:'Empresa',canManageCompany:false,canManageCatalog:false,canManageBranches:false,canReadInventory:false,canManagePurchases:true},view));}
f.router={refresh(){f.refreshes++;void render()},replace(url){history.replaceState(null,'',url)},push(url){history.pushState(null,'',url)}};
document.getElementById('background-action').onclick=()=>f.backgroundClicks++;
void render().then(()=>{window.ready=true});
`;
const functions = modules.map(m => `[function(require,module,exports){${m.code}\n},${JSON.stringify(m.map)}]`).join(",\n");
const js = `const process={env:{NODE_ENV:'production'}};const modules=[${functions}],cache={};function load(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id][0](s=>load(modules[id][1][s]),m,m.exports);return m.exports}\n${bootstrap}`;
const cssFiles = (await readdir(".next/static/chunks")).filter(f => f.endsWith(".css"));
// Preserve the application's Tailwind layer order, independently of chunk filenames.
const css = "@layer theme, base, components, utilities;\n" + (await Promise.all(cssFiles.map(f => readFile(".next/static/chunks/" + f, "utf8")))).join("\n") + "\n" + await readFile("components/panel/record-editor.css", "utf8") + "\n" + await readFile("components/panel/purchases.css", "utf8");
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") { res.writeHead(200, { "Content-Type": "text/javascript" }); res.end(js); }
  else { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(`<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${css}</style></head><body><button id="background-action" style="position:fixed;top:10px;left:10px">Acción de fondo</button><div id="root"></div><script src="/bundle.js"></script></body></html>`); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let chrome, socket, ownedProfile, sequence = 0;
const pending = new Map(), errors = [];
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(Error("CDP timeout: " + method)); }, 15000);
    pending.set(id, { resolve: result => { clearTimeout(timer); resolve(result); }, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  assert.ok(!result.exceptionDetails, result.exceptionDetails?.text);
  return result.result.value;
}
async function until(expression) {
  const limit = Date.now() + 10000;
  while (!await evaluate(`Boolean(${expression})`)) { assert.ok(Date.now() < limit, "Browser condition timed out: " + expression); await new Promise(r => setTimeout(r, 25)); }
}
async function press(key, code = key, virtual = 0) {
  await command("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: virtual });
  await command("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: virtual });
}
async function screenshot(name) {
  const result = await command("Page.captureScreenshot", { format: "png" });
  await writeFile(path.join(output, name + ".png"), Buffer.from(result.data, "base64"));
}
try {
  const profile = path.join(output, "chrome-" + Date.now());
  ownedProfile = profile;
  await mkdir(profile);
  chrome = spawn(process.env.MILO_TEST_CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--disable-gpu", "--disable-extensions", "--disable-component-update", "--disable-background-networking", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"], { windowsHide: true, stdio: "ignore" });
  const limit = Date.now() + 15000;
  while (!existsSync(path.join(profile, "DevToolsActivePort"))) { assert.ok(Date.now() < limit, "Chrome did not start"); await new Promise(r => setTimeout(r, 50)); }
  const port = (await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0];
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(t => t.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => { const msg = JSON.parse(event.data); if (msg.id && pending.has(msg.id)) { const task = pending.get(msg.id); pending.delete(msg.id); if (msg.error) task.reject(Error(msg.error.message)); else task.resolve(msg.result); } else if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.text); };
  await command("Runtime.enable"); await command("Page.enable");
  await command("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  const base = `http://127.0.0.1:${server.address().port}`;
  const listUrl = base + "/panel/compras?q=prueba&page=2&status=DRAFT";
  await command("Page.navigate", { url: listUrl });
  await until("window.ready && document.querySelector('a[data-record-editor]')");
  assert.equal(await evaluate("document.querySelector('dialog').open"), false);
  assert.equal(await evaluate("document.querySelector('#panel-purchases a[aria-current=page]').textContent"), "Consulta de Compras");
  assert.equal(await evaluate("document.querySelector('#panel-purchases').querySelectorAll('a').length"), 5);
  assert.equal(await evaluate("document.querySelector('a[data-record-editor=\"\"]').textContent"), "Ingreso de mercadería");
  await evaluate("window.listNode=document.querySelector('.milo-record-workspace');window.listTable=document.querySelector('[aria-label=\"Listado de compras\"]');listTable.style.maxHeight='160px';document.querySelector('main').style.flex='none';document.querySelector('main').style.height='280px';document.querySelector('main').scrollTop=35;listTable.scrollTop=65;listTable.scrollLeft=20;document.querySelector('#panel-purchases a[href=\"/panel/compras/ingresar\"]').click()");
  await until("document.querySelector('.milo-purchase-editor')");
  assert.equal(await evaluate("document.querySelector('dialog').matches(':modal')"), true, "Must use native showModal, not open attribute/show()");
  assert.equal(await evaluate("document.querySelectorAll('.milo-purchase-editor').length"), 1);
  assert.equal(await evaluate("document.querySelector('dialog h2').textContent"), "Ingreso de Mercadería");
  assert.equal(await evaluate("document.querySelector('#panel-purchases a[aria-current=page]').textContent"), "Ingreso de Mercadería");
  assert.equal(await evaluate("document.querySelectorAll('#panel-purchases a[aria-current=page]').length"), 1);
  assert.equal(await evaluate("location.href"), listUrl, "Opening must not navigate");
  assert.equal(await evaluate("window.listNode===document.querySelector('.milo-record-workspace')"), true);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('dialog'),'::backdrop').backgroundColor"), "rgba(9, 20, 38, 0.6)");
  await evaluate("document.getElementById('background-action').focus()");
  assert.equal(await evaluate("document.querySelector('dialog').contains(document.activeElement)"), true, "Background cannot receive focus");
  await command("Input.dispatchMouseEvent", { type: "mousePressed", x: 50, y: 25, button: "left", clickCount: 1 });
  await command("Input.dispatchMouseEvent", { type: "mouseReleased", x: 50, y: 25, button: "left", clickCount: 1 });
  assert.equal(await evaluate("fixture.backgroundClicks"), 0, "Native inert background cannot be clicked");
  for (let i = 0; i < 25; i++) { await press("Tab", "Tab", 9); assert.equal(await evaluate("document.querySelector('dialog').contains(document.activeElement)"), true); }
  const dataLayout = await evaluate("(()=>{const d=document.querySelector('dialog'),b=d.querySelector('.milo-record-editor-body'),f=d.querySelector('footer');return {dialog:d.getBoundingClientRect().toJSON(),body:b.clientHeight,scroll:b.scrollHeight,footer:f.getBoundingClientRect().toJSON(),overflow:d.scrollWidth>d.clientWidth}})()");
  assert.equal(dataLayout.body, dataLayout.scroll, "Data tab must not scroll at 1920x1080");
  assert.equal(dataLayout.overflow, false); assert.ok(dataLayout.footer.bottom <= 1080);
  assert.equal(dataLayout.dialog.x, (await evaluate("document.documentElement.clientWidth") - dataLayout.dialog.width) / 2);
  assert.equal(dataLayout.dialog.y, (1080 - dataLayout.dialog.height) / 2);
  await evaluate("document.querySelector('.milo-purchase-document input[type=checkbox]').click()");
  const taxLayout = await evaluate("(()=>{const b=document.querySelector('.milo-record-editor-body');return {body:b.clientHeight,scroll:b.scrollHeight}})()");
  assert.equal(taxLayout.body, taxLayout.scroll, "Data tab with manual IVA must also fit");
  await screenshot("new-purchase-modal");
  // Native input via CDP makes the form dirty, then Escape must consult discard.
  await evaluate("document.querySelector('input[id$=\"-reference\"]').focus()");
  await command("Input.insertText", { text: "Cambio de prueba en memoria" });
  await press("Escape", "Escape", 27);
  assert.equal(await evaluate("fixture.confirmations>0 && document.querySelector('dialog').matches(':modal')"), true);
  assert.equal(await evaluate("document.querySelector('#panel-purchases a[aria-current=page]').textContent"), "Ingreso de Mercadería");
  await evaluate("fixture.allowDiscard=true"); await press("Escape", "Escape", 27);
  await until("!document.querySelector('dialog').open");
  assert.equal(await evaluate("document.querySelector('#panel-purchases a[aria-current=page]').textContent"), "Consulta de Compras");
  await evaluate("document.querySelector('#panel-purchases a[href=\"/panel/compras\"]').click()");
  assert.equal(await evaluate("document.querySelector('dialog').open"), false);
  assert.equal(await evaluate("window.listNode===document.querySelector('.milo-record-workspace')"), true);
  assert.equal(await evaluate("document.activeElement.matches('a[data-record-editor=\"\"]')"), true);
  // Populate a new draft exclusively through the real UI; the action writes to memory.
  await evaluate("document.querySelector('a[data-record-editor=\"\"]').click()"); await until("document.querySelector('.milo-purchase-editor')");
  assert.equal(await evaluate("document.querySelector('#panel-purchases a[aria-current=page]').textContent"), "Ingreso de Mercadería");
  await evaluate("document.querySelector('[data-lookup=suppliers] button').click()"); await until("document.querySelector('[data-lookup=suppliers] select').options.length===2");
  await evaluate("(()=>{const s=document.querySelector('[data-lookup=suppliers] select');s.value=fixture.supplier;s.dispatchEvent(new Event('change',{bubbles:true}));const b=document.querySelector('dialog select[id$=\"-branch\"]');b.value=fixture.branch;b.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[role=tab][id$=\"-articles\"]').click()})()");
  await evaluate("document.querySelector('[data-lookup=products] button').click()"); await until("document.querySelector('[data-lookup=products] select').options.length===2");
  await evaluate("(()=>{const s=document.querySelector('[data-lookup=products] select');s.value=fixture.product;s.dispatchEvent(new Event('change',{bubbles:true}))})()");
  await until("document.querySelector('.milo-purchase-lines input')");
  await evaluate("document.querySelector('.milo-purchase-lines input').focus()"); await command("Input.insertText", { text: "10" });
  await evaluate("document.querySelectorAll('.milo-purchase-lines input')[1].focus()"); await command("Input.insertText", { text: "100.000,01" });
  await evaluate("document.querySelector('button[form]').click()"); await until("!document.querySelector('dialog').open && fixture.refreshes===1");
  assert.equal(await evaluate("fixture.writes.length"), 1); assert.equal(await evaluate("fixture.writes[0].lines[0].unitCost"), "100000.01");
  await until("document.querySelector('[aria-label=\"Listado de compras\"]').textContent.includes('CP000099')");
  assert.equal(await evaluate("location.href"), listUrl);
  assert.equal(await evaluate("document.querySelector('main').scrollTop"), 35); assert.equal(await evaluate("listTable.scrollTop"), 65);
  assert.equal(await evaluate("listNode===document.querySelector('.milo-record-workspace')"), true);
  // Many articles: scroll stays inside the table, not the dialog body.
  await evaluate("document.querySelector('a[data-record-editor]:not([data-record-editor=\"\"])').click()"); await until("document.querySelector('.milo-purchase-editor')");
  await evaluate("document.querySelector('[role=tab][id$=\"-articles\"]').click()");
  const articlesLayout = await evaluate("(()=>{const b=document.querySelector('.milo-record-editor-body'),t=document.querySelector('.milo-purchase-lines');return {body:b.clientHeight,scroll:b.scrollHeight,table:t.clientHeight,tableScroll:t.scrollHeight}})()");
  assert.equal(articlesLayout.body, articlesLayout.scroll); assert.ok(articlesLayout.tableScroll > articlesLayout.table);
  await screenshot("articles-modal"); await press("Escape", "Escape", 27); await until("!document.querySelector('dialog').open");
  // Direct route/reload uses the same list and shared component, opening automatically.
  const directSearch = "?q=prueba&page=2&status=DRAFT&branch=00000000-0000-4000-8000-000000000001";
  await command("Page.navigate", { url: base + "/panel/compras/ingresar" + directSearch });
  await until("document.querySelector('.milo-purchase-editor') && document.querySelector('dialog').matches(':modal')");
  assert.equal(await evaluate("!!document.querySelector('[aria-label=\"Listado de compras\"]')"), true);
  await command("Page.reload"); await until("document.querySelector('.milo-purchase-editor') && document.querySelector('dialog').matches(':modal')");
  await press("Escape", "Escape", 27); await until("!document.querySelector('dialog').open");
  await until("location.pathname==='/panel/compras'");
  assert.equal(await evaluate("location.search"), directSearch);
  assert.equal(await evaluate("document.querySelector('#panel-purchases a[aria-current=page]').textContent"), "Consulta de Compras");
  await command("Page.reload"); await until("window.ready && document.querySelector('dialog')");
  assert.equal(await evaluate("document.querySelector('dialog').open"), false, "Reload after closing stays on consultation");
  assert.deepEqual(errors, []);
  const report = { passed: true, viewport: "1920x1080", nativeModal: true, sidebarIngressOpensSameWorkspace: true, consultationDoesNotAutoOpen: true, activeSidebarTracksModal: true, fiveMenuOptions: true, directCloseReturnsToList: true, backgroundFocusBlocked: true, backgroundClickBlocked: true, tabFocusContained: true, discardVerified: true, saveClosesAndRefreshesList: true, urlAndScrollPreserved: true, directRouteAndReload: true, dataLayout, taxLayout, articlesLayout, dataSource: "In-memory fixtures and server/router boundary stubs; actual React shell, sidebar, list, workspace and form; no database access" };
  await writeFile(path.join(output, "verified.json"), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
} catch (error) {
  if (socket?.readyState === WebSocket.OPEN) {
    const diagnostic = await evaluate("({errors:" + JSON.stringify(errors) + ",writes:fixture?.writes,refreshes:fixture?.refreshes,invalid:[...document.querySelectorAll('input:invalid,select:invalid')].map(e=>({id:e.id,value:e.value,message:e.validationMessage})),alert:document.querySelector('[role=alert]')?.textContent})").catch(() => null);
    console.error(JSON.stringify(diagnostic)); await screenshot("failure").catch(() => {});
  }
  throw error;
} finally {
  if (socket?.readyState === WebSocket.OPEN) { await command("Browser.close").catch(() => {}); socket.close(); }
  if (chrome && chrome.exitCode === null) chrome.kill();
  if (chrome && chrome.exitCode === null) await new Promise(resolve => chrome.once("exit", resolve));
  await new Promise(resolve => server.close(resolve));
  if (ownedProfile) {
    // Only this run's absolute, verified workspace child may be removed recursively.
    assert.equal(path.dirname(path.resolve(ownedProfile)), output);
    assert.match(path.basename(ownedProfile), /^chrome-\d{13}$/);
    await rm(ownedProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}
