import { requirePanelContext } from "@/lib/panel/access";
import { getBrand } from "@/lib/catalog/service";
import { BrandForm } from "@/components/panel/catalog-forms";
import { CatalogHeading, CatalogProblem } from "@/components/panel/catalog-ui";

export default async function BrandPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelContext();
  const result = await getBrand((await params).id);
  if (result.status !== "ok") return <CatalogProblem status={result.status} />;
  return <><CatalogHeading title="Editar marca" description="Actualizá el nombre sin alterar su asociación a los productos." /><BrandForm brand={result.data} /></>;
}
