"use client";
import { useActionState, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomer, updateCustomer } from "@/app/panel/clientes/actions";
import { RecordEditor, EditorFooter, useDirectEditorGuard, type EditorCallbacks } from "./record-editor";
import type { CustomerState, CustomerView } from "@/lib/customers/types";
import { CommercialCustomerForm } from "./commercial-customer-form";

export function CustomerForm(props: { customer?: CustomerView; schemaReady?: boolean } & Partial<EditorCallbacks>) {
  return props.schemaReady || props.customer?.schemaReady ? <CommercialCustomerForm {...props} /> : <BasicCustomerForm {...props} />;
}
function BasicCustomerForm({ customer, onSaved, onCancel, onPendingChange }: { customer?: CustomerView } & Partial<EditorCallbacks>) {
  const [state, action, pending] = useActionState(customer ? updateCustomer : createCustomer, { status: "idle" } as CustomerState);
  const [initial] = useState({ name: customer?.name ?? "", email: customer?.email ?? "", phone: customer?.phone ?? "", address: customer?.address ?? "" });
  const [fields, setFields] = useState(initial);
  const id = useId();
  const router = useRouter();
  const dirty = JSON.stringify(fields) !== JSON.stringify(initial);
  const blocked = customer?.editable === false || state.status === "forbidden" || state.status === "conflict";
  useDirectEditorGuard(dirty, Boolean(onCancel), state.status === "saved");
  useEffect(() => { onPendingChange?.(pending); }, [pending, onPendingChange]);
  useEffect(() => {
    if (state.status !== "saved") return;
    if (onSaved) { onSaved(state.message ?? "Cliente guardado.", state.id); return; }
    if (!customer && state.id) router.replace(`/panel/clientes/${state.id}`);
    router.refresh();
  }, [state.status, state.version, state.id, state.message, customer, onSaved, router]);
  return <RecordEditor footer={<EditorFooter formId={id} pending={pending} disabled={blocked || (!customer && state.status === "saved")} onCancel={onCancel} cancelHref="/panel/clientes" reloadHref={customer && (state.status === "conflict" || state.status === "error") ? `/panel/clientes/${customer.id}` : undefined} dirty={dirty} />}>
    <form id={id} action={action} className="milo-catalog-form" aria-busy={pending} onSubmit={() => onPendingChange?.(true)}>
      <p className="milo-company-hint">Los nuevos campos comerciales y Eliminar estarán disponibles después de aplicar la migración de Clientes. El formulario anterior sigue operativo.</p>
      {customer && <><input type="hidden" name="id" value={customer.id} /><input type="hidden" name="version" value={state.version ?? customer.version} /></>}
      <p className="milo-company-hint">{customer?.statusLabel ?? "Registrado — sin autorización comercial"}. Esta ficha no habilita precios privados ni compras.</p>
      {customer?.contactState === "legacy" && <p className="milo-form-error" role="alert">La ficha anterior tiene un formato no compatible. Se conserva sin sobrescribir; su adaptación requiere revisión.</p>}
      {customer?.contactState === "empty" && <p className="milo-company-hint">Podés completar esta ficha sin modificar su estado anterior.</p>}
      <fieldset className="milo-catalog-fields" disabled={pending || blocked}>
        <div className="milo-catalog-form-grid">{([
          ["name", "Nombre / denominación comercial", 200, "text", "organization"],
          ["email", "Correo electrónico (opcional)", 254, "email", "email"],
          ["phone", "Teléfono (opcional)", 50, "tel", "tel"],
          ["address", "Dirección (opcional)", 400, "text", "street-address"],
        ] as const).map(([key, label, maxLength, type, autoComplete]) => <div className="milo-field" key={key}><label htmlFor={`${id}-${key}`}>{label}</label><input id={`${id}-${key}`} name={key} type={type} autoComplete={autoComplete} value={fields[key]} onChange={event => setFields(previous => ({ ...previous, [key]: event.target.value }))} maxLength={maxLength} required={key === "name"} autoFocus={key === "name" && Boolean(onCancel)} /></div>)}</div>
      </fieldset>
      {state.message && <p className={state.status === "saved" ? "milo-company-success" : "milo-form-error"} role={state.status === "saved" ? "status" : "alert"}>{state.message}</p>}
    </form>
  </RecordEditor>;
}
