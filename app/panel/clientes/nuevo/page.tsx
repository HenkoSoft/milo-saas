import { requirePanelContext } from "@/lib/panel/access";
import { newCustomerEditor } from "@/lib/customers/service";
import { CustomerForm } from "@/components/panel/customer-form";
import { CustomerProblem } from "@/components/panel/customer-ui";

export default async function NewCustomerPage() {
  await requirePanelContext();
  const result = await newCustomerEditor();
  if (result.status !== "ok") return <CustomerProblem status={result.status} />;
  return <><section className="milo-panel-welcome"><div><h1>Nuevo cliente</h1><p>Registrá los datos comerciales sin habilitar acceso ni compras.</p></div></section><CustomerForm schemaReady={result.data.schemaReady} /></>;
}
