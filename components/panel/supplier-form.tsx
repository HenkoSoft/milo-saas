"use client";
import { useActionState, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupplier, updateSupplier } from "@/app/panel/proveedores/actions";
import { emptySupplierFields, supplierFieldLimits, vatConditions, type SupplierFields } from "@/lib/suppliers/fields";
import type { SupplierState, SupplierView } from "@/lib/suppliers/types";
import { RecordEditor, EditorFooter, useDirectEditorGuard, type EditorCallbacks } from "./record-editor";
const labels: Record<keyof typeof supplierFieldLimits, string> = {
  legalName: "Razón social", commercialName: "Nombre comercial", contactName: "Nombre de contacto", phone: "Teléfono", whatsapp: "WhatsApp", email: "Correo electrónico", address: "Dirección", postalCode: "Código postal", city: "Localidad", province: "Provincia", country: "País",
};
const fieldOrder = ["legalName", "contactName", "address", "city", "postalCode", "province", "country", "phone", "cuit", "vatCondition", "email", "commercialName", "whatsapp"] as const;
export function SupplierForm({ supplier, onSaved, onCancel, onPendingChange }: { supplier?: SupplierView } & Partial<EditorCallbacks>) {
  const [state, action, pending] = useActionState(supplier ? updateSupplier : createSupplier, { status: "idle" } as SupplierState);
  const [initial] = useState(() => supplier?.details ?? emptySupplierFields());
  const [fields, setFields] = useState(initial);
  const id = useId(), router = useRouter();
  const dirty = JSON.stringify(fields) !== JSON.stringify(initial), blocked = state.status === "conflict" || state.status === "forbidden";
  useDirectEditorGuard(dirty, Boolean(onCancel), state.status === "saved");
  useEffect(() => { onPendingChange?.(pending); }, [pending, onPendingChange]);
  useEffect(() => {
    if (state.status !== "saved") return;
    if (onSaved) { onSaved(state.message ?? "Proveedor guardado.", state.id); return; }
    if (!supplier && state.id) router.replace(`/panel/proveedores/${state.id}`);
    router.refresh();
  }, [state.status, state.version, state.id, state.message, supplier, onSaved, router]);
  const change = (key: keyof SupplierFields, value: string) => setFields(previous => ({ ...previous, [key]: value }));
  return <RecordEditor className="milo-supplier-editor" footer={<EditorFooter formId={id} pending={pending} disabled={blocked || (!supplier && state.status === "saved")} onCancel={onCancel} cancelHref="/panel/proveedores" dirty={dirty} validation={state.status !== "saved" ? state.message : undefined} reloadHref={supplier && state.status === "conflict" ? `/panel/proveedores/${supplier.id}` : undefined} />}>
    <form id={id} action={action} className="milo-catalog-form" aria-busy={pending} onSubmit={() => onPendingChange?.(true)}>
      {supplier && <><input type="hidden" name="id" value={supplier.id} /><input type="hidden" name="version" value={state.version ?? supplier.version} /></>}
      <p id={`${id}-hint`} className="milo-company-hint">Completá una razón social o un nombre comercial. Los datos fiscales son opcionales.</p>
      <fieldset className="milo-catalog-fields" disabled={pending || blocked}>
        <div className="milo-supplier-grid">
          <div className="milo-field" data-field="code"><label htmlFor={`${id}-code`}>Código</label><input id={`${id}-code`} value={supplier?.commercialCode ?? "Asignado al guardar"} readOnly aria-describedby={`${id}-hint`} /></div>
          {fieldOrder.map(key => <div className="milo-field" key={key} data-field={key}>
            <label htmlFor={`${id}-${key}`}>{key === "cuit" ? "CUIT" : key === "vatCondition" ? "Condición frente al IVA" : labels[key]}</label>
            {key === "vatCondition" ? <select id={`${id}-${key}`} name={key} value={fields[key]} onChange={event => change(key, event.target.value)}><option value="">Sin especificar</option>{vatConditions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> : <input id={`${id}-${key}`} name={key} type={key === "email" ? "email" : ["phone", "whatsapp"].includes(key) ? "tel" : "text"} inputMode={key === "cuit" ? "numeric" : undefined} value={fields[key]} maxLength={key === "cuit" ? 20 : supplierFieldLimits[key]} onChange={event => change(key, event.target.value)} autoFocus={key === "legalName" && Boolean(onCancel)} />}
          </div>)}
          <div className="milo-field" data-field="internalNotes"><label htmlFor={`${id}-internalNotes`}>Observaciones internas</label><textarea id={`${id}-internalNotes`} name="internalNotes" rows={3} maxLength={2000} value={fields.internalNotes} onChange={event => change("internalNotes", event.target.value)} /></div>
        </div>
      </fieldset>
      {state.status === "saved" && <p role="status" className="milo-company-success">{state.message}</p>}
    </form>
  </RecordEditor>;
}
