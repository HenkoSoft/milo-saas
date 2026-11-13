import type { Metadata } from "next";
import { requirePanelContext } from "@/lib/panel/access";
import { purchaseWorkspaceAccess } from "@/lib/purchases/service";
import { purchaseQuery } from "@/lib/purchases/schema";
import { PurchaseProblem } from "@/components/panel/purchase-ui";
import { CreditNoteList } from "@/components/panel/purchase-pending";
import type { SearchParams } from "@/components/panel/catalog-ui";
export const metadata: Metadata = { title: "Consulta de N/C" };
export default async function SupplierCreditNotesPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePanelContext(); const access = await purchaseWorkspaceAccess();
  if (access.status !== "ok") return <PurchaseProblem status={access.status} />;
  const params = await searchParams, parsed = purchaseQuery.shape.q.safeParse(params.q ?? "");
  if (!parsed.success) return <PurchaseProblem status="invalid" />;
  return <><section className="milo-panel-welcome"><div><p className="milo-card-kicker">COMPRAS</p><h1>Consulta de N/C</h1><p>Consulta de notas de crédito de proveedores.</p></div></section><CreditNoteList q={parsed.data} /></>;
}
