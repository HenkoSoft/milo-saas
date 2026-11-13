import { requirePanelContext } from "@/lib/panel/access";
import { getSupplier } from "@/lib/suppliers/service";
import { SupplierForm } from "@/components/panel/supplier-form";
import { SupplierProblem } from "@/components/panel/supplier-ui";
export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelContext(); const result = await getSupplier((await params).id);
  if (result.status !== "ok") return <SupplierProblem status={result.status} />;
  return <><section className="milo-panel-welcome"><div><h1>Editar proveedor</h1><p>{result.data.commercialCode} · {result.data.name}</p></div></section><SupplierForm key={result.data.version} supplier={result.data} /></>;
}
