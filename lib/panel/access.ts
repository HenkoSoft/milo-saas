import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const roleLabels = {
  OWNER: "Dueño", ADMIN: "Administrador", MANAGER: "Encargado",
  SALES: "Vendedor", TECHNICIAN: "Técnico", WAREHOUSE: "Depósito",
} as const;

export type BusinessRole = keyof typeof roleLabels;
export type PanelContext = {
  authUserId: string;
  profileId: string;
  user: { name: string; email: string };
  tenant: { id: string; name: string };
  assignments: {
    code: BusinessRole; label: string; scope: "COMPANY" | "BRANCH";
    branch: { id: string; name: string } | null;
  }[];
};
type PanelAccess =
  | { status: "allowed"; context: PanelContext }
  | { status: "unauthenticated" | "forbidden" | "unavailable" };

// Request/render cache only. Never accepts identity, tenant or roles from a client.
export const getPanelAccess = cache(async (): Promise<PanelAccess> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
      query: { disableCookieCache: true, disableRefresh: true },
    });
    if (!session?.user.id || session.session.userId !== session.user.id ||
      !(new Date(session.session.expiresAt).getTime() > Date.now()))
      return { status: "unauthenticated" };

    const profile = await prisma.userProfile.findUnique({
      where: { authUserId: session.user.id },
      select: {
        id: true, authUserId: true, tenantId: true,
        tenant: { select: { id: true, commercialName: true, legalName: true } },
      },
    });
    if (!profile || profile.authUserId !== session.user.id ||
      !profile.tenant || profile.tenant.id !== profile.tenantId)
      return { status: "forbidden" };

    const rows = await prisma.userRoleAssignment.findMany({
      where: { tenantId: profile.tenantId, userProfileId: profile.id },
      select: {
        tenantId: true, userProfileId: true, assignmentScope: true, branchId: true,
        role: { select: { code: true, assignmentScope: true } },
        branch: { select: { id: true, tenantId: true, name: true } },
      },
      orderBy: [{ role: { code: "asc" } }, { branchId: "asc" }],
    });
    const assignments: PanelContext["assignments"] = [];
    for (const row of rows) {
      if (row.tenantId !== profile.tenantId || row.userProfileId !== profile.id ||
        !Object.hasOwn(roleLabels, row.role.code) || row.assignmentScope !== row.role.assignmentScope)
        return { status: "forbidden" };
      const code = row.role.code as BusinessRole;
      const companyScope = code === "OWNER" || code === "ADMIN";
      if (companyScope) {
        if (row.assignmentScope !== "COMPANY" || row.branchId !== null || row.branch !== null)
          return { status: "forbidden" };
      } else if (row.assignmentScope !== "BRANCH" || !row.branch ||
        row.branchId !== row.branch.id || row.branch.tenantId !== profile.tenantId)
        return { status: "forbidden" };
      assignments.push({
        code, label: roleLabels[code], scope: companyScope ? "COMPANY" : "BRANCH",
        branch: row.branch ? { id: row.branch.id, name: row.branch.name } : null,
      });
    }
    return {
      status: "allowed",
      context: {
        authUserId: session.user.id,
        profileId: profile.id,
        user: { name: session.user.name, email: session.user.email },
        tenant: { id: profile.tenantId, name: profile.tenant.commercialName || profile.tenant.legalName || "Empresa sin nombre comercial" },
        assignments,
      },
    };
  } catch {
    // Fail closed without serializing/logging database errors or session data.
    return { status: "unavailable" };
  }
});

// Use in every protected page and future operation, not just the layout.
// Membership is not authorization for any commercial operation.
export async function requirePanelContext(): Promise<PanelContext> {
  const access = await getPanelAccess();
  if (access.status === "allowed") return access.context;
  if (access.status === "unauthenticated") redirect("/acceso");
  redirect(access.status === "forbidden" ? "/acceso?motivo=sin-acceso" : "/acceso?motivo=no-disponible");
}
