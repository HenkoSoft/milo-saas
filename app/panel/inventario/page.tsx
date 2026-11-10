import { formatInventoryQuantity } from "@/lib/inventory/format";
import type { Metadata } from "next";
import Link from "next/link";
import { requirePanelContext } from "@/lib/panel/access";
import { listInventory } from "@/lib/inventory/service";
import { canWriteInventory } from "@/lib/inventory/permission";
import { InventoryOperations, InventoryPagination, InventoryProblem, inventoryParams } from "@/components/panel/inventory-ui";
import type { SearchParams } from "@/components/panel/catalog-ui";

export const metadata: Metadata = { title: "Inventario" };
export default async function InventoryPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await requirePanelContext();
  const result = await listInventory(inventoryParams(await searchParams));
  if (result.status !== "ok") return <InventoryProblem status={result.status} />;
  const data = result.data;
  return <div className="milo-inventory"><section className="milo-panel-welcome"><div><p className="milo-card-kicker">OPERACIONES / INVENTARIO</p><h1>Inventario</h1><p>Consultá existencias e historial de tus artículos por sucursal.</p></div></section><InventoryOperations ready={data.operationsReady} canOperate={canWriteInventory(context)} branch={data.branch?.id} />
    <section className="milo-panel-card"><form action="/panel/inventario" className="milo-catalog-search" method="get"><div className="milo-field"><label htmlFor="inventory-branch">Sucursal</label><select id="inventory-branch" name="branch" defaultValue={data.branch?.id ?? ""} required><option value="">Elegí una sucursal</option>{data.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div><div className="milo-field"><label htmlFor="inventory-search">Artículo</label><input id="inventory-search" name="q" type="search" defaultValue={data.q} maxLength={100} placeholder="Nombre o SKU" /></div><button className="milo-secondary-button" disabled={!data.branches.length}>Consultar</button></form>
      {!data.branches.length ? <p className="milo-catalog-empty">Tu empresa todavía no tiene sucursales registradas.</p> : !data.branch ? <p className="milo-catalog-empty">Elegí una sucursal para consultar las existencias. No se selecciona ninguna automáticamente.</p> : <><p className="milo-company-hint">Sucursal: {data.branch.name}. Cantidades en unidad base; no se calculan reservas ni conversiones.</p>{data.items.length ? <div className="milo-catalog-table-wrap" role="region" aria-label="Existencias por artículo" tabIndex={0}><table className="milo-catalog-table"><thead><tr><th scope="col">SKU</th><th scope="col">Artículo</th><th scope="col">Unidad</th><th scope="col">Existencia registrada</th><th scope="col">Historial</th></tr></thead><tbody>{data.items.map(p => <tr key={p.id}><td>{p.sku}</td><td>{p.name}</td><td>{p.unit}</td><td className="milo-inventory-quantity">{formatInventoryQuantity(p.quantity, p)}</td><td><Link href={`/panel/inventario/${p.id}?${new URLSearchParams({ branch: data.branch!.id })}`} aria-label={`Ver movimientos de ${p.name}`}>Ver movimientos →</Link></td></tr>)}</tbody></table></div> : <p className="milo-catalog-empty">No hay artículos que coincidan con la búsqueda.</p>}<InventoryPagination path="/panel/inventario" branch={data.branch.id} q={data.q} page={data.page} pages={data.pages} /></>}
    </section></div>;
}
