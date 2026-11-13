import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPanelAccess } from "@/lib/panel/access";
import { canManageCustomers } from "@/lib/panel/customer-permission";
import { canManageSuppliers } from "@/lib/panel/supplier-permission";
import { customerStorage } from "../customers/storage";
import { supplierStorage } from "../suppliers/storage";
import { customerMembership, customerRecordView, customerRecordSelect, customerWhere, CustomerMembershipDenied } from "../customers/expanded-service";
import { supplierMembership, supplierRecordView, supplierRecordSelect, supplierWhere, SupplierMembershipDenied } from "../suppliers/service";
import { commercialCreate, commercialEdit } from "../customers/commercial-schema";
import { supplierCreate } from "../suppliers/schema";
import { vatConditions } from "../customers/commercial-fields";
import { columns, limits, type TransferKind, type TransferRow, type ImportPreview, type PreviewLine } from "./columns";
import { TransferError } from "./xlsx";

export class TransferDenied extends Error {}
export const transferQuery = z.string().trim().max(100).refine(v => !/[\u0000-\u001f\u007f]/u.test(v));
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fingerprintUUID = (hex: string) => `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`;
export async function transferAccess(kind: TransferKind) {
  const access = await getPanelAccess();
  if (access.status !== "allowed" || !(kind === "clientes" ? canManageCustomers(access.context) : canManageSuppliers(access.context))) throw new TransferDenied();
  if (kind === "clientes" ? await customerStorage() !== "extended" : await supplierStorage() !== "ready") throw new TransferError("La estructura del módulo requiere revisión antes de transferir datos.");
  return access.context;
}
async function membership(tx: Prisma.TransactionClient, kind: TransferKind, context: Awaited<ReturnType<typeof transferAccess>>) {
  try { return await (kind === "clientes" ? customerMembership(tx, context) : supplierMembership(tx, context)); }
  catch (error) { if (error instanceof CustomerMembershipDenied || error instanceof SupplierMembershipDenied) throw new TransferDenied(); throw error; }
}
function customerRow(row: ReturnType<typeof customerRecordView>): TransferRow {
  return { ...row.details, code: row.commercialCode ?? "", legacyName: row.details?.legalName || row.details?.contactName ? "" : row.name };
}
function supplierRow(row: ReturnType<typeof supplierRecordView>): TransferRow { return { ...row.details, code: row.commercialCode }; }
export async function exportData(kind: TransferKind, query: unknown, notes: boolean) {
  const q = transferQuery.parse(query), context = await transferAccess(kind);
  return prisma.$transaction(async tx => {
    const tenantId = await membership(tx, kind, context);
    let rows: TransferRow[];
    if (kind === "clientes") rows = (await tx.customer.findMany({ where: customerWhere(tenantId, q), select: { ...customerRecordSelect, internalNotes: notes }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: limits.exportRows + 1 })).map(row => customerRow(customerRecordView(row)));
    else rows = (await tx.supplier.findMany({ where: supplierWhere(tenantId, q), select: { ...supplierRecordSelect, internalNotes: notes }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: limits.exportRows + 1 })).map(row => supplierRow(supplierRecordView(row)));
    if (rows.length > limits.exportRows) throw new TransferError("El resultado supera 5.000 registros. Acotá la búsqueda para exportar o imprimir.");
    return { rows, company: context.tenant.name, q };
  }, { isolationLevel: "RepeatableRead", timeout: 20000 });
}
export async function templateAccess(kind: TransferKind) {
  const context = await transferAccess(kind);
  await prisma.$transaction(tx => membership(tx, kind, context), { isolationLevel: "RepeatableRead" });
}
type Existing = { id: string; version: string; fields: TransferRow };
type Plan = { preview: ImportPreview; creates: Record<string, string>[] };
function values(kind: TransferKind, input: TransferRow) {
  const result = Object.fromEntries(columns[kind].map(([key]) => [key, (input[key] ?? "").trim()]));
  result.vatCondition = vatConditions.find(([code, label]) => code === result.vatCondition || label.toLocaleLowerCase("es-AR") === result.vatCondition.toLocaleLowerCase("es-AR"))?.[0] ?? result.vatCondition;
  return result;
}
const same = (kind: TransferKind, row: TransferRow) => digest(columns[kind].filter(([key]) => key !== "code").map(([key]) => row[key] ?? ""));
const fiscal = (kind: TransferKind, row: TransferRow) => kind === "proveedores" ? row.cuit || "" : row.documentType && row.documentNumber ? row.documentType + ":" + row.documentNumber : "";
function codeNumber(kind: TransferKind, code: string) {
  const match = new RegExp(`^${kind === "clientes" ? "C" : "P"}([0-9]{6,10})$`).exec(code);
  const number = match ? Number(match[1]) : 0;
  return Number.isSafeInteger(number) && number > 0 && number <= 2147483647 ? number : 0;
}
async function existing(tx: Prisma.TransactionClient, tenantId: string, kind: TransferKind, inputs: TransferRow[]): Promise<Existing[]> {
  const numbers = inputs.map(row => codeNumber(kind, row.code)).filter(Boolean);
  if (kind === "clientes") {
    const OR: Prisma.CustomerWhereInput[] = [{ commercialNumber: { in: numbers } }, ...inputs.filter(row => row.legalName || row.contactName).map(row => ({ legalName: row.legalName || null, contactName: row.contactName || null })), ...inputs.filter(row => row.documentNumber).map(row => ({ documentNumber: row.documentNumber.replace(/[. -]/g, ""), documentType: row.documentType }))];
    const rows = await tx.customer.findMany({ where: { tenantId, OR }, select: customerRecordSelect });
    return rows.map(raw => { const row = customerRecordView(raw); return { id: row.id, version: row.version, fields: customerRow(row) }; });
  }
  const OR: Prisma.SupplierWhereInput[] = [{ commercialNumber: { in: numbers } }, ...inputs.filter(row => row.legalName || row.commercialName).map(row => ({ legalName: row.legalName || null, commercialName: row.commercialName || null })), ...inputs.filter(row => row.cuit).map(row => ({ cuit: row.cuit.replace(/[. -]/g, "") }))];
  return (await tx.supplier.findMany({ where: { tenantId, OR }, select: supplierRecordSelect })).map(raw => { const row = supplierRecordView(raw); return { id: row.id, version: row.version, fields: supplierRow(row) }; });
}
async function plan(tx: Prisma.TransactionClient, tenantId: string, kind: TransferKind, rows: TransferRow[]): Promise<Plan> {
  if (!rows.length || rows.length > limits.importRows) throw new TransferError("El archivo debe contener entre 1 y 500 filas de datos.");
  const inputs = rows.map(row => values(kind, row)), matches = await existing(tx, tenantId, kind, inputs);
  const byCode = new Map(matches.map(row => [row.fields.code, row]));
  const signatures = new Set(matches.map(row => same(kind, row.fields)));
  const documents = new Map<string, Set<string>>();
  for (const match of matches) { const id = fiscal(kind, match.fields); if (id) { const set = documents.get(id) ?? new Set(); set.add(same(kind, match.fields)); documents.set(id, set); } }
  const creates: Record<string, string>[] = [], lines: PreviewLine[] = [];
  for (let index = 0; index < inputs.length; index++) {
    const input = inputs[index], rowNumber = index + 2;
    if (Object.values(input).every(value => !value)) { lines.push({ row: rowNumber, status: "skip", name: "Fila vacía", message: "Sin datos; se omite." }); continue; }
    const old = byCode.get(input.code);
    const name = input.legalName || input.commercialName || input.contactName || input.legacyName || "Sin nombre";
    const fail = (message: string) => lines.push({ row: rowNumber, status: "error", name, message });
    if (input.code && (!codeNumber(kind, input.code) || !old)) { fail("Código no reconocido en tu empresa. Para un alta nueva dejá Código vacío."); continue; }
    if (!input.code && input.legacyName) { fail("Nombre registrado es informativo para fichas históricas; no admite altas."); continue; }
    const fields = Object.fromEntries(Object.entries(input).filter(([key]) => key !== "code" && key !== "legacyName"));
    const parsed = kind === "proveedores" ? supplierCreate.safeParse(fields) : old ? commercialEdit.safeParse({ ...fields, profileMode: "extended", id: old.id, version: old.version }) : commercialCreate.safeParse({ ...fields, profileMode: "extended" });
    if (!parsed.success) { fail(parsed.error.issues.map(issue => `${columns[kind].find(([key]) => key === String(issue.path[0]))?.[1] ?? "Datos"}: ${issue.message}`).join(" ")); continue; }
    const canonical = { ...fields, ...parsed.data } as Record<string, string>;
    delete canonical.id; delete canonical.version; delete canonical.profileMode;
    const normalized = { ...canonical, code: input.code, legacyName: input.legacyName ?? "" };
    const signature = same(kind, normalized), document = fiscal(kind, canonical);
    if (old) {
      if (signature !== same(kind, old.fields)) { fail("El código corresponde a una ficha con datos diferentes. El importador no actualiza registros."); continue; }
      lines.push({ row: rowNumber, status: "skip", name, message: "La ficha ya existe sin cambios." }); continue;
    }
    if (document && [...documents.get(document) ?? []].some(previous => previous !== signature)) { fail("El documento ya aparece con datos diferentes. Revisá la coincidencia antes de importar."); continue; }
    if (signatures.has(signature)) { lines.push({ row: rowNumber, status: "skip", name, message: "Coincidencia exacta; se omite para evitar duplicados." }); continue; }
    signatures.add(signature); if (document) documents.set(document, new Set([signature]));
    creates.push(canonical); lines.push({ row: rowNumber, status: "new", name, message: "Alta nueva con código automático." });
  }
  // Include database versions and complete input, binding confirmation to the
  // tenant and the exact reviewed plan; it is not an authorization credential.
  const fingerprint = digest({ kind, tenantId, rows: inputs, matches: matches.map(row => [row.id, row.version, row.fields]).sort((a,b) => String(a[0]).localeCompare(String(b[0]))), lines });
  return { preview: { fingerprint, total: lines.length, created: creates.length, skipped: lines.filter(row => row.status === "skip").length, errors: lines.filter(row => row.status === "error").length, lines }, creates };
}
export async function previewImport(kind: TransferKind, rows: TransferRow[]) {
  const context = await transferAccess(kind);
  return prisma.$transaction(async tx => plan(tx, await membership(tx, kind, context), kind, rows).then(result => result.preview), { isolationLevel: "RepeatableRead", timeout: 20000 });
}
export async function confirmImport(kind: TransferKind, rows: TransferRow[], input: unknown) {
  const confirmation = z.strictObject({ fingerprint: z.string().regex(/^[a-f0-9]{64}$/), operation: z.uuid(), confirm: z.literal("IMPORT") }).parse(input);
  const context = await transferAccess(kind), entityType = kind === "clientes" ? "CustomerImport" : "SupplierImport";
  const content = digest({ kind, tenantId: context.tenant.id, rows: rows.map(row => values(kind, row)) }), entityId = fingerprintUUID(content);
  return prisma.$transaction(async tx => {
    const tenantId = await membership(tx, kind, context);
    const previous = await tx.auditEvent.findFirst({ where: { tenantId, id: confirmation.operation } });
    if (previous) {
      if (previous.entityType !== entityType || previous.entityId !== entityId || previous.actorUserId !== context.profileId || previous.action !== "IMPORT_COMPLETED") throw new TransferError("El identificador de operación ya se usó con otros datos. Volvé a analizar el archivo.");
      return { message: "Esta importación ya se completó. El listado se actualizó sin duplicar altas.", created: 0, replay: true };
    }
    const result = await plan(tx, tenantId, kind, rows);
    if (result.preview.errors || result.preview.fingerprint !== confirmation.fingerprint) throw new TransferError("El contenido o las fichas cambiaron. Volvé a analizar el archivo antes de confirmar.");
    const count = result.creates.length;
    if (!count) return { message: "No hay altas nuevas. Las coincidencias se omitieron sin modificar registros.", created: 0, replay: false };
    const counter = kind === "clientes" ? await tx.customerCounter.upsert({ where: { tenantId }, create: { tenantId, lastNumber: count }, update: { lastNumber: { increment: count } } }) : await tx.supplierCounter.upsert({ where: { tenantId }, create: { tenantId, lastNumber: count }, update: { lastNumber: { increment: count } } });
    if (counter.lastNumber > 2147483647 || counter.lastNumber < count) throw new TransferError("No se pudo asignar la numeración del lote.");
    const created = result.creates.map((fields, index) => ({ id: randomUUID(), tenantId, commercialNumber: counter.lastNumber - count + index + 1, ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value || null])) }));
    if (kind === "clientes") await tx.customer.createMany({ data: created.map(row => ({ ...row, status: "REGISTERED", commercialDataVersion: 1 })) });
    else await tx.supplier.createMany({ data: created });
    await tx.auditEvent.createMany({ data: [
      ...created.map(row => ({ tenantId, actorUserId: context.profileId, action: kind === "clientes" ? "CUSTOMER_CREATED" : "SUPPLIER_CREATED", entityType: kind === "clientes" ? "Customer" : "Supplier", entityId: row.id })),
      { id: confirmation.operation, tenantId, actorUserId: context.profileId, action: "IMPORT_COMPLETED", entityType, entityId },
    ] });
    return { message: `Importación completada: ${count} altas; ${result.preview.skipped} filas omitidas.`, created: count, replay: false };
  }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 60000 });
}
