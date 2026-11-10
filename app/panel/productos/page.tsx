import type { Metadata } from "next";
import Link from "next/link";
import { ProductWorkspace } from "@/components/panel/product-workspace";
import { requirePanelContext } from "@/lib/panel/access";
import { listProducts } from "@/lib/catalog/service";
import { CatalogHeading, CatalogSearch, CatalogPagination, CatalogProblem, catalogQuery, type SearchParams } from "@/components/panel/catalog-ui";

export const metadata: Metadata = { title: "Productos" };
export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePanelContext();
  const result = await listProducts(await catalogQuery(searchParams));
  if (result.status !== "ok") return <CatalogProblem status={result.status} />;
  const data = result.data;
  return <ProductWorkspace><CatalogHeading title="Productos" description="Administrá las fichas de tu catálogo mayorista." /><Link className="milo-primary-button milo-product-new" href="/panel/productos/nuevo" data-product-editor="">Nuevo producto</Link><section className="milo-panel-card"><CatalogSearch q={data.q} path="/panel/productos" /><p className="milo-company-hint">{data.total} {data.total === 1 ? "producto encontrado" : "productos encontrados"}</p>{data.items.length ? <div className="milo-catalog-table-wrap" role="region" aria-label="Listado de productos" tabIndex={0}><table className="milo-catalog-table"><thead><tr><th scope="col">SKU / Producto</th><th scope="col">Categoría / Marca</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead><tbody>{data.items.map(p => <tr key={p.id}><td><strong>{p.sku}</strong><span>{p.name}</span></td><td>{p.categoryName ?? "Sin categoría"}<span>{p.brandName ?? "Sin marca"}</span></td><td><span className="milo-role-badge">{p.isPublished ? "Publicado" : "No publicado"}</span></td><td><Link href={`/panel/productos/${p.id}`} data-product-editor={p.id} aria-label={`Editar ${p.name}`}>Editar →</Link></td></tr>)}</tbody></table></div> : <p className="milo-catalog-empty">{data.q ? "No hay productos que coincidan con la búsqueda." : "Todavía no hay productos registrados."}</p>}<CatalogPagination path="/panel/productos" {...data} /></section></ProductWorkspace>;
}
