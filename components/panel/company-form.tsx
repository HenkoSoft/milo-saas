"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateCompany } from "@/app/panel/empresa/actions";
import type { CompanyFormState } from "@/lib/company/types";

export function CompanyForm({ commercialName, version }: { commercialName: string | null; version: string }) {
  const initial: CompanyFormState = { status: "idle", values: { commercialName: commercialName ?? "", version } };
  const [state, action, pending] = useActionState(updateCompany, initial);
  const router = useRouter();
  useEffect(() => {
    if (state.status === "saved") router.refresh();
  }, [state.status, state.values?.version, router]);
  const values = state.values ?? initial.values!;
  return <form className="milo-company-form" action={action} aria-busy={pending}>
    <input type="hidden" name="version" value={values.version} />
    <div className="milo-field">
      <label htmlFor="commercial-name">Nombre comercial</label>
      <input key={values.version} id="commercial-name" name="commercialName" type="text" defaultValue={values.commercialName} maxLength={200} autoComplete="organization" disabled={pending} aria-invalid={!!state.nameError} aria-describedby={state.nameError ? "company-name-hint company-name-error" : "company-name-hint"} />
      <span id="company-name-hint" className="milo-company-hint">El nombre con el que identificás a tu empresa. Podés dejarlo vacío.</span>
      {state.nameError && <p id="company-name-error" role="alert">{state.nameError}</p>}
    </div>
    {state.message && <p className={state.status === "saved" ? "milo-company-success" : "milo-form-error"} role={state.status === "saved" ? "status" : "alert"}>{state.message}</p>}
    <div className="milo-company-form-actions"><button className="milo-primary-button" type="submit" disabled={pending || state.status === "forbidden" || state.status === "conflict"}>{pending ? "Guardando…" : "Guardar cambios"}<span aria-hidden="true">→</span></button>
      {(state.status === "conflict" || state.status === "error") && <a className="milo-secondary-button" href="/panel/empresa">Volver a cargar</a>}
    </div>
  </form>;
}
