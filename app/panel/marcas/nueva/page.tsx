import { requirePanelContext } from "@/lib/panel/access";
import { canManageCatalog } from "@/lib/panel/catalog-permission";
import { BrandForm } from "@/components/panel/catalog-forms";
import { CatalogHeading, CatalogProblem } from "@/components/panel/catalog-ui";

export default async function NewBrandPage() {
  const context = await requirePanelContext();
  if (!canManageCatalog(context)) return <CatalogProblem status="forbidden" />;
  return <><CatalogHeading title="Crear marca" description="Registrá una marca para los productos de tu empresa." /><BrandForm /></>;
}
