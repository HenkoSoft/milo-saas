import { requirePanelContext } from "@/lib/panel/access";
import { catalogOptions, getProduct } from "@/lib/catalog/service";
import { ProductForm } from "@/components/panel/catalog-forms";
import { CatalogHeading, CatalogProblem } from "@/components/panel/catalog-ui";
import { getPresentationManagement } from "@/lib/catalog/presentation-service";
import { PresentationManager } from "@/components/panel/presentation-manager";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelContext();
  const result = await getProduct((await params).id);
  if (result.status !== "ok") return <CatalogProblem status={result.status} />;
  const options = await catalogOptions();
  if (options.status !== "ok") return <CatalogProblem status={options.status} />;
  const management = await getPresentationManagement(result.data.product.id);
  if (management.status !== "ok") return <CatalogProblem status={management.status} />;
  return <><CatalogHeading title="Editar producto" description="Actualizá la ficha y su precio. Las presentaciones especiales están en Opciones avanzadas." /><ProductForm product={result.data.product} options={options.data} management={management.data} advanced={<PresentationManager data={management.data} />} /></>;
}
