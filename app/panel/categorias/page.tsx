import { TableEditAction } from "@/components/panel/table-edit-action";
import type { Metadata } from "next";
import Link from "next/link";
import { TaxonomyWorkspace } from "@/components/panel/taxonomy-workspace";
import { requirePanelContext } from "@/lib/panel/access";
import { listCategories } from "@/lib/catalog/service";
import { CatalogHeading, CatalogSearch, CatalogPagination, CatalogProblem, catalogQuery, type SearchParams } from "@/components/panel/catalog-ui";

export const metadata: Metadata = { title: "Categorías" };
export default async function CategoriesPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePanelContext();
  const result = await listCategories(await catalogQuery(searchParams));
  if (result.status !== "ok") return <CatalogProblem status={result.status} />;
  const data = result.data;
  return <TaxonomyWorkspace kind="category"><CatalogHeading title="Categorías" description="Organizá los productos de tu empresa." /><Link className="milo-primary-button milo-record-new" data-record-editor="" href="/panel/categorias/nueva">Crear categoría</Link><section className="milo-panel-card"><CatalogSearch q={data.q} path="/panel/categorias" /><p className="milo-company-hint">{data.total} {data.total === 1 ? "categoría encontrada" : "categorías encontradas"}</p>{data.items.length ? <div className="milo-catalog-table-wrap" role="region" aria-label="Listado de categorías" tabIndex={0}><table className="milo-catalog-table"><thead><tr><th scope="col">Nombre</th><th scope="col">Acción</th></tr></thead><tbody>{data.items.map(c => <tr key={c.id}><td>{c.name}</td><td><TableEditAction href={`/panel/categorias/${c.id}`} label={c.name} recordId={c.id} /></td></tr>)}</tbody></table></div> : <p className="milo-catalog-empty">{data.q ? "No hay categorías que coincidan con la búsqueda." : "Todavía no hay categorías registradas."}</p>}<CatalogPagination path="/panel/categorias" {...data} /></section></TaxonomyWorkspace>;
}
