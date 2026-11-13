import type { PanelContext } from "./access";

export function canManageCustomers(context: PanelContext): boolean {
  return context.assignments.some(a => (a.code === "OWNER" || a.code === "ADMIN") && a.scope === "COMPANY" && a.branch === null);
}
