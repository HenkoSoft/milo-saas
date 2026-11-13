import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PanelShell } from "@/components/panel/panel-shell";
import { requirePanelContext } from "@/lib/panel/access";
import { canManageCompany } from "@/lib/panel/company-permission";
import { canManageCatalog } from "@/lib/panel/catalog-permission";
import { canManageBranches } from "@/lib/panel/branch-permission";
import { workspaceScope } from "@/lib/panel/navigation";
import { canManageCustomers } from "@/lib/panel/customer-permission";
import { canManageSuppliers } from "@/lib/panel/supplier-permission";
import { canManagePurchases } from "@/lib/panel/purchase-permission";
import { canReadInventory } from "@/lib/inventory/permission";
import "@/components/auth/auth.css";
import "@/components/panel/panel.css";
import "@/components/panel/workspace.css";
import "@/components/panel/record-editor.css";
import "@/components/panel/transfer.css";
import "@/components/panel/purchases.css";

export const metadata: Metadata = {
  title: "Panel empresarial", robots: { index: false, follow: false },
};
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const context = await requirePanelContext();
  return <PanelShell companyName={context.tenant.name} userName={context.user.name} scopeLabel={workspaceScope(context)} canManageCompany={canManageCompany(context)} canManageCatalog={canManageCatalog(context)} canManageBranches={canManageBranches(context)} canReadInventory={canReadInventory(context)} canManageCustomers={canManageCustomers(context)} canManageSuppliers={canManageSuppliers(context)} canManagePurchases={canManagePurchases(context)}>{children}</PanelShell>;
}
