import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPanelAccess, type PanelContext } from "@/lib/panel/access";
import { canManageCompany } from "@/lib/panel/company-permission";
import { parseCompanyForm } from "./schema";
import type { CompanyFormState, CompanySettings } from "./types";

const settingsSelect = {
  commercialName: true, address: true, contactData: true, currency: true,
  locale: true, timeZone: true, priceVisibility: true, updatedAt: true,
} as const;

class CompanyAccessDenied extends Error {}
class CompanyConflict extends Error {}

// Recheck membership/role inside the same transaction as the read/write.
async function checkMembership(tx: Prisma.TransactionClient, context: PanelContext) {
  const profile = await tx.userProfile.findUnique({
    where: { authUserId: context.authUserId },
    select: { id: true, tenantId: true },
  });
  if (!profile || profile.id !== context.profileId || profile.tenantId !== context.tenant.id)
    throw new CompanyAccessDenied();
  const assignment = await tx.userRoleAssignment.findFirst({
    where: {
      tenantId: profile.tenantId, userProfileId: profile.id,
      assignmentScope: "COMPANY", branchId: null,
      role: { code: { in: ["OWNER", "ADMIN"] }, assignmentScope: "COMPANY" },
    },
    select: { tenantId: true, userProfileId: true, assignmentScope: true, branchId: true, role: { select: { code: true, assignmentScope: true } } },
  });
  if (!assignment || assignment.tenantId !== profile.tenantId || assignment.userProfileId !== profile.id ||
    assignment.assignmentScope !== "COMPANY" || assignment.branchId !== null ||
    assignment.role.assignmentScope !== "COMPANY" || !["OWNER", "ADMIN"].includes(assignment.role.code))
    throw new CompanyAccessDenied();
  return profile.tenantId;
}

function toSettings(row: Prisma.TenantGetPayload<{ select: typeof settingsSelect }>): CompanySettings {
  return {
    commercialName: row.commercialName, address: row.address,
    // Read-only representation, escaped by React; no assumed public-contact structure.
    contactText: row.contactData === null ? null : JSON.stringify(row.contactData, null, 2),
    currency: row.currency, locale: row.locale, timeZone: row.timeZone,
    priceVisibility: row.priceVisibility, version: row.updatedAt.toISOString(),
  };
}

export async function loadCompanySettings(): Promise<
  { status: "ok"; settings: CompanySettings } | { status: "forbidden" | "error" }
> {
  const access = await getPanelAccess();
  if (access.status !== "allowed" || !canManageCompany(access.context)) return { status: "forbidden" };
  try {
    const settings = await prisma.$transaction(async tx => {
      const tenantId = await checkMembership(tx, access.context);
      const row = await tx.tenant.findUnique({ where: { id: tenantId }, select: settingsSelect });
      if (!row) throw new CompanyAccessDenied();
      return toSettings(row);
    }, { isolationLevel: "RepeatableRead" });
    return { status: "ok", settings };
  } catch (error) {
    return { status: error instanceof CompanyAccessDenied ? "forbidden" : "error" };
  }
}

export async function saveCompanySettings(form: unknown): Promise<CompanyFormState> {
  const access = await getPanelAccess();
  if (access.status !== "allowed" || !canManageCompany(access.context))
    return { status: "forbidden", message: "No tenés permisos para modificar la configuración de la empresa." };
  const parsed = parseCompanyForm(form);
  if (!parsed?.success) {
    const nameError = parsed?.error.issues.find(issue => issue.path[0] === "commercialName")?.message;
    return { status: "invalid", message: "Revisá los datos del formulario. Si el problema continúa, volvé a cargar la página.", nameError };
  }
  const { commercialName, version } = parsed.data;
  const values = { commercialName: commercialName ?? "", version };
  try {
    const result = await prisma.$transaction(async tx => {
      const tenantId = await checkMembership(tx, access.context);
      const current = await tx.tenant.findUnique({ where: { id: tenantId }, select: settingsSelect });
      if (!current) throw new CompanyAccessDenied();
      if (current.updatedAt.toISOString() !== version) throw new CompanyConflict();
      if (current.commercialName === commercialName) return { row: current, changed: false };
      const updated = await tx.tenant.updateMany({
        where: { id: tenantId, updatedAt: new Date(version) },
        data: {
          commercialName,
          // Server-only metadata, strictly advancing the optimistic concurrency token.
          updatedAt: new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1)),
        }, // Explicit allowlist: never spread browser input.
      });
      if (updated.count !== 1) throw new CompanyConflict();
      await tx.auditEvent.create({ data: {
        tenantId, actorUserId: access.context.profileId,
        action: "TENANT_COMMERCIAL_NAME_UPDATED", entityType: "Tenant", entityId: tenantId,
      } });
      const row = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: settingsSelect });
      return { row, changed: true };
    }, { isolationLevel: "Serializable" });
    return {
      status: "saved", message: result.changed ? "Nombre comercial guardado." : "No hay cambios para guardar.",
      values: { commercialName: result.row.commercialName ?? "", version: result.row.updatedAt.toISOString() },
    };
  } catch (error) {
    if (error instanceof CompanyAccessDenied)
      return { status: "forbidden", message: "Tu acceso cambió. Volvé a ingresar antes de continuar." };
    if (error instanceof CompanyConflict || (error instanceof Error && "code" in error && error.code === "P2034"))
      return { status: "conflict", message: "La información cambió mientras editabas. Volvé a cargar la página y revisá los datos.", values };
    return { status: "error", message: "No pudimos guardar los cambios. Volvé a cargar la página antes de intentarlo nuevamente.", values };
  }
}
