import { requirePanelContext } from "@/lib/panel/access";
import { getCategory } from "@/lib/catalog/service";
import { CategoryForm } from "@/components/panel/catalog-forms";
import { CatalogHeading, CatalogProblem } from "@/components/panel/catalog-ui";

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelContext();
  const result = await getCategory((await params).id);
  if (result.status !== "ok") return <CatalogProblem status={result.status} />;
  return <><CatalogHeading title="Editar categoría" description="Los cambios se aplican a la categoría de tu empresa." /><section className="milo-panel-card"><CategoryForm category={result.data} /></section></>;
}
