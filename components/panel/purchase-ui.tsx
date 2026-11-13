import Link from "next/link";
export function PurchaseProblem({ status }: { status: string }) {
  return <section className="milo-panel-card"><h1>Compras</h1><p role="status">{status === "pending" ? "Compras requiere una migración pendiente de autorización. No se modificó el stock." : status === "forbidden" ? "Solo Dueño y Administrador pueden acceder a compras." : status === "missing" ? "Compra no disponible en tu empresa." : "No se pudo cargar Compras. Revisá la conexión y los filtros."}</p><Link href="/panel" className="milo-secondary-button">Volver al panel</Link></section>;
}
