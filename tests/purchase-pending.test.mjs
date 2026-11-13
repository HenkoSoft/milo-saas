import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { componentURL, recordEditorURL } from "./record-editor-loader.mjs";
const linkURL = componentURL('import {createElement as h} from "react"; export default function Link({children,...props}) {return h("a",props,children)}');
const source = (await readFile(new URL("../components/panel/purchase-pending.tsx", import.meta.url), "utf8")).replace('from "next/link"', `from ${JSON.stringify(linkURL)}`).replace('from "./record-editor"', `from ${JSON.stringify(recordEditorURL)}`);
const { CreditNoteEntry, CreditNoteList } = await import(componentURL(source));
test("credit note entry exposes required structure but cannot submit or imply a calculated amount", () => {
  const html = renderToStaticMarkup(h(CreditNoteEntry));
  assert.match(html, /fieldset[^>]*disabled/); assert.match(html, /Guardar N\/C \(pendiente\)/);
  assert.match(html, /form="supplier-credit-note"[^>]*disabled/);
  for (const label of ["Tipo de nota de crédito", "Número de nota de crédito", "Factura de referencia", "Proveedor", "Condición IVA", "CUIT/DNI", "Dirección", "Observaciones", "Cantidad", "Código", "Subtotal ARS"]) assert.ok(html.includes(label));
  assert.match(html, /sin cálculo disponible/); assert.match(html, /No se guardan datos/);
  assert.doesNotMatch(html, /0,00|action="/);
});
test("credit note query preserves and escapes filter without pretending records or pagination exist", () => {
  const html = renderToStaticMarkup(h(CreditNoteList, { q: '<img src=x onerror="bad">' }));
  assert.match(html, /&lt;img/); assert.doesNotMatch(html, /<img|Página 1|0,00/);
  assert.match(html, /Listado y paginación pendientes/); assert.match(html, /name="q"/);
});
