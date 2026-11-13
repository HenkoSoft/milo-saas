"use client";

import { useEffect, type ReactNode } from "react";
import { confirmDiscard } from "./editor-interactions";

export type EditorCallbacks = {
  onSaved: (message: string, id?: string) => void;
  onCancel: () => void;
  onPendingChange: (pending: boolean) => void;
};

export function useDirectEditorGuard(dirty: boolean, modal: boolean, saved: boolean) {
  useEffect(() => {
    if (modal || !dirty || saved) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, modal, saved]);
}

export function EditorTabs<T extends string>({ id, items, value, onChange }: { id: string; items: readonly (readonly [T, string])[]; value: T; onChange: (value: T) => void }) {
  return <div role="tablist" aria-label="Secciones del formulario" className="milo-record-tabs" onKeyDown={event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = items.findIndex(item => item[0] === value);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowLeft" ? -1 : 1) + items.length) % items.length;
    onChange(items[next][0]); document.getElementById(`${id}-tab-${items[next][0]}`)?.focus();
  }}>{items.map(([key, label]) => <button key={key} id={`${id}-tab-${key}`} role="tab" type="button" aria-selected={value === key} aria-controls={`${id}-${key}`} tabIndex={value === key ? 0 : -1} onClick={() => onChange(key)}>{label}</button>)}</div>;
}

export function EditorTabPanel({ id, tab, active, children, className }: { id: string; tab: string; active: string; children: ReactNode; className?: string }) {
  return <div role="tabpanel" id={`${id}-${tab}`} aria-labelledby={`${id}-tab-${tab}`} data-tab={tab} className={className} hidden={active !== tab}>{children}</div>;
}

export function RecordEditor({ children, tabs, footer, className = "" }: { children: ReactNode; tabs?: ReactNode; footer: ReactNode; className?: string }) {
  return <section className={`milo-panel-card milo-record-editor ${className}`.trim()}>{tabs}<div className="milo-record-editor-body">{children}</div>{footer}</section>;
}

export function EditorFooter({ formId, pending, disabled, onCancel, cancelHref, reloadHref, dirty = false, validation, summary, actions, saveLabel = "Guardar", cancelLabel = "Cancelar", hideSave = false }: {
  formId: string; pending: boolean; disabled?: boolean; onCancel?: () => void; cancelHref?: string; reloadHref?: string; dirty?: boolean; validation?: string;
  summary?: ReactNode; actions?: ReactNode; saveLabel?: string; cancelLabel?: string; hideSave?: boolean;
}) {
  return <footer className="milo-record-editor-footer"><div aria-live="polite">{summary}{validation && <p className="milo-form-error" role="alert">{validation}</p>}</div><div className="milo-company-form-actions">
    {reloadHref && <a className="milo-secondary-button" href={reloadHref} onClick={event => { if (pending || !confirmDiscard(dirty)) event.preventDefault(); }}>Volver a cargar</a>}
    {onCancel ? <button className="milo-secondary-button" type="button" onClick={onCancel} disabled={pending}>{cancelLabel}</button> : <a className="milo-secondary-button" href={cancelHref} onClick={event => { if (pending || !confirmDiscard(dirty)) event.preventDefault(); }}>{cancelLabel}</a>}
    {!hideSave && <button form={formId} className="milo-primary-button" disabled={pending || disabled}>{pending ? "Guardando…" : saveLabel}</button>}{actions}
  </div></footer>;
}
