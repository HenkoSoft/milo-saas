import type { Metadata } from "next";
import Link from "next/link";
import { requirePanelContext } from "@/lib/panel/access";
import { listBranches } from "@/lib/branches/service";
import { BranchHeading, BranchProblem } from "@/components/panel/branch-ui";
import { CatalogSearch, CatalogPagination, catalogQuery, type SearchParams } from "@/components/panel/catalog-ui";

export const metadata: Metadata = { title: "Sucursales" };
export default async function BranchesPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePanelContext();
  const result = await listBranches(await catalogQuery(searchParams));
  if (result.status !== "ok") return <BranchProblem status={result.status} />;
  const data = result.data;
  return <><BranchHeading title="Sucursales" description="Administrá las sucursales de tu empresa." create /><section className="milo-panel-card"><CatalogSearch path="/panel/sucursales" q={data.q} /><p className="milo-company-hint">{data.total} {data.total === 1 ? "sucursal encontrada" : "sucursales encontradas"}</p>{data.items.length ? <div className="milo-catalog-table-wrap" role="region" aria-label="Listado de sucursales" tabIndex={0}><table className="milo-catalog-table"><thead><tr><th scope="col">Nombre</th><th scope="col">Acción</th></tr></thead><tbody>{data.items.map(b => <tr key={b.id}><td>{b.name}</td><td><Link href={`/panel/sucursales/${b.id}`} aria-label={`Editar ${b.name}`}>Editar →</Link></td></tr>)}</tbody></table></div> : <p className="milo-catalog-empty">{data.q ? "No hay sucursales que coincidan con la búsqueda." : "Todavía no hay sucursales registradas. Creá la primera cuando tengas sus datos reales."}</p>}<CatalogPagination path="/panel/sucursales" {...data} /></section></>;
}
