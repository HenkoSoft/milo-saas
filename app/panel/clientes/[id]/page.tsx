import { requirePanelContext } from "@/lib/panel/access";
import { getCustomer } from "@/lib/customers/service";
import { CustomerForm } from "@/components/panel/customer-form";
import { CustomerProblem } from "@/components/panel/customer-ui";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelContext();
  const result = await getCustomer((await params).id);
  if (result.status !== "ok") return <CustomerProblem status={result.status} />;
  return <><section className="milo-panel-welcome"><div><h1>{result.data.editable ? "Editar cliente" : "Consultar cliente"}</h1><p>Datos comerciales de tu empresa. El estado se conserva.</p></div></section><CustomerForm key={result.data.version} customer={result.data} /></>;
}
