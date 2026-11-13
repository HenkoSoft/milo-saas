import type { PanelContext } from "./access";
export function canManagePurchases(context: PanelContext): boolean {
  return context.assignments.some(a => ["OWNER", "ADMIN"].includes(a.code) && a.scope === "COMPANY" && a.branch === null);
}
