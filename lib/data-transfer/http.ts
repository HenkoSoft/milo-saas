import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { limits, type TransferKind } from "./columns";
import { readWorkbook, writeWorkbook, TransferError } from "./xlsx";
import { transferAccess, templateAccess, exportData, previewImport, confirmImport, TransferDenied } from "./service";
const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "Pragma": "no-cache", "X-Content-Type-Options": "nosniff" };
function errorResponse(error: unknown, operation = "import", stage = "request") {
  const conflict = error instanceof Error && "code" in error && ["P2034", "P2002"].includes(String(error.code));
  const denied = error instanceof TransferDenied;
  if (!denied && !conflict && !(error instanceof TransferError) && !(error instanceof z.ZodError)) {
    const rawCode = error instanceof Error && "code" in error ? String(error.code) : "";
    const text = error instanceof Error ? error.message : "";
    const helper = ["customerMembership", "supplierMembership", "customerWhere", "supplierWhere", "customerRecordView", "supplierRecordView", "Workbook"].find(name => text.includes(name));
    const missing = ["toISOString", "details", "tenant", "status", "name", "id", "updatedAt", "findMany", "findUnique"].find(name => text.includes(`reading '${name}'`));
    const locations = error instanceof Error ? error.stack?.split("\n").filter(line => /^\s+at /.test(line)).flatMap(line => { const match = /[\\/]\.next[\\/]dev[\\/]server[\\/]chunks[\\/]([^\\/():\s]+\.js):(\d+):(\d+)/.exec(line); return match ? [`${match[1]}:${match[2]}:${match[3]}`] : []; }).slice(0, 3) : [];
    // Technical allowlist only: never log messages, SQL, arguments, rows, file
    // names, credentials or stack payloads containing protected customer data.
    console.error("MILO_TRANSFER_FAILURE " + JSON.stringify({ operation, stage, type: error instanceof Error && /^[A-Za-z0-9_$]{1,60}$/.test(error.constructor.name) ? error.constructor.name : "unknown", code: /^[A-Z0-9_]{1,40}$/.test(rawCode) ? rawCode : "", reason: /not a function/.test(text) ? "MISSING_FUNCTION" : /not a constructor/.test(text) ? "MISSING_CONSTRUCTOR" : /undefined|null/.test(text) ? "MISSING_VALUE" : "UNEXPECTED", helper, missing, locations }));
  }
  const message = denied ? "Tu sesión no permite transferir estos datos." : error instanceof TransferError ? error.message : conflict ? "La importación encontró un cambio concurrente. Volvé a analizar el archivo; no se reintenta automáticamente." : error instanceof z.ZodError ? "Los parámetros de la transferencia no son válidos." : operation === "download" ? "No se pudo generar el archivo Excel. Tus registros no se modificaron." : "No se pudo confirmar la operación. Verificá el listado antes de reintentar.";
  return Response.json({ error: message }, { status: denied ? 403 : conflict ? 409 : error instanceof TransferError || error instanceof z.ZodError ? 400 : 500, headers: privateHeaders });
}
export async function download(kind: TransferKind, request: Request) {
  let stage = "parameters";
  try {
    const url = new URL(request.url), mode = z.enum(["template", "export"]).parse(url.searchParams.get("mode"));
    if ([...url.searchParams.keys()].some(key => !["mode", "q"].includes(key)) || url.searchParams.getAll("mode").length !== 1 || url.searchParams.getAll("q").length > 1) throw new TransferError("Parámetros de descarga inválidos.");
    let rows: Awaited<ReturnType<typeof exportData>>["rows"] = [];
    stage = mode === "template" ? "template-access" : "read-records";
    if (mode === "template") await templateAccess(kind);
    else rows = (await exportData(kind, url.searchParams.get("q") ?? "", true)).rows;
    stage = "xlsx";
    const buffer = await writeWorkbook(kind, rows);
    stage = "response";
    const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
    return new Response(new Uint8Array(buffer), { headers: { ...privateHeaders, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="milo-${kind}-${mode === "template" ? "plantilla" : date}.xlsx"` } });
  } catch (error) { return errorResponse(error, "download", stage); }
}
async function readBody(request: Request) {
  if (!request.body || Number(request.headers.get("content-length") ?? 0) > limits.file) throw new TransferError("Elegí un XLSX de hasta 5 MiB.");
  const reader = request.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > limits.file) { await reader.cancel(); throw new TransferError("El archivo supera 5 MiB."); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export async function upload(kind: TransferKind, request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) throw new TransferDenied();
    await transferAccess(kind);
    const mode = z.enum(["preview", "confirm"]).parse(new URL(request.url).searchParams.get("mode"));
    const filename = decodeURIComponent(request.headers.get("x-milo-filename") ?? "");
    if (filename.length > 255 || !/\.xlsx$/i.test(filename)) throw new TransferError("Elegí un archivo .xlsx de la plantilla del módulo.");
    const rows = await readWorkbook(kind, await readBody(request));
    if (mode === "preview") return Response.json({ preview: await previewImport(kind, rows) }, { headers: privateHeaders });
    const result = await confirmImport(kind, rows, { fingerprint: request.headers.get("x-milo-fingerprint"), operation: request.headers.get("x-milo-operation"), confirm: request.headers.get("x-milo-confirm") });
    revalidatePath(`/panel/${kind}`); if (kind === "clientes") revalidatePath("/panel");
    return Response.json(result, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
