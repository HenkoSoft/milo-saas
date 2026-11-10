import type { Metadata } from "next";
import { requirePanelContext } from "@/lib/panel/access";
import { getBranch } from "@/lib/branches/service";
import { BranchForm } from "@/components/panel/branch-form";
import { BranchHeading, BranchProblem } from "@/components/panel/branch-ui";

export const metadata: Metadata = { title: "Editar sucursal" };
export default async function BranchPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelContext();
  const result = await getBranch((await params).id);
  if (result.status !== "ok") return <BranchProblem status={result.status} />;
  return <><BranchHeading title="Editar sucursal" description="Actualizá su nombre conservando las relaciones y el historial." /><section className="milo-panel-card"><BranchForm branch={result.data} /></section></>;
}
