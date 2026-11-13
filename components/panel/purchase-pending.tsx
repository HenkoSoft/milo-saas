import Link from "next/link";
import { RecordEditor, EditorFooter } from "./record-editor";

export function CreditNoteEntry() {
  return <RecordEditor className="milo-purchase-editor" footer={<EditorFooter formId="supplier-credit-note" pending={false} disabled cancelHref="/panel/compras/notas-credito" cancelLabel="Volver a Consulta de N/C" saveLabel="Guardar N/C (pendiente)" summary={<strong>Total ARS: sin cálculo disponible</strong>} />}>
    <p className="milo-company-hint" role="status">Formulario preparado. La carga está bloqueada: falta definir el efecto sobre stock/deuda, vínculo con la compra, límites, estados y auditoría. No se guardan datos ni se modifican existencias.</p>
    <form id="supplier-credit-note" className="milo-catalog-form"><fieldset className="milo-catalog-fields" disabled><legend>Datos de la nota de crédito · pendiente de habilitación</legend>
      <div className="milo-purchase-document-grid">
        <div className="milo-field"><label htmlFor="nc-type">Tipo de nota de crédito</label><select id="nc-type"><option>Sin definir</option></select></div>
        <div className="milo-field"><label htmlFor="nc-number">Número de nota de crédito</label><input id="nc-number" /></div>
        <div className="milo-field"><label htmlFor="nc-invoice">Factura de referencia (si corresponde)</label><input id="nc-invoice" /></div>
        <div className="milo-field"><label htmlFor="nc-date">Fecha</label><input id="nc-date" type="date" /></div>
        <div className="milo-field"><label htmlFor="nc-supplier">Proveedor</label><input id="nc-supplier" type="search" placeholder="Código, nombre o CUIT" /></div>
        <div className="milo-field"><label htmlFor="nc-vat">Condición IVA</label><input id="nc-vat" /></div>
        <div className="milo-field"><label htmlFor="nc-cuit">CUIT/DNI</label><input id="nc-cuit" aria-describedby="nc-document-help" /><small id="nc-document-help">La ficha actual de proveedores admite CUIT; DNI requiere ampliar su contrato.</small></div>
        <div className="milo-field"><label htmlFor="nc-address">Dirección</label><input id="nc-address" /></div>
      </div>
      <div className="milo-field"><label htmlFor="nc-product">Artículos afectados</label><div className="milo-purchase-search"><input id="nc-product" type="search" placeholder="Código o descripción" /><button type="button" className="milo-secondary-button">Agregar artículo</button></div></div>
      <div className="milo-catalog-table-wrap" role="region" aria-label="Renglones de la nota de crédito" tabIndex={0}><table className="milo-catalog-table"><thead><tr>{["Cantidad", "Código", "Descripción", "Costo unitario ARS", "Subtotal ARS", "Acciones"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody><tr><td colSpan={6}>La edición de renglones se habilitará al aprobar las reglas de notas de crédito.</td></tr></tbody></table></div>
      <div className="milo-field"><label htmlFor="nc-notes">Observaciones</label><textarea id="nc-notes" rows={3} /></div>
    </fieldset></form>
  </RecordEditor>;
}

export function CreditNoteList({ q }: { q: string }) {
  return <section className="milo-panel-card"><p role="status">Consulta preparada. No existe todavía un registro operativo de notas de crédito; no se muestran importes ni documentos simulados.</p>
    <form className="milo-catalog-search" method="get" action="/panel/compras/notas-credito"><div className="milo-field"><label htmlFor="nc-q">Buscar nota de crédito</label><input id="nc-q" name="q" type="search" maxLength={100} defaultValue={q} placeholder="Código, comprobante o proveedor" /></div><button className="milo-secondary-button">Buscar</button></form>
    {q && <p className="milo-company-hint">Filtro: {q}. La búsqueda de documentos estará disponible cuando exista el modelo operativo.</p>}
    <div className="milo-catalog-table-wrap" role="region" aria-label="Consulta de notas de crédito" tabIndex={0}><table className="milo-catalog-table"><thead><tr>{["Código", "Fecha", "N/C", "Factura de referencia", "Proveedor", "Total ARS", "Acciones"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody><tr><td colSpan={7}>Listado y paginación pendientes del modelo de N/C.</td></tr></tbody></table></div>
    <Link className="milo-secondary-button" href="/panel/compras/notas-credito/nueva">Ver formulario de N/C</Link>
  </section>;
}
