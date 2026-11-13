import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPanelAccess, type PanelContext } from "@/lib/panel/access";
import { canManageCustomers } from "@/lib/panel/customer-permission";
import { customerCreate, customerEdit, customerContact, customerId, customerQuery, parseCustomerForm } from "./schema";
import type { CustomerList, CustomerResult, CustomerState, CustomerView } from "./types";

class Denied extends Error {}
class Missing extends Error {}
class Conflict extends Error {}
class LegacyContact extends Error {}
const select = { id: true, contactData: true, status: true, updatedAt: true } as const;
type Row = { id: string; contactData: Prisma.JsonValue | null; status: string; updatedAt: Date };
function view(row: Row): CustomerView {
  const contact = customerContact.safeParse(row.contactData);
  return {
    id: row.id, version: row.updatedAt.toISOString(), name: contact.success ? contact.data.name : "",
    email: contact.success ? contact.data.email : "", phone: contact.success ? contact.data.phone : "", address: contact.success ? contact.data.address : "",
    editable: contact.success || row.contactData === null,
    contactState: contact.success ? "current" : row.contactData === null ? "empty" : "legacy",
    statusLabel: row.status === "REGISTERED" ? "Registrado — sin autorización comercial" : "Estado previo (sin cambios)",
  };
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
async function read<T>(run: (tx: Prisma.TransactionClient, tenantId: string) => Promise<T>): Promise<CustomerResult<T>> {
  const access = await getPanelAccess();
  if (access.status !== "allowed" || !canManageCustomers(access.context)) return { status: "forbidden" };
  try {
    return { status: "ok", data: await prisma.$transaction(async tx => run(tx, await membership(tx, access.context)), { isolationLevel: "RepeatableRead" }) };
  } catch (e) { return { status: e instanceof Denied ? "forbidden" : e instanceof Missing ? "missing" : "error" }; }
}
export async function listCustomers(query: unknown): Promise<CustomerResult<CustomerList>> {
  const parsed = customerQuery.safeParse(query);
  if (!parsed.success) return { status: "invalid" };
  return read(async (tx, tenantId) => {
    const { q, page } = parsed.data;
    const where: Prisma.CustomerWhereInput = { tenantId, ...(q ? { AND: [
      { contactData: { path: ["schemaVersion"], equals: 1 } },
      { OR: ["name", "email", "phone"].map(field => ({ contactData: { path: [field], string_contains: q, mode: "insensitive" as const } })) },
    ] } : {}) };
    const total = await tx.customer.count({ where }), pages = Math.max(1, Math.ceil(total / 25)), current = Math.min(page, pages);
    const rows = await tx.customer.findMany({ where, select, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 25, skip: (current - 1) * 25 });
    return { items: rows.map(view), total, pages, page: current, q };
  });
}
export async function getCustomer(id: unknown): Promise<CustomerResult<CustomerView>> {
  const parsed = customerId.safeParse(id);
  if (!parsed.success) return { status: "missing" };
  return read(async (tx, tenantId) => {
    const row = await tx.customer.findFirst({ where: { tenantId, id: parsed.data }, select });
    if (!row) throw new Missing();
    return view(row);
  });
}
export async function newCustomerEditor(): Promise<CustomerResult<{ customer?: CustomerView }>> {
  return read(async () => ({}));
}
export async function saveCustomer(form: unknown, edit: boolean): Promise<CustomerState> {
  const parsed = parseCustomerForm<typeof customerCreate | typeof customerEdit>(edit ? customerEdit : customerCreate, form);
  if (!parsed?.success) return { status: "invalid", message: "Revisá nombre, correo, teléfono y dirección. No se admiten campos adicionales ni caracteres de control." };
  const data = parsed.data;
  const access = await getPanelAccess();
  if (access.status !== "allowed" || !canManageCustomers(access.context)) return { status: "forbidden", message: "Solo el Dueño y los Administradores pueden administrar clientes." };
  try {
    const result = await prisma.$transaction(async tx => {
      const tenantId = await membership(tx, access.context);
      const contactData = { schemaVersion: 1 as const, name: data.name, email: data.email, phone: data.phone, address: data.address };
      if ("id" in data) {
        const old = await tx.customer.findFirst({ where: { tenantId, id: data.id }, select });
        if (!old) throw new Missing();
        if (old.updatedAt.toISOString() !== data.version) throw new Conflict();
        if (!view(old).editable) throw new LegacyContact();
        const previous = customerContact.safeParse(old.contactData);
        if (previous.success && Object.entries(contactData).every(([key, value]) => previous.data[key as keyof typeof previous.data] === value)) return { id: old.id, version: old.updatedAt.toISOString(), changed: false };
        const updatedAt = new Date(Math.max(Date.now(), old.updatedAt.getTime() + 1));
        const changed = await tx.customer.updateMany({ where: { tenantId, id: old.id, updatedAt: old.updatedAt }, data: { contactData, updatedAt } });
        if (changed.count !== 1) throw new Conflict();
        await audit(tx, tenantId, access.context.profileId, "CUSTOMER_UPDATED", old.id);
        return { id: old.id, version: updatedAt.toISOString(), changed: true };
      }
      const row = await tx.customer.create({ data: { tenantId, contactData, status: "REGISTERED" }, select });
      await audit(tx, tenantId, access.context.profileId, "CUSTOMER_CREATED", row.id);
      return { id: row.id, version: row.updatedAt.toISOString(), changed: true };
    }, { isolationLevel: "Serializable" });
    return { status: "saved", message: result.changed ? "Cliente guardado." : "No hay cambios para guardar.", id: result.id, version: result.version };
  } catch (e) {
    const code = e instanceof Error && "code" in e ? e.code : undefined;
    if (e instanceof Denied) return { status: "forbidden", message: "Tu acceso cambió. Volvé a ingresar." };
    if (e instanceof Conflict || code === "P2034") return { status: "conflict", message: "El cliente cambió mientras editabas. Volvé a cargarlo antes de guardar." };
    if (e instanceof LegacyContact) return { status: "invalid", message: "La ficha anterior tiene un formato no compatible y se conserva sin sobrescribir. Su adaptación requiere revisión." };
    return { status: "error", message: "No pudimos guardar. Volvé a cargar y verificá el resultado antes de intentarlo nuevamente." };
  }
}
async function audit(tx: Prisma.TransactionClient, tenantId: string, actorUserId: string, action: string, entityId: string) {
  await tx.auditEvent.create({ data: { tenantId, actorUserId, action, entityType: "Customer", entityId } });
}
