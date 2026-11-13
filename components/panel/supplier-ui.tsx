import Link from "next/link";
import { notFound } from "next/navigation";
export function SupplierProblem({ status }: { status: "forbidden" | "invalid" | "missing" | "error" | "pending" }) {
  if (status === "missing") notFound();
  return <section className="milo-panel-card"><h1>{status === "pending" ? "Proveedores requiere la migración pendiente" : status === "forbidden" ? "Acceso restringido" : "No pudimos cargar los proveedores"}</h1><p className="milo-company-hint">{status === "pending" ? "El módulo está preparado. La estructura de datos debe aplicarse con autorización posterior antes de registrar proveedores reales." : status === "forbidden" ? "Solo el Dueño y los Administradores de tu empresa pueden administrar proveedores." : "Volvé al listado o intentá nuevamente. No se modificaron datos desde esta pantalla."}</p><Link className="text-link" href="/panel">Volver al inicio</Link></section>;
}
