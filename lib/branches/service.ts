import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPanelAccess, type PanelContext } from "@/lib/panel/access";
import { canManageBranches } from "@/lib/panel/branch-permission";
import { branchCreate, branchEdit, branchId, branchQuery, parseBranchForm } from "./schema";
import type { BranchList, BranchResult, BranchState, BranchView } from "./types";

class Denied extends Error {}
class Missing extends Error {}
class Conflict extends Error {}
const select = { id: true, name: true, updatedAt: true } as const;
const view = (row: { id: string; name: string; updatedAt: Date }): BranchView => ({ id: row.id, name: row.name, version: row.updatedAt.toISOString() });

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
async function read<T>(run: (tx: Prisma.TransactionClient, tenantId: string) => Promise<T>): Promise<BranchResult<T>> {
  const access = await getPanelAccess();
  if (access.status !== "allowed" || !canManageBranches(access.context)) return { status: "forbidden" };
  try {
    const data = await prisma.$transaction(async tx => run(tx, await membership(tx, access.context)), { isolationLevel: "RepeatableRead" });
    return { status: "ok", data };
  } catch (e) { return { status: e instanceof Denied ? "forbidden" : e instanceof Missing ? "missing" : "error" }; }
}
export async function listBranches(query: unknown): Promise<BranchResult<BranchList>> {
  const parsed = branchQuery.safeParse(query);
  if (!parsed.success) return { status: "invalid" };
  return read(async (tx, tenantId) => {
    const { q, page } = parsed.data;
    const where = { tenantId, ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}) };
    const total = await tx.branch.count({ where }), pages = Math.max(1, Math.ceil(total / 25)), current = Math.min(page, pages);
    const rows = await tx.branch.findMany({ where, select, orderBy: [{ name: "asc" }, { id: "asc" }], take: 25, skip: (current - 1) * 25 });
    return { items: rows.map(view), total, pages, page: current, q };
  });
}
export async function getBranch(id: string): Promise<BranchResult<BranchView>> {
  if (!branchId.safeParse(id).success) return { status: "missing" };
  return read(async (tx, tenantId) => {
    const row = await tx.branch.findFirst({ where: { tenantId, id }, select });
    if (!row) throw new Missing();
    return view(row);
  });
}
export async function saveBranch(form: unknown, edit: boolean): Promise<BranchState> {
  const parsed = parseBranchForm<typeof branchCreate | typeof branchEdit>(edit ? branchEdit : branchCreate, form);
  if (!parsed?.success) return { status: "invalid", message: "Ingresá un nombre de hasta 200 caracteres, sin saltos de línea ni controles. Si la ficha está desactualizada, volvé a cargarla." };
  const data = parsed.data;
  const access = await getPanelAccess();
  if (access.status !== "allowed" || !canManageBranches(access.context)) return { status: "forbidden", message: "Solo el Dueño y los Administradores de tu empresa pueden administrar sucursales." };
  try {
    const result = await prisma.$transaction(async tx => {
      const tenantId = await membership(tx, access.context);
      if ("id" in data) {
        const old = await tx.branch.findFirst({ where: { tenantId, id: data.id }, select });
        if (!old) throw new Missing();
        if (old.updatedAt.toISOString() !== data.version) throw new Conflict();
        if (old.name === data.name) return { id: old.id, version: old.updatedAt.toISOString(), changed: false };
        const updatedAt = new Date(Math.max(Date.now(), old.updatedAt.getTime() + 1));
        const changed = await tx.branch.updateMany({ where: { tenantId, id: old.id, updatedAt: old.updatedAt }, data: { name: data.name, updatedAt } });
        if (changed.count !== 1) throw new Conflict();
        await audit(tx, tenantId, access.context.profileId, "BRANCH_UPDATED", old.id);
        return { id: old.id, version: updatedAt.toISOString(), changed: true };
      }
      const row = await tx.branch.create({ data: { tenantId, name: data.name }, select });
      await audit(tx, tenantId, access.context.profileId, "BRANCH_CREATED", row.id);
      return { id: row.id, version: row.updatedAt.toISOString(), changed: true };
    }, { isolationLevel: "Serializable" });
    return { status: "saved", message: result.changed ? "Sucursal guardada." : "No hay cambios para guardar.", id: result.id, version: result.version };
  } catch (e) {
    const code = e instanceof Error && "code" in e ? e.code : undefined;
    if (e instanceof Denied) return { status: "forbidden", message: "Tu acceso cambió. Volvé a ingresar." };
    if (e instanceof Conflict || code === "P2034") return { status: "conflict", message: "La sucursal cambió mientras editabas. Volvé a cargarla antes de guardar." };
    // No automatic retries: after uncertain failures the operator must reconcile.
    return { status: "error", message: "No pudimos guardar la sucursal. Volvé a cargar y verificá el resultado antes de intentarlo nuevamente." };
  }
}
async function audit(tx: Prisma.TransactionClient, tenantId: string, actorUserId: string, action: string, entityId: string) {
  await tx.auditEvent.create({ data: { tenantId, actorUserId, action, entityType: "Branch", entityId } });
}
