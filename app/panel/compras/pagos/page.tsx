import type { Metadata } from "next";
import Link from "next/link";
import { requirePanelContext } from "@/lib/panel/access";
import { purchaseWorkspaceAccess } from "@/lib/purchases/service";
import { listSuppliers, getSupplier } from "@/lib/suppliers/service";
import { PurchaseProblem } from "@/components/panel/purchase-ui";
import type { SearchParams } from "@/components/panel/catalog-ui";
export const metadata: Metadata = { title: "Pagos a Proveedores" };
export default async function SupplierPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePanelContext(); const access = await purchaseWorkspaceAccess();
  if (access.status !== "ok") return <PurchaseProblem status={access.status} />;
  const params = await searchParams, result = await listSuppliers({ q: params.q ?? "", page: params.page ?? "1" });
  if (result.status !== "ok") return <PurchaseProblem status={result.status} />;
  const selected = params.supplier ? await getSupplier(params.supplier) : null;
  if (selected && selected.status !== "ok") return <PurchaseProblem status={selected.status} />;
  const data = result.data, href = (page: number, supplier?: string) => `/panel/compras/pagos?${new URLSearchParams({ q: data.q, page: String(page), ...(supplier ? { supplier } : {}) })}${supplier ? "#supplier-account" : ""}`;
  return <><section className="milo-panel-welcome"><div><p className="milo-card-kicker">COMPRAS</p><h1>Pagos a Proveedores</h1><p>Consulta de proveedores · pagos pendientes de habilitación.</p></div></section>
    <section className="milo-panel-card"><p role="status">Operativo: listado y búsqueda de proveedores de tu empresa. Pendiente: deuda, saldo, cuenta corriente, pagos e imputaciones. El total de una compra no se considera deuda.</p>
      <form method="get" action="/panel/compras/pagos" className="milo-catalog-search"><div className="milo-field"><label htmlFor="payments-q">Buscar proveedor</label><input id="payments-q" name="q" type="search" maxLength={100} defaultValue={data.q} placeholder="Código, nombre o CUIT" /></div><button className="milo-secondary-button">Buscar</button></form>
      <p className="milo-company-hint">{data.total} proveedores</p>
      <div className="milo-catalog-table-wrap" role="region" aria-label="Proveedores para pagos" tabIndex={0}><table className="milo-catalog-table"><thead><tr>{["Código", "Proveedor", "CUIT", "Saldo ARS", "Acciones"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{data.items.map(s => <tr key={s.id}><td>{s.commercialCode}</td><td>{s.name}</td><td>{s.details.cuit || "Sin informar"}</td><td>No disponible</td><td><Link className="milo-secondary-button" href={href(data.page, s.id)}>Consultar proveedor<span className="sr-only"> {s.commercialCode}</span></Link></td></tr>)}{!data.items.length && <tr><td colSpan={5}>No hay proveedores que coincidan con la búsqueda.</td></tr>}</tbody></table></div>
      <nav className="milo-catalog-pagination" aria-label="Paginación de proveedores"><span>Página {data.page} de {data.pages}</span><div>{data.page > 1 && <Link className="milo-secondary-button" href={href(data.page - 1)}>Anterior</Link>}{data.page < data.pages && <Link className="milo-secondary-button" href={href(data.page + 1)}>Siguiente</Link>}</div></nav>
    </section>
    {selected?.status === "ok" && <section id="supplier-account" className="milo-panel-card" aria-labelledby="supplier-account-title"><h2 id="supplier-account-title">{selected.data.commercialCode} · {selected.data.name}</h2><p role="status">Sin cuenta corriente operativa. No se calculan saldos ni se registran pagos.</p><div className="milo-company-form-actions"><button type="button" className="milo-secondary-button" disabled>Ver cuenta corriente (pendiente)</button><button type="button" className="milo-primary-button" disabled>Registrar pago (pendiente)</button></div></section>}
  </>;
}
