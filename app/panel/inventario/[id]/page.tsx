import { formatInventoryQuantity } from "@/lib/inventory/format";
import type { Metadata } from "next";
import Link from "next/link";
import { requirePanelContext } from "@/lib/panel/access";
import { inventoryHistory } from "@/lib/inventory/service";
import { InventoryPagination, InventoryProblem, inventoryParams, movementDate } from "@/components/panel/inventory-ui";
import type { SearchParams } from "@/components/panel/catalog-ui";

export const metadata: Metadata = { title: "Historial de inventario" };
export default async function HistoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  await requirePanelContext();
  const result = await inventoryHistory((await params).id, inventoryParams(await searchParams));
  if (result.status !== "ok") return <InventoryProblem status={result.status} />;
  const data = result.data;
  return <div className="milo-inventory"><section className="milo-panel-welcome"><div><p className="milo-card-kicker">INVENTARIO / HISTORIAL</p><h1>{data.product.name}</h1><p>SKU {data.product.sku} · {data.branch.name}</p></div><Link className="milo-secondary-button" href={`/panel/inventario?${new URLSearchParams({ branch: data.branch.id })}`}>Volver a inventario</Link></section>
    <section className="milo-panel-card"><h2>Existencia registrada</h2><p className="milo-inventory-quantity">{data.quantity === null ? "Sin saldo registrado" : `${formatInventoryQuantity(data.quantity, data.product)} ${data.product.unit}`}</p><p className="milo-company-hint">El historial se conserva sin editar ni borrar movimientos. Los valores se muestran en la unidad base del artículo.</p></section>
    <section className="milo-panel-card"><h2>Movimientos</h2>{data.movements.length ? <div className="milo-catalog-table-wrap" role="region" aria-label="Historial de movimientos" tabIndex={0}><table className="milo-catalog-table"><thead><tr><th scope="col">Fecha</th><th scope="col">Usuario</th><th scope="col">Sucursal</th><th scope="col">Tipo registrado</th><th scope="col">Cantidad</th><th scope="col">Motivo</th><th scope="col">Origen vinculado</th></tr></thead><tbody>{data.movements.map(m => <tr key={m.id}><td><time dateTime={m.date}>{movementDate(m.date, data.timeZone)}</time></td><td>{m.actorName ?? "Perfil empresarial"}<span>{m.actorId}</span></td><td>{data.branch.name}</td><td>{m.type}</td><td className="milo-inventory-quantity">{formatInventoryQuantity(m.quantity, data.product)} {data.product.unit}</td><td>{m.reason ?? "Sin motivo registrado"}</td><td>{m.sourceReference ?? (m.sourceOrderId ? `Pedido ${m.sourceOrderId}` : "Sin referencia informada")}<span>{m.id}</span></td></tr>)}</tbody></table></div> : <p className="milo-catalog-empty">No hay movimientos registrados para este artículo en esta sucursal.</p>}<InventoryPagination path={`/panel/inventario/${data.product.id}`} branch={data.branch.id} page={data.page} pages={data.pages} /></section>
  </div>;
}
