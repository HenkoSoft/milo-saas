"use client";
import { useState } from "react";
import { useRecordListRefresh } from "./record-workspace";
export function RecordDeleteAction({ id, version, label, kind, action }: {
  id: string; version: string; label: string; kind: string;
  action: (form: FormData) => Promise<{ status: string; message?: string }>;
}) {
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  const refresh = useRecordListRefresh();
  return <><button type="button" className="milo-secondary-button milo-table-edit-action" title="Eliminar" aria-label={`Eliminar ${label}`} disabled={pending} onClick={async () => {
    if (pending || !window.confirm(`¿Eliminar ${label}? Esta acción es permanente y solo se permite si no hay historial comercial ni referencias protegidas.`)) return;
    setPending(true); setError("");
    const form = new FormData(); form.set("id", id); form.set("version", version); form.set("confirmation", "DELETE");
    try {
      const result = await action(form);
      if (result.status === "saved") refresh(result.message ?? `${kind} eliminado.`);
      else setError(result.message ?? `No se pudo eliminar el ${kind.toLowerCase()}.`);
    } catch { setError("No se pudo confirmar la operación. Recargá antes de reintentar."); }
    finally { setPending(false); }
  }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg></button>{error && <span role="alert" className="milo-form-error">{error}</span>}</>;
}
