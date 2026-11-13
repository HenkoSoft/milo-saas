"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { columns, limits, type TransferKind, type ImportPreview } from "@/lib/data-transfer/columns";
import { useRecordListRefresh } from "./record-workspace";
import { RecordEditor } from "./record-editor";
import { trapDialogFocus } from "./editor-interactions";
export function TransferToolbar({ kind, q }: { kind: TransferKind; q: string }) {
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState<ImportPreview | null>(null), [error, setError] = useState(""), [pending, setPending] = useState(false), [downloading, setDownloading] = useState(false), [page, setPage] = useState(1);
  const dialog = useRef<HTMLDialogElement>(null), fileInput = useRef<HTMLInputElement>(null), importButton = useRef<HTMLButtonElement>(null), newLink = useRef<HTMLAnchorElement>(null), operation = useRef(""), busy = useRef(false);
  const historyEntry = useRef<string | null>(null);
  const id = useId(), refreshList = useRecordListRefresh();
  const endpoint = `/panel/${kind}/archivo`, label = kind === "clientes" ? "cliente" : "proveedor";
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => { if (event.key !== "F4" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented || document.querySelector("dialog[open]")) return; event.preventDefault(); newLink.current?.click(); };
    document.addEventListener("keydown", shortcut); return () => document.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (busy.current) { event.preventDefault(); event.returnValue = ""; } };
    const back = (event: PopStateEvent) => { if (!dialog.current?.open || !historyEntry.current || event.state?.miloImport === historyEntry.current) return; if (busy.current) window.history.forward(); else { historyEntry.current = null; dialog.current.close(); importButton.current?.focus({ preventScroll: true }); } };
    window.addEventListener("beforeunload", warn); window.addEventListener("popstate", back);
    return () => { window.removeEventListener("beforeunload", warn); window.removeEventListener("popstate", back); };
  }, []);
  function close() { if (busy.current) return; dialog.current?.close(); if (historyEntry.current) { historyEntry.current = null; window.history.back(); } importButton.current?.focus({ preventScroll: true }); }
  async function saveFile(template: boolean) {
    if (downloading) return;
    setDownloading(true); setError("");
    try {
      const response = await fetch(`${endpoint}?mode=${template ? "template" : "export"}&q=${encodeURIComponent(q)}`, { cache: "no-store" });
      if (!response.ok) throw new Error((await response.json()).error ?? "No se pudo descargar el archivo.");
      const blob = await response.blob(), url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = `milo-${kind}-${template ? "plantilla" : "exportacion"}.xlsx`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo descargar el archivo."); }
    finally { setDownloading(false); }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!file || busy.current) return;
    if (preview && (preview.errors || !preview.created)) return;
    busy.current = true; setPending(true); setError("");
    try {
      const response = await fetch(`${endpoint}?mode=${preview ? "confirm" : "preview"}`, { method: "POST", headers: { "Content-Type": "application/octet-stream", "X-Milo-Filename": encodeURIComponent(file.name), ...(preview ? { "X-Milo-Fingerprint": preview.fingerprint, "X-Milo-Operation": operation.current, "X-Milo-Confirm": "IMPORT" } : {}) }, body: file, cache: "no-store" });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "No se pudo confirmar la operación.");
      if (result.preview) { setPreview(result.preview); setPage(1); }
      else { busy.current = false; close(); refreshList(result.message); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo confirmar la operación. Revisá el listado antes de reintentar."); }
    finally { busy.current = false; setPending(false); }
  }
  return <div className="milo-transfer-tools">
    <Link ref={newLink} className="milo-primary-button milo-record-new" href={`/panel/${kind}/nuevo`} data-record-editor="" aria-keyshortcuts="F4">Nuevo {label} <kbd>F4</kbd></Link>
    <button ref={importButton} className="milo-secondary-button" type="button" onClick={() => { setFile(null); setPreview(null); setError(""); setPage(1); operation.current = crypto.randomUUID(); historyEntry.current = operation.current; window.history.pushState({ ...window.history.state, miloImport: historyEntry.current }, "", window.location.href); if (fileInput.current) fileInput.current.value = ""; dialog.current?.showModal(); fileInput.current?.focus(); }}>Importar Excel</button>
    <button className="milo-secondary-button" type="button" disabled={downloading} onClick={() => saveFile(false)}>{downloading ? "Preparando Excel…" : "Exportar Excel"}</button>
    <a className="milo-secondary-button" href={`/panel/${kind}/imprimir?q=${encodeURIComponent(q)}`} target="_blank" rel="noopener noreferrer">Imprimir PDF</a>
    <span className="milo-company-hint">Exportación/PDF: todos los resultados de la búsqueda, hasta 5.000.</span>
    {error && <p className="milo-form-error milo-transfer-error" role="alert">{error}</p>}
    <dialog ref={dialog} className="milo-record-dialog milo-import-dialog" aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); close(); }} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); close(); } else trapDialogFocus(event.currentTarget, event); }}>
      <header className="milo-record-dialog-heading"><div><h2 id={`${id}-title`}>Importar {kind} desde Excel</h2><p>Solo altas. Las fichas existentes no se sobrescriben.</p></div><button className="milo-secondary-button" type="button" aria-label="Cerrar importación" onClick={close} disabled={pending}>×</button></header>
      <RecordEditor className="milo-import-editor" footer={<footer className="milo-record-editor-footer"><div role="status">{pending ? preview ? "Importando…" : "Analizando…" : preview ? `${preview.created} altas · ${preview.skipped} omitidas · ${preview.errors} errores` : "No se guardan datos al analizar."}</div><div className="milo-company-form-actions"><button className="milo-secondary-button" type="button" disabled={pending} onClick={close}>Cancelar</button>{preview && <button className="milo-secondary-button" type="button" disabled={pending} onClick={() => { setPreview(null); setError(""); }}>Volver a analizar</button>}<button className="milo-primary-button" form={`${id}-form`} disabled={pending || !file || Boolean(preview && (preview.errors || !preview.created))}>{preview ? "Confirmar importación" : "Analizar archivo"}</button></div></footer>}>
        <form id={`${id}-form`} onSubmit={submit} className="milo-catalog-form" aria-busy={pending}>
          <p className="milo-company-hint">El XLSX debe tener el mismo formato que la exportación. Hasta 5 MiB y 500 filas; campos como documentos y teléfonos deben ser texto. Código vacío para altas nuevas.</p>
          <button className="milo-secondary-button" type="button" disabled={downloading || pending} onClick={() => saveFile(true)}>Descargar plantilla</button>
          <div className="milo-field"><label htmlFor={`${id}-file`}>Seleccionar archivo Excel</label><input ref={fileInput} id={`${id}-file`} type="file" accept=".xlsx" disabled={pending} onChange={event => { const selected = event.target.files?.[0] ?? null; setPreview(null); setError(""); operation.current = crypto.randomUUID(); if (selected && selected.size > limits.file) { setFile(null); setError("El archivo supera 5 MiB."); } else setFile(selected); }} /></div>
          {error && <p role="alert" className="milo-form-error">{error}</p>}
          {preview && <><p className="milo-company-hint">{preview.errors ? "Corregí todos los errores antes de importar; no se guardará ninguna fila." : preview.created ? "Revisá el resultado y confirmá las altas nuevas." : "No hay altas nuevas; podés cerrar sin modificar datos."}</p><div className="milo-catalog-table-wrap" role="region" aria-label="Vista previa de importación" tabIndex={0}><table className="milo-catalog-table"><thead><tr><th scope="col">Fila</th><th scope="col">Nombre</th><th scope="col">Resultado</th></tr></thead><tbody>{preview.lines.slice((page - 1) * 20, page * 20).map(row => <tr key={row.row}><td>{row.row}</td><td>{row.name}</td><td>{row.message}</td></tr>)}</tbody></table></div><nav aria-label="Páginas de vista previa" className="milo-catalog-pagination"><span>Página {page} de {Math.max(1, Math.ceil(preview.total / 20))}</span><div><button type="button" className="milo-secondary-button" disabled={page === 1 || pending} onClick={() => setPage(page - 1)}>Anterior</button><button type="button" className="milo-secondary-button" disabled={page * 20 >= preview.total || pending} onClick={() => setPage(page + 1)}>Siguiente</button></div></nav></>}
          <span className="sr-only">Columnas esperadas: {columns[kind].map(([, label]) => label).join(", ")}</span>
        </form>
      </RecordEditor>
    </dialog>
  </div>;
}
