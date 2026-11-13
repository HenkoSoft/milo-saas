"use client";

import { createContext, useContext, useCallback, useEffect, useLayoutEffect, useImperativeHandle, useId, useRef, useState, type ComponentType, type MouseEvent, type ReactNode, type Ref } from "react";
import { useRouter } from "next/navigation";
import { confirmDiscard, trapDialogFocus } from "./editor-interactions";
import type { EditorCallbacks } from "./record-editor";

export type EditorLoadResult<T> = { status: "ok"; data: T } | { status: "forbidden" | "invalid" | "missing" | "error" | "pending" };
export type RecordWorkspaceMode = "create" | "edit" | "closed";
export type RecordWorkspaceController = { openCreate: () => void; close: () => void };
const ListRefresh = createContext<(message: string) => void>(() => {});
export function useRecordListRefresh() { return useContext(ListRefresh); }

export function RecordWorkspace<T>({ children, loadEditor, Editor, createTitle, editTitle, description, compact = false, initialCreate = false, dialogClassName = "", controllerRef, onModeChange, returnPath }: {
  children: ReactNode; loadEditor: (id: string | null) => Promise<EditorLoadResult<T>>;
  Editor: ComponentType<{ data: T; callbacks: EditorCallbacks }>;
  createTitle: string; editTitle: string; description: string; compact?: boolean;
  initialCreate?: boolean; dialogClassName?: string;
  controllerRef?: Ref<RecordWorkspaceController>; onModeChange?: (mode: RecordWorkspaceMode) => void; returnPath?: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const [editing, setEditing] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const dirty = useRef(false);
  const busy = useRef(false);
  const request = useRef(0);
  const initialOpened = useRef(false);
  const dirtyForms = useRef(new Set<HTMLFormElement>());
  const position = useRef({ main: 0, table: 0, left: 0 });
  const restoreAfterRefresh = useRef(false);
  const historyEntry = useRef<string | null>(null);
  const [editor, setEditor] = useState<T | null>(null);
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
    if (!trigger.current?.isConnected) workspace.current?.querySelector<HTMLElement>("[data-record-editor]")?.focus({ preventScroll: true });
    restoreAfterRefresh.current = false;
  }, [children, restorePosition]);

  const close = useCallback(() => {
    request.current++;
    dialog.current?.close();
    const destination = new URL(window.location.href);
    const returnToList = returnPath && destination.pathname !== returnPath && destination.pathname.startsWith(returnPath + "/");
    if (returnToList) destination.pathname = returnPath;
    const replaceEntry = () => {
      window.history.replaceState(window.history.state, "", destination.href);
      restorePosition();
    };
    if (historyEntry.current) {
      historyEntry.current = null;
      // The direct route's underlying entry is still /ingresar. Canonicalize
      // that entry after consuming the modal's Back entry, preserving its query.
      if (returnToList) window.addEventListener("popstate", replaceEntry, { once: true });
      window.history.back();
    } else if (returnToList) replaceEntry();
    dirty.current = false;
    dirtyForms.current.clear();
    setEditor(null);
    trigger.current?.focus({ preventScroll: true });
    restorePosition();
    onModeChange?.("closed");
  }, [restorePosition, onModeChange, returnPath]);
  const cancel = useCallback(() => {
    if (busy.current) return;
    if (!confirmDiscard(dirty.current)) return;
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
  const refreshList = useCallback((message: string) => {
    const main = workspace.current?.closest("main");
    const table = workspace.current?.querySelector(".milo-catalog-table-wrap");
    position.current = { main: main?.scrollTop ?? 0, table: table?.scrollTop ?? 0, left: table?.scrollLeft ?? 0 };
    setNotice(message); restoreAfterRefresh.current = true; router.refresh();
  }, [router]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dialog.current?.open && (dirty.current || busy.current)) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    const back = (event: PopStateEvent) => {
      if (!dialog.current?.open || !historyEntry.current || event.state?.miloRecordEditor === historyEntry.current) return;
      if (busy.current || !confirmDiscard(dirty.current)) {
        window.history.forward();
      } else { historyEntry.current = null; close(); }
    };
    window.addEventListener("popstate", back);
    return () => { invalidateRequest(); window.removeEventListener("beforeunload", warn); window.removeEventListener("popstate", back); };
  }, [close, invalidateRequest]);

  async function openEditor(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-record-editor]") : null;
    if (!link || !workspace.current?.contains(link)) return;
    event.preventDefault();
    setEditing(Boolean(link.dataset.recordEditor));
    trigger.current = link;
    const main = workspace.current?.closest("main");
    const table = workspace.current?.querySelector(".milo-catalog-table-wrap");
    position.current = { main: main?.scrollTop ?? 0, table: table?.scrollTop ?? 0, left: table?.scrollLeft ?? 0 };
    dirty.current = false;
    dirtyForms.current.clear();
    pendingChanged(false);
    setEditor(null);
    setError("");
    setFormWarning("");
    setNotice("");
    const sequence = ++request.current;
    // The first browser Back closes the dialog on the same list, with the same
    // discard warning. Copy Next's existing state so its router can restore it.
    historyEntry.current = `${Date.now()}:${sequence}`;
    window.history.pushState({ ...window.history.state, miloRecordEditor: historyEntry.current }, "", window.location.href);
    dialog.current?.showModal();
    onModeChange?.(link.dataset.recordEditor ? "edit" : "create");
    try {
      const result = await loadEditor(link.dataset.recordEditor || null);
      if (sequence !== request.current) return;
      if (result.status === "ok") setEditor(result.data);
      else setError(result.status === "pending" ? "El formulario requiere una migración pendiente de autorización." : result.status === "forbidden" ? "Tu acceso no permite administrar estos registros." : "No pudimos cargar el registro. Cerrá y volvé a intentarlo o usá su enlace directo.");
    } catch {
      if (sequence === request.current) setError("No pudimos cargar el formulario. Cerrá y volvé a intentarlo.");
    }
  }

  // Direct create routes open through the very same click handler/showModal path.
  // Defer until effects settle; StrictMode cleanup must not strand an invalidated load.
  useEffect(() => {
    let active = true;
    if (initialCreate && !initialOpened.current) queueMicrotask(() => {
      if (!active) return;
      const link = workspace.current?.querySelector<HTMLAnchorElement>('a[data-record-editor=""]');
      if (link) { initialOpened.current = true; link.click(); }
    });
    return () => { active = false; };
  }, [initialCreate]);

  useImperativeHandle(controllerRef, () => ({
    openCreate: () => { if (!dialog.current?.open) workspace.current?.querySelector<HTMLAnchorElement>('a[data-record-editor=""]')?.click(); },
    close: () => { if (dialog.current?.open) cancel(); },
  }), [cancel]);

  return <div ref={workspace} className="milo-record-workspace" onClickCapture={openEditor}>
    <p className="milo-record-list-notice" role="status">{notice}</p>
    <ListRefresh.Provider value={refreshList}>{children}</ListRefresh.Provider>
    <dialog ref={dialog} className={`milo-record-dialog ${dialogClassName}`.trim()} data-compact={compact} aria-labelledby={titleId} aria-describedby={titleId + "-description"} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); cancel(); } else trapDialogFocus(event.currentTarget, event); }} onCancel={event => { event.preventDefault(); cancel(); }}>
      <header className="milo-record-dialog-heading"><div><h2 id={titleId}>{editing ? editTitle : createTitle}</h2><p id={titleId + "-description"}>{description}</p></div><button type="button" className="milo-secondary-button" onClick={cancel} disabled={saving} aria-label="Cerrar formulario" autoFocus>×</button></header>
      {formWarning && <p className="milo-form-error" role="alert">{formWarning}</p>}
      {editor ? <fieldset className="milo-record-modal-fields" disabled={saving} onChangeCapture={event => {
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
        <Editor data={editor} callbacks={{ onSaved: saved, onCancel: cancel, onPendingChange: pendingChanged }} />
      </fieldset> : <div className="milo-record-dialog-loading">{error ? <p role="alert">{error}</p> : <p role="status">Cargando formulario…</p>}<button type="button" className="milo-secondary-button" onClick={cancel}>Cancelar</button></div>}
    </dialog>
  </div>;
}
