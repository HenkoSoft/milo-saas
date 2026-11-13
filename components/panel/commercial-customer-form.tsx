"use client";
import { useActionState, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomer, updateCustomer } from "@/app/panel/clientes/actions";
import { emptyCommercialFields, commercialFieldLimits, vatConditions, type CommercialFields } from "@/lib/customers/commercial-fields";
import type { CustomerState, CustomerView } from "@/lib/customers/types";
import { RecordEditor, EditorFooter, EditorTabs, EditorTabPanel, useDirectEditorGuard, type EditorCallbacks } from "./record-editor";

const tabs = [["data", "Datos"], ["commercial", "Datos comerciales"], ["notes", "Observaciones"]] as const;
const labels: Record<keyof typeof commercialFieldLimits, string> = {
  legalName: "Razón social / nombre comercial", contactName: "Nombre de contacto", phone: "Teléfono", mobilePhone: "Celular", whatsapp: "WhatsApp", email: "Correo electrónico", instagram: "Instagram", address: "Dirección", postalCode: "Código postal", city: "Localidad", province: "Provincia", country: "País",
};
export function CommercialCustomerForm({ customer, onSaved, onCancel, onPendingChange }: { customer?: CustomerView } & Partial<EditorCallbacks>) {
  const [state, action, pending] = useActionState(customer ? updateCustomer : createCustomer, { status: "idle" } as CustomerState);
  const [initial] = useState(() => customer?.details ?? emptyCommercialFields());
  const [fields, setFields] = useState(initial);
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("data");
  const id = useId(), router = useRouter();
  const dirty = JSON.stringify(fields) !== JSON.stringify(initial);
  const blocked = customer?.editable === false || state.status === "conflict" || state.status === "forbidden";
  useDirectEditorGuard(dirty, Boolean(onCancel), state.status === "saved");
  useEffect(() => { onPendingChange?.(pending); }, [pending, onPendingChange]);
  useEffect(() => {
    if (state.status !== "saved") return;
    if (onSaved) { onSaved(state.message ?? "Cliente guardado.", state.id); return; }
    if (!customer && state.id) router.replace(`/panel/clientes/${state.id}`);
    router.refresh();
  }, [state.status, state.version, state.id, state.message, customer, onSaved, router]);
  const change = (key: keyof CommercialFields, value: string) => setFields(previous => ({ ...previous, [key]: value }));
  return <RecordEditor className="milo-customer-editor" tabs={<EditorTabs id={id} items={tabs} value={tab} onChange={setTab} />} footer={<EditorFooter formId={id} pending={pending} disabled={blocked || (!customer && state.status === "saved")} onCancel={onCancel} cancelHref="/panel/clientes" dirty={dirty} validation={state.status !== "saved" ? state.message : undefined} reloadHref={customer && state.status === "conflict" ? `/panel/clientes/${customer.id}` : undefined} />}>
    <form id={id} action={action} className="milo-catalog-form" aria-busy={pending} onSubmit={() => onPendingChange?.(true)} onInvalid={event => {
      const target = event.target as HTMLInputElement;
      const pane = target.closest<HTMLElement>("[data-tab]");
      if (pane?.hidden) { setTab(pane.dataset.tab as typeof tab); requestAnimationFrame(() => { target.focus(); target.reportValidity(); }); }
    }}>
      <input type="hidden" name="profileMode" value="extended" />
      {customer && <><input type="hidden" name="id" value={customer.id} /><input type="hidden" name="version" value={state.version ?? customer.version} /></>}
      <p className="milo-company-hint"><strong>{customer?.commercialCode ?? "Código automático al guardar"}</strong> · {customer?.statusLabel ?? "Registrado — sin autorización comercial"}. Esta ficha no habilita compras ni precios privados.</p>
      {customer && !initial.legalName && !initial.contactName && customer.name && <p className="milo-company-hint">Denominación anterior conservada: {customer.name}. Completá los nuevos campos solo cuando corresponda.</p>}
      {customer?.contactState === "legacy" && <p className="milo-company-hint">El contenido histórico no compatible se conserva separado; no se sobrescribe y bloquea Eliminar.</p>}
      <fieldset className="milo-catalog-fields" disabled={pending || blocked}>
        <EditorTabPanel id={id} tab="data" active={tab}>
          <div className="milo-catalog-form-grid milo-customer-grid">{(Object.keys(labels) as (keyof typeof labels)[]).map(key => <div className="milo-field" key={key}>
            <label htmlFor={`${id}-${key}`}>{labels[key]}</label>
            <input id={`${id}-${key}`} name={key} type={key === "email" ? "email" : ["phone", "mobilePhone", "whatsapp"].includes(key) ? "tel" : "text"} value={fields[key]} maxLength={commercialFieldLimits[key]} onChange={event => change(key, event.target.value)} autoFocus={key === "legalName" && Boolean(onCancel)} />
          </div>)}</div>
        </EditorTabPanel>
        <EditorTabPanel id={id} tab="commercial" active={tab}>
          <p className="milo-company-hint">Datos fiscales opcionales. Si indicás un documento, completá su tipo y número. La validación de formato no acredita identidad ni inscripción fiscal.</p>
          <div className="milo-catalog-form-grid milo-customer-grid">
            <div className="milo-field"><label htmlFor={`${id}-documentType`}>Tipo de documento</label><select id={`${id}-documentType`} name="documentType" value={fields.documentType} onChange={event => change("documentType", event.target.value)}><option value="">Sin especificar</option><option>DNI</option><option>CUIT</option></select></div>
            <div className="milo-field"><label htmlFor={`${id}-documentNumber`}>Número de documento</label><input id={`${id}-documentNumber`} name="documentNumber" inputMode="numeric" maxLength={20} value={fields.documentNumber} onChange={event => change("documentNumber", event.target.value)} /></div>
            <div className="milo-field"><label htmlFor={`${id}-vatCondition`}>Condición frente al IVA</label><select id={`${id}-vatCondition`} name="vatCondition" value={fields.vatCondition} onChange={event => change("vatCondition", event.target.value)}><option value="">Sin especificar</option>{vatConditions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          </div>
        </EditorTabPanel>
        <EditorTabPanel id={id} tab="notes" active={tab}><div className="milo-field"><label htmlFor={`${id}-internalNotes`}>Observaciones internas</label><textarea id={`${id}-internalNotes`} name="internalNotes" rows={5} maxLength={2000} value={fields.internalNotes} onChange={event => change("internalNotes", event.target.value)} /><small>Información interna de la empresa. Máximo 2.000 caracteres.</small></div></EditorTabPanel>
      </fieldset>
      {state.status === "saved" && <p role="status" className="milo-company-success">{state.message}</p>}
    </form>
  </RecordEditor>;
}
