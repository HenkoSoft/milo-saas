import { TableEditAction } from "@/components/panel/table-edit-action";
import { CustomerDeleteAction } from "@/components/panel/customer-delete-action";
import type { Metadata } from "next";
import Link from "next/link";
import { TransferToolbar } from "@/components/panel/transfer-toolbar";
import { requirePanelContext } from "@/lib/panel/access";
import { listCustomers } from "@/lib/customers/service";
import { CatalogSearch, CatalogPagination, catalogQuery, type SearchParams } from "@/components/panel/catalog-ui";
import { CustomerWorkspace } from "@/components/panel/customer-workspace";
import { CustomerProblem } from "@/components/panel/customer-ui";

export const metadata: Metadata = { title: "Clientes" };
export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePanelContext();
  const result = await listCustomers(await catalogQuery(searchParams));
  if (result.status !== "ok") return <CustomerProblem status={result.status} />;
  const data = result.data;
  return <CustomerWorkspace>
    <section className="milo-panel-welcome"><div><p className="milo-card-kicker">ADMINISTRACIÓN / CLIENTES</p><h1>Clientes</h1><p>Administrá las fichas comerciales de tu empresa.</p></div></section>
    {data.schemaReady ? <TransferToolbar kind="clientes" q={data.q} /> : <Link className="milo-primary-button milo-record-new" href="/panel/clientes/nuevo" data-record-editor="">Nuevo cliente</Link>}
    {!data.schemaReady && <p className="milo-company-hint milo-customer-migration-notice">La ampliación comercial y Eliminar requieren la migración de Clientes, todavía pendiente. El listado y el formulario básico siguen operativos.</p>}
    <section className="milo-panel-card"><CatalogSearch q={data.q} path="/panel/clientes" /><p className="milo-company-hint">Buscá por nombre, correo o teléfono. Las fichas anteriores sin formato compatible se muestran al limpiar la búsqueda.</p><p className="milo-company-hint">{data.total} {data.total === 1 ? "cliente encontrado" : "clientes encontrados"}</p>
      {data.items.length ? <div className="milo-catalog-table-wrap" role="region" aria-label="Listado de clientes" tabIndex={0}>
        <table className="milo-catalog-table milo-customer-table">
          <thead><tr><th scope="col">Código</th><th scope="col">Razón social</th><th scope="col">Dirección</th><th scope="col">Contacto</th><th scope="col">Celular</th><th scope="col">CUIT</th><th scope="col">Acciones</th></tr></thead>
          <tbody>{data.items.map(customer => <tr key={customer.id}>
            <td>{customer.commercialCode || "—"}</td>
            <td><div className="milo-table-cell">
              <strong>{customer.details?.legalName || "—"}</strong>
              {!customer.details?.legalName && !customer.details?.contactName && customer.name && <span className="milo-company-hint">Nombre registrado: {customer.name}</span>}
              {customer.contactState === "legacy" && <span className="milo-company-hint">Ficha anterior protegida</span>}
            </div></td>
            <td>{customer.address || "—"}</td>
            <td>{customer.details?.contactName || "—"}</td>
            <td>{customer.details?.mobilePhone || "—"}</td>
            <td>{customer.details?.documentType === "CUIT" ? customer.details.documentNumber.replace(/^(\d{2})(\d{8})(\d)$/, "$1-$2-$3") || "—" : "—"}</td>
            <td><div className="milo-table-actions">
              <TableEditAction href={`/panel/clientes/${customer.id}`} label={customer.name || "cliente"} recordId={customer.id} readOnly={!customer.editable} />
              {data.schemaReady && <CustomerDeleteAction id={customer.id} version={customer.version} label={customer.name || "cliente"} />}
            </div></td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="milo-catalog-empty">{data.q ? "No hay clientes que coincidan con la búsqueda." : "Todavía no hay clientes registrados."}</p>}
      <CatalogPagination path="/panel/clientes" {...data} />
    </section>
  </CustomerWorkspace>;
}
