import { randomUUID } from "node:crypto";
import { requirePanelContext } from "@/lib/panel/access";
import { canWriteInventory } from "@/lib/inventory/permission";
import { listInventory } from "@/lib/inventory/service";
import { InventoryOperationForm } from "./inventory-operation-form";
import { inventoryParams, InventoryOperations, InventoryProblem } from "./inventory-ui";
import type { SearchParams } from "./catalog-ui";

export async function InventoryOperationPage({ searchParams, adjustment = false }: { searchParams: SearchParams; adjustment?: boolean }) {
  const context = await requirePanelContext();
  if (!canWriteInventory(context)) return <InventoryProblem status="forbidden" />;
  const params = await searchParams;
  const result = await listInventory({ ...inventoryParams(params), page: "1" });
  if (result.status !== "ok") return <InventoryProblem status={result.status} />;
  const data = result.data;
  const path = adjustment ? "/panel/inventario/ajustar" : "/panel/inventario/ingresar";
  const selected = typeof params.product === "string" && data.items.some(p => p.id === params.product) ? params.product : "";
  return <div className="milo-inventory"><section className="milo-panel-welcome"><div><p className="milo-card-kicker">INVENTARIO / MOVIMIENTOS</p><h1>{adjustment ? "Ajustar stock" : "Ingresar mercadería"}</h1><p>{adjustment ? "Registrá una corrección con su motivo, sin sobrescribir el historial." : "Elegí sucursal, artículo y cantidad para registrar un ingreso."}</p></div></section>
    {!data.operationsReady ? <InventoryOperations ready={false} canOperate /> : <><section className="milo-panel-card"><h2>Elegir sucursal y buscar artículo</h2><form className="milo-catalog-search" method="get" action={path}><div className="milo-field"><label htmlFor="operation-branch">Sucursal</label><select id="operation-branch" name="branch" defaultValue={data.branch?.id ?? ""} required><option value="">Elegí una sucursal</option>{data.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div><div className="milo-field"><label htmlFor="operation-search">Buscar artículo</label><input id="operation-search" name="q" defaultValue={data.q} maxLength={100} placeholder="Nombre o SKU" /></div><button className="milo-secondary-button" disabled={!data.branches.length}>Buscar</button></form><p className="milo-company-hint">{data.branches.length ? "Se muestran hasta 25 artículos. Afiná la búsqueda si no encontrás el que necesitás." : "Tu empresa no tiene sucursales disponibles para esta cuenta."}</p></section>
      {data.branch && <section className="milo-panel-card">{data.items.length ? <InventoryOperationForm operationId={randomUUID()} adjustment={adjustment} branch={data.branch} products={data.items} selectedProduct={selected} /> : <p className="milo-catalog-empty">No hay artículos que coincidan con la búsqueda.</p>}</section>}</>}
  </div>;
}
