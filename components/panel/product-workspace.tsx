"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { loadProductEditor, type ProductEditorData } from "@/app/panel/productos/editor-actions";
import { ProductForm } from "./product-form";
import { PresentationManager } from "./presentation-manager";

export function ProductWorkspace({ children }: { children: ReactNode }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const dirty = useRef(false);
  const busy = useRef(false);
  const request = useRef(0);
  const dirtyForms = useRef(new Set<HTMLFormElement>());
  const position = useRef({ main: 0, table: 0, left: 0 });
  const restoreAfterRefresh = useRef(false);
  const historyEntry = useRef<string | null>(null);
  const [editor, setEditor] = useState<ProductEditorData | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [formWarning, setFormWarning] = useState("");
  const invalidateRequest = useCallback(() => { request.current++; }, []);
  const pendingChanged = useCallback((value: boolean) => { busy.current = value; setSaving(value); }, []);
  const restorePosition = useCallback(() => {
    const main = workspace.current?.closest("main");
    const table = workspace.current?.querySelector(".milo-catalog-table-wrap");
    if (main) main.scrollTop = position.current.main;
    if (table) { table.scrollTop = position.current.table; table.scrollLeft = position.current.left; }
  }, []);

  useLayoutEffect(() => {
    if (!restoreAfterRefresh.current) return;
    restorePosition();
    if (!trigger.current?.isConnected) workspace.current?.querySelector<HTMLElement>("[data-product-editor]")?.focus({ preventScroll: true });
    restoreAfterRefresh.current = false;
  }, [children, restorePosition]);

  const close = useCallback(() => {
    request.current++;
    dialog.current?.close();
    if (historyEntry.current) { historyEntry.current = null; window.history.back(); }
    dirty.current = false;
    dirtyForms.current.clear();
    setEditor(null);
    trigger.current?.focus({ preventScroll: true });
    restorePosition();
  }, [restorePosition]);
  const cancel = useCallback(() => {
    if (busy.current) return;
    if (dirty.current && !window.confirm("Hay cambios sin guardar. ¿Querés descartarlos y cerrar?")) return;
    close();
  }, [close]);
  const saved = useCallback((message: string) => {
    setNotice(message);
    pendingChanged(false);
    close();
    restoreAfterRefresh.current = true;
    // No navigation: q/page/any current filters and the mounted scroll containers survive.
    router.refresh();
  }, [close, pendingChanged, router]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dialog.current?.open && (dirty.current || busy.current)) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    const back = (event: PopStateEvent) => {
      if (!dialog.current?.open || !historyEntry.current || event.state?.miloProductEditor === historyEntry.current) return;
      if (busy.current || (dirty.current && !window.confirm("Hay cambios sin guardar. ¿Querés descartarlos y cerrar?"))) {
        window.history.forward();
      } else { historyEntry.current = null; close(); }
    };
    window.addEventListener("popstate", back);
    return () => { invalidateRequest(); window.removeEventListener("beforeunload", warn); window.removeEventListener("popstate", back); };
  }, [close, invalidateRequest]);

  async function openEditor(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-product-editor]") : null;
    if (!link || !workspace.current?.contains(link)) return;
    event.preventDefault();
    trigger.current = link;
    const main = workspace.current?.closest("main");
    const table = workspace.current?.querySelector(".milo-catalog-table-wrap");
    position.current = { main: main?.scrollTop ?? 0, table: table?.scrollTop ?? 0, left: table?.scrollLeft ?? 0 };
    dirty.current = false;
    pendingChanged(false);
    setEditor(null);
    setError("");
    setFormWarning("");
    const sequence = ++request.current;
    // The first browser Back closes the dialog on the same list, with the same
    // discard warning. Copy Next's existing state so its router can restore it.
    historyEntry.current = `${Date.now()}:${sequence}`;
    window.history.pushState({ ...window.history.state, miloProductEditor: historyEntry.current }, "", window.location.href);
    dialog.current?.showModal();
    try {
      const result = await loadProductEditor(link.dataset.productEditor || null);
      if (sequence !== request.current) return;
      if (result.status === "ok") setEditor(result.data);
      else setError(result.status === "forbidden" ? "Tu acceso no permite administrar productos." : "No pudimos cargar el producto. Cerrá y volvé a intentarlo o usá su enlace directo.");
    } catch {
      if (sequence === request.current) setError("No pudimos cargar el formulario. Cerrá y volvé a intentarlo.");
    }
  }

  return <div ref={workspace} className="milo-product-workspace" onClickCapture={openEditor}>
    <p className="milo-product-list-notice" role="status">{notice}</p>
    {children}
    <dialog ref={dialog} className="milo-product-dialog" aria-labelledby="product-dialog-title" aria-describedby="product-dialog-description" onCancel={event => { event.preventDefault(); cancel(); }}>
      <header className="milo-product-dialog-heading"><div><h2 id="product-dialog-title">{editor?.product ? "Editar producto" : "Nuevo producto"}</h2><p id="product-dialog-description">Ficha comercial y precio de venta de tu empresa.</p></div><button type="button" className="milo-secondary-button" onClick={cancel} disabled={saving} aria-label="Cerrar formulario de producto" autoFocus>×</button></header>
      {formWarning && <p className="milo-form-error" role="alert">{formWarning}</p>}
      {editor ? <fieldset className="milo-product-modal-fields" disabled={saving} onChangeCapture={event => {
        dirty.current = true;
        const form = event.target instanceof Element ? event.target.closest("form") : null;
        if (form) dirtyForms.current.add(form);
      }} onSubmitCapture={event => {
        if ([...dirtyForms.current].some(form => form !== event.target)) {
          event.preventDefault();
          event.stopPropagation();
          setFormWarning("Hay cambios sin guardar en otro formulario. Guardalos primero o cancelá para descartarlos.");
        } else setFormWarning("");
      }}>
        <ProductForm {...editor} onSaved={saved} onCancel={cancel} onPendingChange={pendingChanged} advanced={editor.management && <PresentationManager data={editor.management} onSaved={saved} onPendingChange={pendingChanged} />} />
      </fieldset> : <div className="milo-product-dialog-loading">{error ? <p role="alert">{error}</p> : <p role="status">Cargando formulario…</p>}<button type="button" className="milo-secondary-button" onClick={cancel}>Cancelar</button></div>}
    </dialog>
  </div>;
}
