import type { Metadata } from "next";
import { requirePanelContext } from "@/lib/panel/access";
import { canManageBranches } from "@/lib/panel/branch-permission";
import { BranchForm } from "@/components/panel/branch-form";
import { BranchHeading, BranchProblem } from "@/components/panel/branch-ui";

export const metadata: Metadata = { title: "Crear sucursal" };
export default async function NewBranchPage() {
  const context = await requirePanelContext();
  if (!canManageBranches(context)) return <BranchProblem status="forbidden" />;
  return <><BranchHeading title="Crear sucursal" description="Registrá una sucursal real de tu empresa." /><section className="milo-panel-card"><BranchForm /></section></>;
}
