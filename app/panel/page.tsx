import { Dashboard } from "@/components/panel/dashboard";
import { requirePanelContext } from "@/lib/panel/access";
import { getDashboardTotals } from "@/lib/panel/dashboard";
import { canManageCompany } from "@/lib/panel/company-permission";
import { canManageCatalog } from "@/lib/panel/catalog-permission";
import { canManageBranches } from "@/lib/panel/branch-permission";
import { workspaceScope } from "@/lib/panel/navigation";
import { canReadInventory } from "@/lib/inventory/permission";

export default async function PanelPage() {
  // A layout alone cannot protect independently executed server components.
  const context = await requirePanelContext();
  const totals = await getDashboardTotals();
  return <Dashboard context={context} totals={totals} scopeLabel={workspaceScope(context)} permissions={{ company: canManageCompany(context), catalog: canManageCatalog(context), branches: canManageBranches(context), inventory: canReadInventory(context) }} />;
}
