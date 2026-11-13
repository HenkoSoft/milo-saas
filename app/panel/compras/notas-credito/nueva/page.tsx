import type { Metadata } from "next";
import { requirePanelContext } from "@/lib/panel/access";
import { purchaseWorkspaceAccess } from "@/lib/purchases/service";
import { PurchaseProblem } from "@/components/panel/purchase-ui";
import { CreditNoteEntry } from "@/components/panel/purchase-pending";
export const metadata: Metadata = { title: "N/C Proveedor (Carga)" };
export default async function NewSupplierCreditNotePage() {
  await requirePanelContext(); const access = await purchaseWorkspaceAccess();
  if (access.status !== "ok") return <PurchaseProblem status={access.status} />;
  return <><section className="milo-panel-welcome"><div><p className="milo-card-kicker">COMPRAS</p><h1>N/C Proveedor (Carga)</h1><p>Estructura de carga · escritura pendiente de reglas y modelo.</p></div></section><CreditNoteEntry /></>;
}
