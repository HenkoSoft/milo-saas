import { requirePanelContext } from "@/lib/panel/access";
import { newSupplierEditor } from "@/lib/suppliers/service";
import { SupplierForm } from "@/components/panel/supplier-form";
import { SupplierProblem } from "@/components/panel/supplier-ui";
export default async function NewSupplierPage() {
  await requirePanelContext(); const result = await newSupplierEditor();
  if (result.status !== "ok") return <SupplierProblem status={result.status} />;
  return <><section className="milo-panel-welcome"><div><h1>Nuevo proveedor</h1><p>Registrá una razón social o nombre comercial. Los datos fiscales son opcionales.</p></div></section><SupplierForm /></>;
}
