import { requirePanelContext } from "@/lib/panel/access";
import { catalogOptions } from "@/lib/catalog/service";
import { ProductForm } from "@/components/panel/catalog-forms";
import { CatalogHeading, CatalogProblem } from "@/components/panel/catalog-ui";

export default async function NewProductPage() {
  await requirePanelContext();
  const result = await catalogOptions();
  if (result.status !== "ok") return <CatalogProblem status={result.status} />;
  return <><CatalogHeading title="Crear producto" description="Cargá los datos comerciales y el precio en un solo paso." /><ProductForm options={result.data} /></>;
}
