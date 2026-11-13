import { requirePanelContext } from "@/lib/panel/access";
import { loadPurchase } from "@/lib/purchases/service";
import { PurchaseForm } from "@/components/panel/purchase-form";
import { PurchaseProblem } from "@/components/panel/purchase-ui";
export default async function PurchasePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelContext(); const result = await loadPurchase((await params).id);
  if (result.status !== "ok") return <PurchaseProblem status={result.status} />;
  return <><section className="milo-panel-welcome"><div><h1>{result.data.purchase?.code}</h1><p>Detalle de compra y recepción de mercadería.</p></div></section><PurchaseForm key={`${result.data.id}:${result.data.purchase?.input.revision}`} data={result.data} /></>;
}
