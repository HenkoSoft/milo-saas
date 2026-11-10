import type { Metadata } from "next";
import Link from "next/link";
import { requirePanelContext } from "@/lib/panel/access";
import { listCategories } from "@/lib/catalog/service";
import { CatalogHeading, CatalogSearch, CatalogPagination, CatalogProblem, catalogQuery, type SearchParams } from "@/components/panel/catalog-ui";

export const metadata: Metadata = { title: "Categorías" };
export default async function CategoriesPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePanelContext();
  const result = await listCategories(await catalogQuery(searchParams));
  if (result.status !== "ok") return <CatalogProblem status={result.status} />;
  const data = result.data;
  return <><CatalogHeading title="Categorías" description="Organizá los productos de tu empresa." href="/panel/categorias/nueva" label="Crear categoría" /><section className="milo-panel-card"><CatalogSearch q={data.q} path="/panel/categorias" /><p className="milo-company-hint">{data.total} {data.total === 1 ? "categoría encontrada" : "categorías encontradas"}</p>{data.items.length ? <div className="milo-catalog-table-wrap" role="region" aria-label="Listado de categorías" tabIndex={0}><table className="milo-catalog-table"><thead><tr><th scope="col">Nombre</th><th scope="col">Acción</th></tr></thead><tbody>{data.items.map(c => <tr key={c.id}><td>{c.name}</td><td><Link href={`/panel/categorias/${c.id}`} aria-label={`Editar ${c.name}`}>Editar →</Link></td></tr>)}</tbody></table></div> : <p className="milo-catalog-empty">{data.q ? "No hay categorías que coincidan con la búsqueda." : "Todavía no hay categorías registradas."}</p>}<CatalogPagination path="/panel/categorias" {...data} /></section></>;
}
