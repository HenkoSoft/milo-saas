import Link from "next/link";
import { notFound } from "next/navigation";

export function BranchHeading({ title, description, create = false }: { title: string; description: string; create?: boolean }) {
  return <section className="milo-panel-welcome"><div><p className="milo-card-kicker">ADMINISTRACIÓN / SUCURSALES</p><h1>{title}</h1><p>{description}</p></div>{create && <Link className="milo-primary-button" href="/panel/sucursales/nueva">Crear sucursal</Link>}</section>;
}
export function BranchProblem({ status }: { status: "forbidden" | "invalid" | "missing" | "error" }) {
  if (status === "missing") notFound();
  return <section className="milo-panel-card"><h1 className="milo-catalog-title">{status === "forbidden" ? "Acceso restringido" : status === "invalid" ? "Búsqueda inválida" : "No pudimos cargar las sucursales"}</h1><p className="milo-company-hint">{status === "forbidden" ? "Las sucursales están disponibles para el Dueño y los Administradores de tu empresa." : "Volvé al listado o intentá nuevamente en unos momentos."}</p><Link className="text-link" href={status === "forbidden" ? "/panel" : "/panel/sucursales"}>Volver →</Link></section>;
}
