"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBranch, updateBranch } from "@/app/panel/sucursales/actions";
import type { BranchState, BranchView } from "@/lib/branches/types";

export function BranchForm({ branch }: { branch?: BranchView }) {
  const [state, action, pending] = useActionState(branch ? updateBranch : createBranch, { status: "idle" } as BranchState);
  const [name, setName] = useState(branch?.name ?? "");
  const router = useRouter();
  const editingId = branch?.id;
  useEffect(() => {
    if (state.status === "saved") {
      if (!editingId && state.id) router.replace(`/panel/sucursales/${state.id}`);
      router.refresh();
    }
  }, [state.status, state.version, state.id, editingId, router]);
  const blocked = pending || state.status === "forbidden" || state.status === "conflict" || (!branch && state.status === "saved");
  return <form action={action} className="milo-catalog-form" aria-busy={pending}>
    {branch && <><input type="hidden" name="id" value={branch.id} /><input type="hidden" name="version" value={state.version ?? branch.version} /></>}
    <div className="milo-field"><label htmlFor="branch-name">Nombre de la sucursal</label><input id="branch-name" name="name" value={name} onChange={e => setName(e.target.value)} maxLength={200} required disabled={blocked} aria-describedby="branch-name-help" autoComplete="off" /><span id="branch-name-help" className="milo-company-hint">Usá el nombre comercial con el que tu empresa identifica esta sucursal.</span></div>
    {state.message && <p className={state.status === "saved" ? "milo-company-success" : "milo-form-error"} role={state.status === "saved" ? "status" : "alert"}>{state.message}</p>}
    <div className="milo-company-form-actions"><button className="milo-primary-button" disabled={blocked}>{pending ? "Guardando…" : branch ? "Guardar cambios" : "Crear sucursal"}</button><a className="milo-secondary-button" href={branch && (state.status === "conflict" || state.status === "error") ? `/panel/sucursales/${branch.id}` : "/panel/sucursales"}>{state.status === "conflict" || state.status === "error" ? "Volver a cargar" : "Volver al listado"}</a></div>
  </form>;
}
