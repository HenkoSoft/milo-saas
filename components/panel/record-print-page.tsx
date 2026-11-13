import { exportData, TransferDenied } from "@/lib/data-transfer/service";
import { TransferError } from "@/lib/data-transfer/xlsx";
import type { TransferKind } from "@/lib/data-transfer/columns";
import { PrintList } from "./print-list";
export async function RecordPrintPage({ kind, query }: { kind: TransferKind; query: unknown }) {
  const result = await exportData(kind, query, false).then(data => ({ ok: true as const, data })).catch(error => ({ ok: false as const, message: error instanceof TransferDenied ? "Tu sesión no permite consultar estos datos." : error instanceof TransferError ? error.message : "Volvé al listado y revisá tu acceso o búsqueda." }));
  if (!result.ok) return <section className="milo-panel-card"><h1>No se pudo preparar la impresión</h1><p>{result.message}</p></section>;
  return <PrintList kind={kind} {...result.data} />;
}
