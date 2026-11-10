"use client";
import { useActionState, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPresentation, updatePresentation, setPresentationPrice } from "@/app/panel/productos/presentation-actions";
import { formatPrice, parsePrice, formatEnteredPrice } from "@/lib/catalog/price-format";
import type { CatalogState, ManagedPresentation, PresentationManagement } from "@/lib/catalog/types";

const initial: CatalogState = { status: "idle" };
type SaveCallbacks = { onSaved: (message: string) => void; onPendingChange?: (pending: boolean) => void };
function Feedback({ state }: { state: CatalogState }) {
  return state.message ? <p className={state.status === "saved" ? "milo-company-success" : "milo-form-error"} role={state.status === "saved" ? "status" : "alert"}>{state.message}</p> : null;
}
function ParentInputs({ data }: { data: PresentationManagement }) {
  return <><input type="hidden" name="productId" value={data.productId} /><input type="hidden" name="productVersion" value={data.productVersion} /></>;
}

function PresentationForm({ data, presentation, onSaved, onPendingChange }: { data: PresentationManagement; presentation?: ManagedPresentation } & SaveCallbacks) {
  const [state, action, pending] = useActionState(presentation ? updatePresentation : createPresentation, initial);
  useEffect(() => { onPendingChange?.(pending); }, [pending, onPendingChange]);
  const [fields, setFields] = useState({ name: presentation?.name ?? "", unitCode: presentation?.unitCode ?? "", factor: presentation?.factor ?? "", isEnabled: presentation ? String(presentation.isEnabled) : "" });
  const set = (key: keyof typeof fields, value: string) => setFields(old => ({ ...old, [key]: value }));
  useEffect(() => { if (state.status === "saved") onSaved(state.message ?? "Presentación guardada."); }, [state.status, state.version, state.message, onSaved]);
  const frozen = presentation?.hasHistory ?? false;
  return <form action={action} className="milo-catalog-form" aria-busy={pending} onSubmit={() => onPendingChange?.(true)}>
    <ParentInputs data={data} />
    {presentation && <><input type="hidden" name="id" value={presentation.id} /><input type="hidden" name="version" value={state.version ?? presentation.version} /></>}
    <fieldset className="milo-catalog-fields" disabled={pending || (!presentation && state.status === "saved") || state.status === "conflict" || state.status === "forbidden" || !data.units.length}>
      <div className="milo-catalog-form-grid">
        <div className="milo-field"><label>Nombre de la presentación<input name="name" value={fields.name} onChange={e => set("name", e.target.value)} maxLength={200} required /></label></div>
        <div className="milo-field"><label>Estado<select name="isEnabled" value={fields.isEnabled} onChange={e => set("isEnabled", e.target.value)} required><option value="">Elegí un estado</option><option value="true">Habilitada</option><option value="false">Deshabilitada</option></select></label></div>
        {frozen ? <><input type="hidden" name="unitCode" value={presentation!.unitCode} /><input type="hidden" name="factor" value={presentation!.factor} /><p className="milo-company-hint">Con historial: unidad {presentation!.unitCode} y factor {presentation!.factor} protegidos. Podés cambiar el nombre y el estado.</p></> : <>
          <div className="milo-field"><label>Unidad comercial<select name="unitCode" value={fields.unitCode} onChange={e => set("unitCode", e.target.value)} required><option value="">Elegí una unidad compatible</option>{data.units.map(u => <option key={u.code} value={u.code}>{u.name} ({u.code})</option>)}</select></label></div>
          <div className="milo-field"><label>Factor a unidad base ({data.baseUnitCode})<input name="factor" value={fields.factor} onChange={e => set("factor", e.target.value)} inputMode="decimal" maxLength={19} required /></label><span className="milo-company-hint">Mayor a cero; hasta 3 decimales. Ingresá el factor explícito: no se deduce de la unidad.</span></div>
        </>}
      </div>
    </fieldset>
    {!data.units.length && <p className="milo-form-error">No hay unidades compatibles con la dimensión de este producto.</p>}
    <Feedback state={state} />
    <div className="milo-company-form-actions"><button className="milo-primary-button" disabled={pending || (!presentation && state.status === "saved") || state.status === "conflict" || state.status === "forbidden" || !data.units.length}>{pending ? "Guardando…" : presentation ? "Guardar presentación" : "Crear presentación"}</button>{(state.status === "conflict" || state.status === "error" || state.status === "invalid") && <a className="milo-secondary-button" href={`/panel/productos/${data.productId}`}>Recargar ficha</a>}</div>
  </form>;
}

function PriceForm({ data, presentation, onSaved, onPendingChange }: { data: PresentationManagement; presentation: ManagedPresentation } & SaveCallbacks) {
  const [state, action, pending] = useActionState(setPresentationPrice, initial);
  useEffect(() => { onPendingChange?.(pending); }, [pending, onPendingChange]);
  const [amount, setAmount] = useState(formatPrice(presentation.price ?? ""));
  useEffect(() => { if (state.status === "saved") onSaved(state.message ?? "Precio guardado."); }, [state.status, state.version, state.message, onSaved]);
  const blocked = !data.currency || pending || state.status === "conflict" || state.status === "forbidden";
  return <form action={action} className="milo-catalog-form milo-presentation-price" aria-busy={pending} onSubmit={() => onPendingChange?.(true)}>
    <ParentInputs data={data} /><input type="hidden" name="id" value={presentation.id} /><input type="hidden" name="version" value={state.version ?? presentation.version} /><input type="hidden" name="priceVersion" value={presentation.priceVersion} /><input type="hidden" name="currency" value={data.currency ?? ""} />
    <div className="milo-field"><label>Precio por presentación {data.currency ? `(${data.currency})` : ""}<input type="hidden" name="amount" value={parsePrice(amount) ?? "invalid"} /><input value={amount} onChange={e => { setAmount(e.target.value); e.target.setCustomValidity(parsePrice(e.target.value) === null ? "Usá punto para miles y coma para centavos; hasta 2 decimales." : ""); }} onBlur={() => setAmount(formatEnteredPrice(amount))} inputMode="decimal" maxLength={24} required disabled={blocked} /></label><span className="milo-company-hint">Punto para miles y coma para centavos (100.000,00). Cero o positivo; hasta 2 decimales, sin redondeo. No se admiten negativos. {presentation.price === null ? "Todavía no tiene precio; no se asigna cero automáticamente." : "Este cambio no modifica importes históricos."}</span></div>
    {!data.currency && <p className="milo-form-error">La empresa necesita una moneda configurada antes de guardar precios.</p>}
    <Feedback state={state} /><div className="milo-company-form-actions"><button className="milo-secondary-button" disabled={blocked}>{pending ? "Guardando…" : presentation.price === null ? "Configurar precio" : "Guardar precio"}</button>{(state.status === "conflict" || state.status === "error") && <a className="milo-secondary-button" href={`/panel/productos/${data.productId}`}>Recargar ficha</a>}</div>
  </form>;
}

export function PresentationManager({ data, onSaved, onPendingChange }: { data: PresentationManagement; onSaved?: (message: string) => void; onPendingChange?: (pending: boolean) => void }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const saved = useCallback((message: string) => { if (onSaved) { onSaved(message); return; } setNotice(message); router.refresh(); }, [router, onSaved]);
  return <section className="milo-company-readonly">
    <div className="milo-panel-card"><h2>Presentaciones comerciales</h2><p className="milo-company-hint">Unidad base: {data.baseUnitCode}. Precios con punto para miles y coma para centavos. Para factores, usá punto o coma decimal sin miles. No se calculan cantidades, fracciones o redondeos.</p>{notice && <p className="milo-company-success" role="status">{notice}</p>}
      <details className="milo-presentation-new"><summary>Crear presentación</summary><div className="milo-presentation-body"><PresentationForm key={`new:${data.presentations.length}:${data.productVersion}`} data={data} onSaved={saved} onPendingChange={onPendingChange} /><p className="milo-company-hint">La presentación se crea sin precio. Podés configurarlo después de guardarla.</p></div></details>
    </div>
    {!data.presentations.length && <p className="milo-catalog-empty">Este producto todavía no tiene presentaciones registradas.</p>}
    {data.presentations.map(p => <article className="milo-panel-card milo-presentation-card" key={`${p.id}:${p.version}:${p.priceVersion}:${data.productVersion}`}><header className="milo-panel-card-heading"><h3>{p.name}</h3><span className="milo-role-badge">{p.isEnabled ? "Habilitada" : "Deshabilitada"}</span></header><div className="milo-presentation-body"><PresentationForm data={data} presentation={p} onSaved={saved} onPendingChange={onPendingChange} /><PriceForm data={data} presentation={p} onSaved={saved} onPendingChange={onPendingChange} /></div></article>)}
  </section>;
}
