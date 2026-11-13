import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPanelAccess, type PanelContext } from "@/lib/panel/access";
import { canManageSuppliers } from "@/lib/panel/supplier-permission";
import { supplierStorage } from "./storage";
import { emptySupplierFields, type SupplierFields } from "./fields";
import { parseSupplierForm, supplierCreate, supplierEdit, supplierDelete, supplierId, supplierQuery } from "./schema";
import type { SupplierList, SupplierResult, SupplierState, SupplierView } from "./types";

class Denied extends Error {}
class Missing extends Error {}
class Conflict extends Error {}
class ProtectedHistory extends Error {}
const fieldSelect = Object.fromEntries(Object.keys(emptySupplierFields()).map(key => [key, true])) as Record<keyof SupplierFields, true>;
const select = { id: true, commercialNumber: true, updatedAt: true, ...fieldSelect } as const;
type Row = Omit<Prisma.SupplierGetPayload<{ select: typeof select }>, "internalNotes"> & { internalNotes?: string | null };
function view(row: Row): SupplierView {
  const details = emptySupplierFields();
  for (const key of Object.keys(details) as (keyof SupplierFields)[]) details[key] = row[key] ?? "";
  return { id: row.id, version: row.updatedAt.toISOString(), commercialCode: "P" + String(row.commercialNumber).padStart(6, "0"), name: details.legalName || details.commercialName, details };
}
async function access() {
  const result = await getPanelAccess();
  if (result.status !== "allowed" || !canManageSuppliers(result.context)) return { status: "forbidden" } as const;
  const storage = await supplierStorage();
  if (storage !== "ready") return { status: storage === "pending" ? "pending" : "error" } as const;
  return result;
}
async function membership(tx: Prisma.TransactionClient, context: PanelContext) {
  const profile = await tx.userProfile.findUnique({ where: { authUserId: context.authUserId }, select: { id: true, tenantId: true } });
  if (!profile || profile.id !== context.profileId || profile.tenantId !== context.tenant.id) throw new Denied();
  const role = await tx.userRoleAssignment.findFirst({
    where: { tenantId: profile.tenantId, userProfileId: profile.id, assignmentScope: "COMPANY", branchId: null, role: { code: { in: ["OWNER", "ADMIN"] }, assignmentScope: "COMPANY" } },
    select: { tenantId: true, userProfileId: true, assignmentScope: true, branchId: true, role: { select: { code: true, assignmentScope: true } } },
  });
  if (!role || role.tenantId !== profile.tenantId || role.userProfileId !== profile.id || role.assignmentScope !== "COMPANY" || role.branchId !== null || role.role.assignmentScope !== "COMPANY" || !["OWNER", "ADMIN"].includes(role.role.code)) throw new Denied();
  return profile.tenantId;
}
async function read<T>(run: (tx: Prisma.TransactionClient, tenantId: string) => Promise<T>): Promise<SupplierResult<T>> {
  const result = await access();
  if (result.status !== "allowed") return result;
  try {
    return { status: "ok", data: await prisma.$transaction(async tx => run(tx, await membership(tx, result.context)), { isolationLevel: "RepeatableRead" }) };
  } catch (error) { return { status: error instanceof Denied ? "forbidden" : error instanceof Missing ? "missing" : "error" }; }
}
export async function newSupplierEditor(): Promise<SupplierResult<{ supplier?: SupplierView }>> { return read(async () => ({})); }
export async function getSupplier(id: unknown): Promise<SupplierResult<SupplierView>> {
  const parsed = supplierId.safeParse(id); if (!parsed.success) return { status: "missing" };
  return read(async (tx, tenantId) => { const row = await tx.supplier.findFirst({ where: { tenantId, id: parsed.data }, select }); if (!row) throw new Missing(); return view(row); });
}
export async function listSuppliers(query: unknown): Promise<SupplierResult<SupplierList>> {
  const parsed = supplierQuery.safeParse(query); if (!parsed.success) return { status: "invalid" };
  return read(async (tx, tenantId) => {
    const { q, page } = parsed.data;
  const where = supplierWhere(tenantId, q);
    const total = await tx.supplier.count({ where }), pages = Math.max(1, Math.ceil(total / 25)), current = Math.min(page, pages);
    const rows = await tx.supplier.findMany({ where, select: { ...select, internalNotes: false }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 25, skip: (current - 1) * 25 });
    return { items: rows.map(view), total, pages, page: current, q };
  });
}
async function audit(tx: Prisma.TransactionClient, tenantId: string, actorUserId: string, action: string, entityId: string) {
  await tx.auditEvent.create({ data: { tenantId, actorUserId, action, entityType: "Supplier", entityId } });
}
function failure(error: unknown): SupplierState {
  const code = error instanceof Error && "code" in error ? error.code : undefined;
  if (error instanceof Denied) return { status: "forbidden", message: "Tu acceso cambió. Volvé a ingresar." };
  if (error instanceof Missing) return { status: "invalid", message: "El proveedor ya no está disponible en tu empresa. Recargá el listado." };
  if (error instanceof Conflict || code === "P2034" || code === "P2002") return { status: "conflict", message: "El proveedor o su numeración cambió. Recargá antes de continuar; no se reintenta automáticamente." };
  if (error instanceof ProtectedHistory || code === "P2003") return { status: "invalid", message: "No se puede eliminar: existen relaciones protegidas, historial o referencias que requieren revisión." };
  return { status: "error", message: "No se pudo confirmar la operación. Recargá y verificá el resultado antes de reintentar." };
}
async function mutationAccess() {
  const result = await access();
  if (result.status === "allowed") return result;
  return { state: { status: result.status === "forbidden" ? "forbidden" : "error", message: result.status === "pending" ? "Proveedores requiere la migración pendiente de autorización." : result.status === "forbidden" ? "Acceso restringido." : "La estructura de Proveedores requiere revisión." } as SupplierState };
}
export async function saveSupplier(form: unknown, edit: boolean): Promise<SupplierState> {
  const authorized = await mutationAccess(); if ("state" in authorized) return authorized.state;
  const parsed = parseSupplierForm<typeof supplierCreate | typeof supplierEdit>(edit ? supplierEdit : supplierCreate, form);
  if (!parsed?.success) return { status: "invalid", message: parsed?.error.issues[0]?.message ?? "Revisá los datos del proveedor." };
  const data = parsed.data;
  try {
    return await prisma.$transaction(async tx => {
      const tenantId = await membership(tx, authorized.context);
      const fields = Object.fromEntries(Object.keys(emptySupplierFields()).map(key => [key, data[key as keyof SupplierFields] || null])) as { [K in keyof SupplierFields]: string | null };
      if ("id" in data) {
        const old = await tx.supplier.findFirst({ where: { tenantId, id: data.id }, select });
        if (!old) throw new Missing(); if (old.updatedAt.toISOString() !== data.version) throw new Conflict();
        if (Object.entries(fields).every(([key, value]) => old[key as keyof typeof fields] === value)) return { status: "saved", id: old.id, version: old.updatedAt.toISOString(), message: "No hay cambios para guardar." };
        const updatedAt = new Date(Math.max(Date.now(), old.updatedAt.getTime() + 1));
        const changed = await tx.supplier.updateMany({ where: { tenantId, id: old.id, updatedAt: old.updatedAt }, data: { ...fields, updatedAt } });
        if (changed.count !== 1) throw new Conflict();
        await audit(tx, tenantId, authorized.context.profileId, "SUPPLIER_UPDATED", old.id);
        return { status: "saved", id: old.id, version: updatedAt.toISOString(), message: "Proveedor guardado." };
      }
      const counter = await tx.supplierCounter.upsert({ where: { tenantId }, create: { tenantId, lastNumber: 1 }, update: { lastNumber: { increment: 1 } }, select: { lastNumber: true } });
      const row = await tx.supplier.create({ data: { tenantId, commercialNumber: counter.lastNumber, ...fields }, select: { id: true, updatedAt: true } });
      await audit(tx, tenantId, authorized.context.profileId, "SUPPLIER_CREATED", row.id);
      return { status: "saved", id: row.id, version: row.updatedAt.toISOString(), message: "Proveedor guardado." };
    }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 20000 });
  } catch (error) { return failure(error); }
}
export async function deleteSupplier(form: unknown): Promise<SupplierState> {
  const authorized = await mutationAccess(); if ("state" in authorized) return authorized.state;
  const parsed = parseSupplierForm(supplierDelete, form);
  if (!parsed?.success) return { status: "invalid", message: "Confirmá la eliminación y recargá si la ficha cambió." };
  const { id, version } = parsed.data;
  try {
    return await prisma.$transaction(async tx => {
      // Acquire the DELETE table-lock mode before the first snapshot/read, so a
      // concurrent ADD FOREIGN KEY cannot appear after the reference inspection.
      await tx.$executeRaw`LOCK TABLE public.suppliers IN ROW EXCLUSIVE MODE`;
      const tenantId = await membership(tx, authorized.context);
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.suppliers WHERE "tenantId"=${tenantId}::uuid AND id=${id}::uuid FOR UPDATE`;
      if (locked.length !== 1) throw new Missing(); await membership(tx, authorized.context);
      const old = await tx.supplier.findFirst({ where: { tenantId, id }, select: { id: true, updatedAt: true } });
      if (!old) throw new Missing(); if (old.updatedAt.toISOString() !== version) throw new Conflict();
      // Only the reviewed tenant-scoped RESTRICT purchase FK is recognized.
      // Unknown constraints (including cascades) continue to fail closed.
      const refs = await tx.$queryRaw<{ count: number; reviewed: number }[]>`SELECT count(*)::int AS count,
        count(*) FILTER (WHERE conname='purchases_tenantId_supplierId_fkey' AND conrelid=to_regclass('public.purchases') AND convalidated
          AND confdeltype='r' AND confupdtype='r'
          AND pg_get_constraintdef(oid)='FOREIGN KEY ("tenantId", "supplierId") REFERENCES suppliers("tenantId", id) ON UPDATE RESTRICT ON DELETE RESTRICT')::int AS reviewed
        FROM pg_constraint WHERE contype='f' AND confrelid='public.suppliers'::regclass`;
      if (refs[0]?.count !== 0 && (refs[0]?.count !== 1 || refs[0]?.reviewed !== 1)) throw new ProtectedHistory();
      if (refs[0]?.count === 1 && await tx.purchase.count({ where: { tenantId, supplierId: id } })) throw new ProtectedHistory();
      if (await tx.auditEvent.count({ where: { tenantId, entityType: "Supplier", entityId: id, action: { notIn: ["SUPPLIER_CREATED", "SUPPLIER_UPDATED"] } } })) throw new ProtectedHistory();
      const deleted = await tx.supplier.deleteMany({ where: { tenantId, id, updatedAt: old.updatedAt } }); if (deleted.count !== 1) throw new Conflict();
      await audit(tx, tenantId, authorized.context.profileId, "SUPPLIER_DELETED", id);
      return { status: "saved", id, message: "Proveedor eliminado. La auditoría se conserva." };
    }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 20000 });
  } catch (error) { return failure(error); }
}

export function supplierWhere(tenantId: string, q: string): Prisma.SupplierWhereInput {
    const code = /^P0*([1-9][0-9]*)$/i.exec(q), number = code ? Number(code[1]) : 0;
    const cuit = q.replace(/[. -]/g, "");
    const where: Prisma.SupplierWhereInput = { tenantId, ...(q ? { OR: [
      ...["legalName", "commercialName", "contactName", "phone", "whatsapp", "email"].map(key => ({ [key]: { contains: q, mode: "insensitive" } })),
      ...(/^[0-9]+$/.test(cuit) ? [{ cuit: { contains: cuit } }] : []),
      ...(Number.isSafeInteger(number) && number > 0 && number <= 2147483647 ? [{ commercialNumber: number }] : []),
    ] } : {}) };
 return where;
}
export { membership as supplierMembership, view as supplierRecordView, select as supplierRecordSelect, Denied as SupplierMembershipDenied };
