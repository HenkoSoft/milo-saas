import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TableEditAction } from "./table-edit-action-loader.mjs";

test("table actions retain real routes, contextual accessible names, native edit tooltips and modal markers", () => {
  for (const area of ["productos", "clientes", "categorias", "marcas", "sucursales"]) {
    const html = renderToStaticMarkup(createElement(TableEditAction, { href: `/panel/${area}/memory`, label: "Memory", recordId: area === "sucursales" ? undefined : "memory" }));
    assert.ok(html.includes(`href="/panel/${area}/memory"`));
    assert.match(html, /title="Editar"/); assert.match(html, /aria-label="Editar Memory"/);
    assert.match(html, /milo-secondary-button milo-table-edit-action/);
    assert.match(html, /aria-hidden="true" focusable="false"/);
    assert.doesNotMatch(html, /<button|tabindex="-1"|→|Eliminar/);
    assert.equal(html.includes('data-record-editor="memory"'), area !== "sucursales");
  }
});

test("protected customer records keep their read-only consultation action", () => {
  const html = renderToStaticMarkup(createElement(TableEditAction, { href: "/panel/clientes/memory", label: "cliente", recordId: "memory", readOnly: true }));
  assert.match(html, /title="Consultar"/); assert.match(html, /aria-label="Consultar cliente"/);
  assert.doesNotMatch(html, /Editar|Eliminar/);
});
