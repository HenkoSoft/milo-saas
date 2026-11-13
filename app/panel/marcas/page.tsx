import { TableEditAction } from "@/components/panel/table-edit-action";
import type { Metadata } from "next";
import Link from "next/link";
import { TaxonomyWorkspace } from "@/components/panel/taxonomy-workspace";
import { requirePanelContext } from "@/lib/panel/access";
import { listBrands } from "@/lib/catalog/service";
import { CatalogHeading, CatalogSearch, CatalogPagination, CatalogProblem, catalogQuery, type SearchParams } from "@/components/panel/catalog-ui";

export const metadata: Metadata = { title: "Marcas" };
export default async function BrandsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePanelContext();
  const result = await listBrands(await catalogQuery(searchParams));
  if (result.status !== "ok") return <CatalogProblem status={result.status} />;
  const data = result.data;
  return <TaxonomyWorkspace kind="brand"><CatalogHeading title="Marcas" description="Administrá las marcas de los productos de tu empresa." /><Link className="milo-primary-button milo-record-new" data-record-editor="" href="/panel/marcas/nueva">Crear marca</Link><section className="milo-panel-card"><CatalogSearch path="/panel/marcas" q={data.q} /><p className="milo-company-hint">{data.total} {data.total === 1 ? "marca encontrada" : "marcas encontradas"}</p>{data.items.length ? <div className="milo-catalog-table-wrap" role="region" aria-label="Listado de marcas" tabIndex={0}><table className="milo-catalog-table"><thead><tr><th scope="col">Nombre</th><th scope="col">Acción</th></tr></thead><tbody>{data.items.map(b => <tr key={b.id}><td>{b.name}</td><td><TableEditAction href={`/panel/marcas/${b.id}`} label={b.name} recordId={b.id} /></td></tr>)}</tbody></table></div> : <p className="milo-catalog-empty">{data.q ? "No hay marcas que coincidan con la búsqueda." : "Todavía no hay marcas registradas."}</p>}<CatalogPagination path="/panel/marcas" {...data} /></section></TaxonomyWorkspace>;
}
