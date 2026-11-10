import type { PanelContext } from "./access";

// Only the company configuration capability approved for this stage.
export function canManageCompany(context: PanelContext): boolean {
  return context.assignments.some(assignment =>
    (assignment.code === "OWNER" || assignment.code === "ADMIN") &&
    assignment.scope === "COMPANY" && assignment.branch === null,
  );
}
