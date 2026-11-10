import "server-only";
import { prisma } from "@/lib/prisma";
import { getPanelAccess } from "./access";
import { canManageCompany } from "./company-permission";

export type DashboardTotals = { status: "ok"; customers: number; products: number } | { status: "restricted" | "unavailable" };
class Denied extends Error {}

export async function getDashboardTotals(): Promise<DashboardTotals> {
  const access = await getPanelAccess();
  if (access.status !== "allowed" || !canManageCompany(access.context)) return { status: "restricted" };
  try {
    return await prisma.$transaction(async tx => {
      const context = access.context;
      const profile = await tx.userProfile.findUnique({ where: { authUserId: context.authUserId }, select: { id: true, tenantId: true } });
      if (!profile || profile.id !== context.profileId || profile.tenantId !== context.tenant.id) throw new Denied();
      const assignment = await tx.userRoleAssignment.findFirst({
        where: { tenantId: profile.tenantId, userProfileId: profile.id, assignmentScope: "COMPANY", branchId: null, role: { code: { in: ["OWNER", "ADMIN"] }, assignmentScope: "COMPANY" } },
        select: { tenantId: true, userProfileId: true, assignmentScope: true, branchId: true, role: { select: { code: true, assignmentScope: true } } },
      });
      if (!assignment || assignment.tenantId !== profile.tenantId || assignment.userProfileId !== profile.id || assignment.assignmentScope !== "COMPANY" || assignment.branchId !== null || assignment.role.assignmentScope !== "COMPANY" || !["OWNER", "ADMIN"].includes(assignment.role.code)) throw new Denied();
      // All registered records; approval and publication are separate concepts.
      const [customers, products] = await Promise.all([
        tx.customer.count({ where: { tenantId: profile.tenantId } }),
        tx.product.count({ where: { tenantId: profile.tenantId } }),
      ]);
      return { status: "ok" as const, customers, products };
    }, { isolationLevel: "RepeatableRead" });
  } catch (e) { return { status: e instanceof Denied ? "restricted" : "unavailable" }; }
}
