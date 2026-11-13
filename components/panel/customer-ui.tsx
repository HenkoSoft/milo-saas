import Link from "next/link";
import { notFound } from "next/navigation";

export function CustomerProblem({ status }: { status: "forbidden" | "invalid" | "missing" | "error" }) {
  if (status === "missing") notFound();
  return <section className="milo-panel-card"><h1>{status === "forbidden" ? "Acceso restringido" : status === "invalid" ? "Búsqueda inválida" : "No pudimos cargar los clientes"}</h1><p className="milo-company-hint">{status === "forbidden" ? "Clientes está disponible para el Dueño y los Administradores de tu empresa." : "Volvé al listado o intentá nuevamente."}</p><Link className="text-link" href="/panel">Volver al inicio →</Link></section>;
}
