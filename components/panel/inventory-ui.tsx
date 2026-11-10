import Link from "next/link";
import { notFound } from "next/navigation";

export function InventoryProblem({ status }: { status: "forbidden" | "invalid" | "missing" | "error" }) {
  if (status === "missing") notFound();
  return <section className="milo-panel-card"><h1>{status === "forbidden" ? "Acceso restringido" : status === "invalid" ? "Revisá la selección de sucursal" : "No pudimos consultar el inventario"}</h1><p className="milo-company-hint">{status === "forbidden" ? "Tu cuenta no tiene permiso para esta operación o sucursal." : "Volvé al listado y elegí una sucursal disponible para tu cuenta."}</p><Link className="milo-secondary-button" href={status === "forbidden" ? "/panel" : "/panel/inventario"}>Volver</Link></section>;
}
export function InventoryOperations({ ready, canOperate, branch = "" }: { ready: boolean; canOperate: boolean; branch?: string }) {
  if (!canOperate) return <section className="milo-panel-card"><p className="milo-company-hint">Tu acceso al inventario es de consulta, dentro de las sucursales asignadas.</p></section>;
  const query = branch ? `?${new URLSearchParams({ branch })}` : "";
  return <section className="milo-panel-card"><div className="milo-company-form-actions">{ready ? <><Link className="milo-primary-button" href={`/panel/inventario/ingresar${query}`}>Ingresar mercadería</Link><Link className="milo-secondary-button" href={`/panel/inventario/ajustar${query}`}>Ajustar stock</Link></> : <><button className="milo-primary-button" type="button" disabled aria-describedby="inventory-operation-block">Ingresar mercadería</button><button className="milo-secondary-button" type="button" disabled aria-describedby="inventory-operation-block">Ajustar stock</button></>}</div>{!ready && <p id="inventory-operation-block" className="milo-company-hint">Los movimientos manuales están pendientes de activación en esta base. Consultá al administrador. La consulta de existencias e historial sigue disponible.</p>}</section>;
}
export function InventoryPagination({ path, branch, q = "", page, pages }: { path: string; branch: string; q?: string; page: number; pages: number }) {
  const href = (n: number) => `${path}?${new URLSearchParams({ branch, q, page: String(n) })}`;
  return <nav className="milo-catalog-pagination" aria-label="Paginación de inventario"><span>Página {page} de {pages}</span><div>{page > 1 && <Link className="milo-secondary-button" href={href(page - 1)}>Anterior</Link>}{page < pages && <Link className="milo-secondary-button" href={href(page + 1)}>Siguiente</Link>}</div></nav>;
}
export function inventoryParams(params: Record<string, string | string[] | undefined>) {
  return { branch: params.branch ?? "", q: params.q ?? "", page: params.page ?? "1" };
}
export function movementDate(date: string, zone: string | null) {
  try { return new Intl.DateTimeFormat("es-AR", { timeZone: zone ?? "UTC", dateStyle: "short", timeStyle: "medium" }).format(new Date(date)) + ` (${zone ?? "UTC"})`; }
  catch { return date.replace("T", " ").replace("Z", " UTC"); }
}
