"use client";
import Link from "next/link";
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmPurchaseReceipt, savePurchaseDraft, searchPurchaseChoices } from "@/app/panel/compras/actions";
import { previewPurchase } from "@/lib/purchases/preview";
import { formatEnteredPrice, formatPrice, parsePrice } from "@/lib/catalog/price-format";
import type { PurchaseInput } from "@/lib/purchases/schema";
import type { Choice, PurchaseEditorData } from "@/lib/purchases/types";
import { RecordEditor, EditorFooter, EditorTabs, EditorTabPanel, useDirectEditorGuard, type EditorCallbacks } from "./record-editor";
import { confirmDiscard } from "./editor-interactions";

const PurchaseLineRow = memo(function PurchaseLineRow({ line, index, label, sku, cost, subtotal, received, branchId, movementId, onQuantity, onCost, onCostBlur, onRemove }: {
  line: PurchaseInput["lines"][number]; index: number; label: string; sku: string; cost: string; subtotal?: string;
  received: boolean; branchId: string; movementId?: string | null;
  onQuantity: (index: number, value: string) => void; onCost: (index: number, value: string) => void;
  onCostBlur: (index: number) => void; onRemove: (index: number) => void;
}) {
  return <tr><td>{received ? line.quantity : <input aria-label={`Cantidad del renglón ${index + 1}`} inputMode="numeric" required pattern="[0-9]{1,15}" maxLength={15} value={line.quantity} onChange={e => onQuantity(index, e.target.value)} />}</td><td>{sku}</td><td>{label}</td><td>{line.baseUnitCode}</td><td>{received ? formatPrice(line.unitCost) : <input aria-label={`Costo unitario ARS del renglón ${index + 1}`} inputMode="decimal" required maxLength={30} value={cost} onChange={e => onCost(index, e.target.value)} onBlur={() => onCostBlur(index)} />}</td><td>{subtotal ? formatPrice(subtotal) : "—"}</td><td>{received ? <Link href={`/panel/inventario/${line.productId}?branch=${branchId}`}>Ver movimiento<span className="sr-only"> {movementId}</span></Link> : <button type="button" className="milo-secondary-button" aria-label={`Quitar renglón ${index + 1}`} onClick={() => onRemove(index)}>Quitar</button>}</td></tr>;
});

function Lookup({ kind, label, disabled, onSelect, selected }: { kind: "suppliers" | "products"; label: string; disabled: boolean; onSelect: (choice: Choice) => void; selected?: Choice }) {
  const id = useId(), [q, setQ] = useState(""), [choices, setChoices] = useState<Choice[]>([]), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [value, setValue] = useState(selected?.id ?? ""), request = useRef(0);
  async function search() {
    const token = ++request.current; setBusy(true); setMessage("");
    try { const result = await searchPurchaseChoices({ kind, q }); if (token !== request.current) return;
      if (result.status === "ok") { setChoices(result.data); setMessage(result.data.length ? "Hasta 25 resultados. Refiná la búsqueda si hace falta." : "Sin resultados."); }
      else setMessage("No se pudo buscar. Revisá tu acceso y la conexión.");
    } catch { setMessage("No se pudo buscar. Intentá nuevamente."); }
    finally { if (token === request.current) setBusy(false); }
  }
  const options = selected && !choices.some(c => c.id === selected.id) ? [selected, ...choices] : choices;
  return <div className="milo-purchase-lookup" data-lookup={kind}><label htmlFor={`${id}-q`}>{label}</label><div className="milo-purchase-search"><input id={`${id}-q`} type="search" value={q} maxLength={100} placeholder={kind === "products" ? "Nombre o SKU" : "Razón social, nombre o CUIT"} disabled={disabled || busy} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void search(); } }} /><button type="button" className="milo-secondary-button" onClick={() => void search()} disabled={disabled || busy}>{busy ? "Buscando…" : "Buscar"}</button></div>
    <label className="sr-only" htmlFor={`${id}-choice`}>{kind === "products" ? "Artículo para agregar" : "Proveedor seleccionado"}</label><select id={`${id}-choice`} value={kind === "products" ? "" : value} disabled={disabled || busy} onChange={e => { const choice = options.find(c => c.id === e.target.value); if (choice) { setValue(choice.id); onSelect(choice); } }}><option value="">{kind === "products" ? "Seleccioná para agregar un renglón" : "Seleccioná un proveedor"}</option>{options.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select><small role="status">{message}</small>
  </div>;
}
export function PurchaseForm({ data, onSaved, onCancel, onPendingChange }: { data: PurchaseEditorData } & Partial<EditorCallbacks>) {
  const purchase = data.purchase, received = purchase?.status === "RECEIVED", id = useId(), router = useRouter();
  const [initial] = useState<PurchaseInput>(() => purchase?.input ?? { id: data.id, revision: 0, supplierId: "", branchId: "", date: data.date, reference: "", notes: "", lines: [] });
  const [fields, setFields] = useState(initial), [costs, setCosts] = useState(() => initial.lines.map(l => formatPrice(l.unitCost)));
  const [labels, setLabels] = useState(() => Object.fromEntries(purchase?.lines.map(l => [l.id, l.name]) ?? []));
  const [skus, setSkus] = useState<Record<string, string>>(() => Object.fromEntries(purchase?.lines.map(l => [l.id, l.sku]) ?? []));
  const [tax, setTax] = useState(() => initial.document?.taxAmount == null ? "" : formatPrice(initial.document.taxAmount));
  const [supplier, setSupplier] = useState<Choice | undefined>(() => purchase ? { id: purchase.input.supplierId, label: purchase.supplier, supplier: purchase.supplierDetails } : undefined);
  const [pending, setPending] = useState(false), [blocked, setBlocked] = useState(false), [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState(false), [saved, setSaved] = useState(false);
  const operation = useRef<string | null>(null), busy = useRef(false);
  const payload = useMemo(() => ({ ...fields, ...(fields.document ? { document: { ...fields.document, taxAmount: fields.document.taxAmount === null ? null : parsePrice(tax) ?? "invalid" } } : {}), lines: fields.lines.map((l, i) => ({ ...l, unitCost: parsePrice(costs[i] ?? "") ?? "invalid" })) }), [fields, costs, tax]);
  const changeQuantity = useCallback((index: number, value: string) => {
    setFields(old => ({ ...old, lines: old.lines.map((line, i) => i === index ? { ...line, quantity: value } : line) })); setConfirmation(false);
  }, []);
  const changeCost = useCallback((index: number, value: string) => { setCosts(old => old.map((cost, i) => i === index ? value : cost)); setConfirmation(false); }, []);
  const blurCost = useCallback((index: number) => { setCosts(old => old.map((cost, i) => i === index ? formatEnteredPrice(cost) : cost)); }, []);
  const removeLine = useCallback((index: number) => {
    setFields(old => ({ ...old, lines: old.lines.filter((_, i) => i !== index) })); setCosts(old => old.filter((_, i) => i !== index)); setConfirmation(false);
  }, []);
  const serialized = JSON.stringify(payload), dirty = serialized !== JSON.stringify(initial);
  const shortcut = useRef<"suppliers" | "products" | null>(null);
  const [tab, setTab] = useState<"data" | "articles" | "notes">("data");
  const taxEnabled = fields.document?.taxAmount != null;
  const currentQuote = useMemo(() => previewPurchase(fields.lines.map((line, index) => ({ quantity: line.quantity, unitCost: parsePrice(costs[index] ?? "") ?? "invalid" })), taxEnabled ? parsePrice(tax) ?? "invalid" : null), [fields.lines, taxEnabled, costs, tax]);
  useDirectEditorGuard(dirty, Boolean(onCancel), saved);
  useEffect(() => { onPendingChange?.(pending); }, [pending, onPendingChange]);
  useEffect(() => {
    if (!shortcut.current) return;
    window.document.getElementById(id)?.querySelector<HTMLInputElement>(`[data-lookup="${shortcut.current}"] input`)?.focus();
    shortcut.current = null;
  }, [tab, id]);
  function change<K extends keyof PurchaseInput>(key: K, value: PurchaseInput[K]) { setFields(old => ({ ...old, [key]: value })); setConfirmation(false); }
  async function submit(receive: boolean) {
    if (busy.current || blocked) return;
    busy.current = true; setPending(true); onPendingChange?.(true); setMessage("");
    try {
      if (receive && (!purchase || dirty || !confirmation)) { setMessage("Guardá los cambios y confirmá la recepción antes de continuar."); return; }
      if (receive && !operation.current) operation.current = crypto.randomUUID();
      const result = receive ? await confirmPurchaseReceipt({ id: data.id, revision: initial.revision, operationId: operation.current, confirmation: "RECEIVE" }) : await savePurchaseDraft(payload);
      setMessage(result.message);
      if (result.status === "saved") { setSaved(true); if (onSaved) onSaved(result.message, result.id); else { router.replace(`/panel/compras/${result.id}`); router.refresh(); } }
      else if (["conflict", "forbidden", "error"].includes(result.status)) setBlocked(true);
    } catch { setMessage("No se pudo confirmar el resultado. Recargá el detalle antes de reintentar."); setBlocked(true); }
    finally { busy.current = false; setPending(false); onPendingChange?.(false); }
  }
  const cancel = () => { if (!pending && confirmDiscard(dirty)) router.push("/panel/compras"); };
  const document = fields.document ?? { type: "" as const, pointOfSale: "", number: "", category: "", taxAmount: null };
  function changeDocument(patch: Partial<NonNullable<PurchaseInput["document"]>>) {
    const next = { ...document, ...patch };
    change("document", next.type || next.pointOfSale || next.number || next.category || next.taxAmount !== null ? next : undefined);
  }
  const supplierFields = supplier?.supplier;
  const total = received ? purchase.total : currentQuote?.total;
  return <RecordEditor className="milo-purchase-editor" tabs={<EditorTabs id={id} items={[["data", "Datos de la compra"], ["articles", "Artículos"], ["notes", "Observaciones"]] as const} value={tab} onChange={setTab} />} footer={<EditorFooter formId={id} pending={pending} disabled={blocked || saved} onCancel={onCancel ?? cancel} dirty={dirty} validation={message} reloadHref={blocked ? `/panel/compras/${data.id}` : undefined} summary={<strong>Total ARS: {total ? formatPrice(total) : "—"}</strong>} saveLabel="Guardar borrador" cancelLabel={received ? "Cerrar" : "Cancelar"} hideSave={received} actions={purchase && !received ? <button type="button" className="milo-primary-button" disabled={pending || blocked || saved || dirty || !confirmation} onClick={() => void submit(true)}>Confirmar recepción</button> : undefined} />}>
    <form id={id} className="milo-catalog-form" aria-busy={pending} onSubmit={e => { e.preventDefault(); void submit(false); }} onInvalidCapture={e => {
      const target = e.target as HTMLElement, panel = target.closest<HTMLElement>("[data-tab]");
      if (panel && panel.dataset.tab !== tab) { setTab(panel.dataset.tab as typeof tab); window.requestAnimationFrame(() => target.focus()); }
    }} onKeyDown={e => {
      if (!received && !pending && !blocked && ["F3", "F5"].includes(e.key)) {
        e.preventDefault(); shortcut.current = e.key === "F3" ? "suppliers" : "products"; setTab(e.key === "F3" ? "data" : "articles"); const form = e.currentTarget; form.querySelector<HTMLInputElement>(`[data-lookup="${e.key === "F3" ? "suppliers" : "products"}"] input`)?.focus();
      }
    }}>
      <p className="milo-company-hint"><strong>{purchase?.code ?? "Código asignado al guardar"}</strong> · {received ? "Recibida · documento inmutable" : "Borrador · no modifica stock"} · ARS</p>
      <fieldset className="milo-catalog-fields" disabled={pending || blocked || received}>
        <EditorTabPanel id={id} tab="data" active={tab}>
        {!data.documentReady && <p className="milo-company-hint" role="status">Tipo, número, categoría y desglose IVA requieren una migración adicional pendiente de autorización. El ingreso V1 y su referencia siguen disponibles.</p>}
        <fieldset className="milo-purchase-document" disabled={!data.documentReady}>
          <legend>Comprobante del proveedor</legend>
          <div className="milo-purchase-document-grid">
            <div className="milo-field"><label htmlFor={`${id}-document-type`}>Tipo de comprobante</label><select id={`${id}-document-type`} value={document.type} onChange={e => changeDocument({ type: e.target.value as typeof document.type })}><option value="">Sin informar</option><option value="FA">Factura A</option><option value="FB">Factura B</option><option value="FC">Factura C</option><option value="OTRO">Otro</option></select></div>
            <div className="milo-field"><label htmlFor={`${id}-pos`}>Punto de venta</label><input id={`${id}-pos`} inputMode="numeric" pattern="[0-9]{1,5}" maxLength={5} value={document.pointOfSale} onChange={e => changeDocument({ pointOfSale: e.target.value })} /></div>
            <div className="milo-field"><label htmlFor={`${id}-document-number`}>Número de comprobante</label><input id={`${id}-document-number`} inputMode="numeric" pattern="[0-9]{1,8}" maxLength={8} value={document.number} onChange={e => changeDocument({ number: e.target.value })} /></div>
            <div className="milo-field"><label htmlFor={`${id}-category`}>Categoría de compra</label><input id={`${id}-category`} maxLength={100} value={document.category} onChange={e => changeDocument({ category: e.target.value })} /></div>
          </div>
          <label className="milo-purchase-confirm"><input type="checkbox" checked={document.taxAmount !== null} onChange={e => { if (!e.target.checked && tax && !window.confirm("¿Descartar el IVA ingresado y quitar el desglose? Los costos no cambiarán.")) return; setTax(""); changeDocument({ taxAmount: e.target.checked ? "" : null }); }} /> Desglose Compra · costos sin IVA</label>
          {document.taxAmount !== null && <div className="milo-purchase-tax"><p>Neto ARS: {received ? purchase.net ? formatPrice(purchase.net) : "—" : currentQuote?.net ? formatPrice(currentQuote.net) : "—"}</p><div className="milo-field"><label htmlFor={`${id}-iva`}>IVA del comprobante (ARS)</label><input id={`${id}-iva`} required inputMode="decimal" maxLength={30} value={tax} onChange={e => setTax(e.target.value)} onBlur={() => setTax(formatEnteredPrice)} /></div><small>Ingresá el IVA informado por el proveedor. Se suma al neto; no se calcula una alícuota automática.</small></div>}
        </fieldset>
        <div className="milo-purchase-header">
          {received ? <div className="milo-field"><label>Proveedor</label><p>{purchase.supplier}</p></div> : <Lookup kind="suppliers" label="Proveedor" selected={supplier} disabled={pending || blocked} onSelect={choice => { setSupplier(choice); change("supplierId", choice.id); }} />}
          <div className="milo-field"><label htmlFor={`${id}-branch`}>Sucursal receptora</label><select id={`${id}-branch`} required value={fields.branchId} onChange={e => change("branchId", e.target.value)}><option value="">Seleccioná una sucursal</option>{data.branches.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</select></div>
          <div className="milo-field"><label htmlFor={`${id}-date`}>Fecha</label><input id={`${id}-date`} type="date" min="1900-01-01" max="9999-12-31" required value={fields.date} onChange={e => change("date", e.target.value)} /></div>
          <div className="milo-field"><label htmlFor={`${id}-reference`}>Referencia del proveedor (opcional)</label><input id={`${id}-reference`} maxLength={200} value={fields.reference} onChange={e => change("reference", e.target.value)} /></div>
        </div>
        <section className="milo-purchase-supplier" aria-label="Datos actuales del proveedor"><p className="milo-company-hint">Ficha actual del proveedor · búsqueda F3 · solo consulta</p><dl className="milo-purchase-supplier-grid">{[["Código", supplierFields?.code], ["Nombre", supplierFields?.name ?? supplier?.label], ["Condición IVA", data.vatConditions?.find(([code]) => code === supplierFields?.vatCondition)?.[1] ?? supplierFields?.vatCondition], ["CUIT", supplierFields?.cuit], ["Dirección", supplierFields?.address]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Sin informar"}</dd></div>)}</dl><small>DNI no está disponible en la ficha actual de proveedores.</small></section>
        </EditorTabPanel>
        <EditorTabPanel id={id} tab="articles" active={tab}>
        {!received && <Lookup kind="products" label="Agregar artículo · nombre o SKU" disabled={pending || blocked || fields.lines.length >= 100} onSelect={choice => { const lineId = crypto.randomUUID(); setLabels(old => ({ ...old, [lineId]: choice.name ?? choice.label })); setSkus(old => ({ ...old, [lineId]: choice.sku ?? "—" })); setCosts(old => [...old, ""]); change("lines", [...fields.lines, { id: lineId, productId: choice.id, baseUnitCode: choice.unit!, quantity: "", unitCost: "" }]); }} />}
        <p className="milo-company-hint">Cantidades enteras en la unidad base. Costo con punto de miles y coma decimal. No modifica precios de venta ni registra pagos.</p>
        <div className="milo-catalog-table-wrap milo-purchase-lines" role="region" aria-label="Artículos de la compra" tabIndex={0}><table className="milo-catalog-table"><thead><tr>{["Cantidad", "Código", "Descripción", "Unidad", "Costo unitario ARS", "Subtotal ARS", ...(received ? ["Movimiento"] : ["Acción"])].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>
          {fields.lines.map((line, index) => <PurchaseLineRow key={line.id} line={line} index={index} label={labels[line.id] ?? line.productId} sku={skus[line.id] ?? "—"} cost={costs[index]} subtotal={received ? purchase.lines[index].subtotal : currentQuote?.subtotals[index]} received={!!received} branchId={fields.branchId} movementId={purchase?.lines[index]?.movementId} onQuantity={changeQuantity} onCost={changeCost} onCostBlur={blurCost} onRemove={removeLine} />)}
          {!fields.lines.length && <tr><td colSpan={7}>Buscá y agregá al menos un artículo.</td></tr>}
        </tbody></table></div>
        </EditorTabPanel>
        <EditorTabPanel id={id} tab="notes" active={tab}>
        <div className="milo-field"><label htmlFor={`${id}-notes`}>Observaciones internas</label><textarea id={`${id}-notes`} rows={2} maxLength={2000} value={fields.notes} onChange={e => change("notes", e.target.value)} /></div>
        </EditorTabPanel>
      </fieldset>
      {purchase && <p className="milo-company-hint">Creada por {purchase.creator} · {new Date(purchase.createdAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}{purchase.receivedAt && <> · Recibida por {purchase.receiver} · {new Date(purchase.receivedAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</>}</p>}
      {purchase && !received && <label className="milo-purchase-confirm"><input type="checkbox" data-purchase-receipt="" checked={confirmation} disabled={pending || blocked || dirty} onChange={e => setConfirmation(e.target.checked)} /> Confirmo la recepción completa en {purchase.branch}. Se sumarán las cantidades guardadas al stock una sola vez.</label>}
      {dirty && purchase && <p className="milo-company-hint">Guardá el borrador antes de confirmar su recepción.</p>}
    </form>
  </RecordEditor>;
}
