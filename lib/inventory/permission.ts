import type { PanelContext } from "@/lib/panel/access";

// WAREHOUSE already covers inventory; its branch scope never expands the tenant.
// MANAGER consultation was explicitly approved; SALES/TECHNICIAN stay denied.
export function canReadInventory(context: PanelContext): boolean {
  return context.assignments.some(a => (["OWNER", "ADMIN"].includes(a.code) && a.scope === "COMPANY" && a.branch === null)
    || (["WAREHOUSE", "MANAGER"].includes(a.code) && a.scope === "BRANCH" && a.branch !== null));
}
export function canWriteInventory(context: PanelContext): boolean {
  return context.assignments.some(a => (["OWNER", "ADMIN"].includes(a.code) && a.scope === "COMPANY" && a.branch === null)
    || (a.code === "WAREHOUSE" && a.scope === "BRANCH" && a.branch !== null));
}
