import type { Metadata } from "next";
import { TransferToolbar } from "@/components/panel/transfer-toolbar";
import { requirePanelContext } from "@/lib/panel/access";
import { listSuppliers } from "@/lib/suppliers/service";
import { CatalogSearch, CatalogPagination, catalogQuery, type SearchParams } from "@/components/panel/catalog-ui";
import { SupplierWorkspace } from "@/components/panel/supplier-workspace";
import { SupplierProblem } from "@/components/panel/supplier-ui";
import { SupplierDeleteAction } from "@/components/panel/supplier-delete-action";
import { TableEditAction } from "@/components/panel/table-edit-action";
export const metadata: Metadata = { title: "Proveedores" };
export default async function SuppliersPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePanelContext(); const result = await listSuppliers(await catalogQuery(searchParams));
  if (result.status !== "ok") return <SupplierProblem status={result.status} />;
  const data = result.data;
  return <SupplierWorkspace>
    <section className="milo-panel-welcome"><div><p className="milo-card-kicker">ADMINISTRACIÓN / PROVEEDORES</p><h1>Proveedores</h1><p>Fichas comerciales de tu empresa para futuras operaciones de compra.</p></div></section>
    <TransferToolbar kind="proveedores" q={data.q} />
    <section className="milo-panel-card"><CatalogSearch q={data.q} path="/panel/proveedores" /><p className="milo-company-hint">Buscá por código, razón social, nombre comercial, CUIT, contacto, teléfono, WhatsApp o correo.</p><p className="milo-company-hint">{data.total} {data.total === 1 ? "proveedor encontrado" : "proveedores encontrados"}</p>
      {data.items.length ? <div className="milo-catalog-table-wrap" role="region" aria-label="Listado de proveedores" tabIndex={0}><table className="milo-catalog-table milo-supplier-table">
        <thead><tr>{["Código", "Razón social", "Nombre comercial", "Dirección", "Contacto", "Teléfono", "CUIT", "Acciones"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{data.items.map(supplier => <tr key={supplier.id}>
          <td>{supplier.commercialCode}</td><td><strong>{supplier.details.legalName || "—"}</strong></td><td>{supplier.details.commercialName || "—"}</td><td>{supplier.details.address || "—"}</td><td>{supplier.details.contactName || "—"}</td><td>{supplier.details.phone || "—"}</td><td>{supplier.details.cuit.replace(/^(\d{2})(\d{8})(\d)$/, "$1-$2-$3") || "—"}</td>
          <td><div className="milo-table-actions"><TableEditAction href={`/panel/proveedores/${supplier.id}`} label={supplier.name} recordId={supplier.id} /><SupplierDeleteAction id={supplier.id} version={supplier.version} label={supplier.name} /></div></td>
        </tr>)}</tbody></table></div> : <p className="milo-catalog-empty">{data.q ? "No hay proveedores que coincidan con la búsqueda." : "Todavía no hay proveedores registrados."}</p>}
      <CatalogPagination path="/panel/proveedores" {...data} />
    </section>
  </SupplierWorkspace>;
}
