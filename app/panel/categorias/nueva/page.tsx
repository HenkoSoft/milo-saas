import { requirePanelContext } from "@/lib/panel/access";
import { canManageCatalog } from "@/lib/panel/catalog-permission";
import { CategoryForm } from "@/components/panel/catalog-forms";
import { CatalogHeading, CatalogProblem } from "@/components/panel/catalog-ui";

export default async function NewCategoryPage() {
  const context = await requirePanelContext();
  if (!canManageCatalog(context)) return <CatalogProblem status="forbidden" />;
  return <><CatalogHeading title="Crear categoría" description="Agregá una clasificación para los productos de tu empresa." /><section className="milo-panel-card"><CategoryForm /></section></>;
}
