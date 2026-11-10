import Link from "next/link";
import { CapabilityIcon } from "@/components/icons";
import { quickLinks, type PanelPermissions } from "@/lib/panel/navigation";
import type { DashboardTotals } from "@/lib/panel/dashboard";
import type { PanelContext } from "@/lib/panel/access";

function Metric({ label, value, note, kind, pending = false }: { label: string; value: string | null; note: string; kind: "order" | "people" | "box"; pending?: boolean }) {
  return <article className="milo-dash-metric"><div className={`milo-dash-metric-icon${pending ? " milo-dash-muted-icon" : ""}`}><CapabilityIcon kind={kind} /></div><div><h2>{label}</h2>{value !== null ? <p className="milo-dash-number">{value}</p> : <p className="milo-dash-no-value">{pending ? "Próximamente" : "Sin datos disponibles"}</p>}<p className="milo-dash-caption">{note}</p></div></article>;
}
export function Dashboard({ context, totals, permissions, scopeLabel }: { context: PanelContext; totals: DashboardTotals; permissions: PanelPermissions; scopeLabel: string }) {
  const links = quickLinks(permissions);
  const number = new Intl.NumberFormat("es-AR");
  const unavailable = totals.status === "restricted" ? "Disponible para Dueño y Administradores." : "No pudimos consultar este indicador. Volvé a cargar la página.";
  return <div className="milo-dashboard">
    <section className="milo-dash-heading"><div><p className="milo-card-kicker">PANEL COMERCIAL</p><h1>Inicio</h1><p>{context.tenant.name}<span aria-hidden="true"> · </span><span>{scopeLabel}</span></p></div><span className="milo-dash-greeting">Hola, {context.user.name}</span></section>
    <section className="milo-dash-metrics" aria-label="Indicadores de la empresa">
      <Metric label="Ventas del día" value={null} note="El módulo de ventas aún no está disponible." kind="order" pending />
      <Metric label="Total clientes" value={totals.status === "ok" ? number.format(totals.customers) : null} note={totals.status === "ok" ? "Clientes registrados, de todos los estados." : unavailable} kind="people" />
      <Metric label="Total productos" value={totals.status === "ok" ? number.format(totals.products) : null} note={totals.status === "ok" ? "Productos registrados, publicados y no publicados." : unavailable} kind="box" />
      <Metric label="Pedidos de hoy" value={null} note="La gestión de pedidos aún no está disponible." kind="order" pending />
    </section>
    <div className="milo-dash-overview">
      <section className="milo-dash-card"><header className="milo-dash-card-header"><div><h2>Ventas de los últimos siete días</h2><p>Actividad comercial de tu empresa</p></div><span className="milo-dash-status">Próximamente</span></header><div className="milo-dash-chart-empty"><span className="milo-dash-empty-icon" aria-hidden="true"><CapabilityIcon kind="grid" /></span><h3>Sin datos disponibles</h3><p>El gráfico estará disponible cuando se implemente el registro de ventas.</p><small>Los pedidos no se consideran ventas cobradas.</small></div></section>
      <section className="milo-dash-card"><header className="milo-dash-card-header"><div><h2>Últimas ventas</h2><p>Operaciones comerciales recientes</p></div></header><div className="milo-dash-sales-empty"><span className="milo-dash-empty-icon" aria-hidden="true"><CapabilityIcon kind="order" /></span><h3>Sin datos disponibles</h3><p>Las ventas reales aparecerán aquí cuando el módulo esté disponible.</p><span className="milo-dash-status">Próximamente</span></div></section>
    </div>
    <section className="milo-dash-card"><header className="milo-dash-card-header"><div><h2>Accesos rápidos</h2><p>Tus herramientas disponibles en MILO</p></div></header>{links.length ? <div className="milo-dash-shortcuts">{links.map(link => <Link href={link.href} key={link.href} className="milo-dash-shortcut"><span className="milo-dash-shortcut-icon"><CapabilityIcon kind={link.icon} /></span><span>{link.label}</span><span aria-hidden="true">→</span></Link>)}</div> : <p className="milo-dash-access-empty">No hay módulos administrativos disponibles para tus roles actuales. Consultá al administrador de tu empresa.</p>}</section>
    <section className="milo-dash-account" aria-label="Tu cuenta y alcance"><div><span className="milo-dash-account-avatar" aria-hidden="true">M</span><div><strong>{context.user.name}</strong><p>{context.user.email}</p></div></div><div className="milo-dash-account-roles">{context.assignments.length ? context.assignments.map(a => <span key={`${a.code}:${a.branch?.id ?? "company"}`} className="milo-role-badge">{a.label}{a.branch ? ` · ${a.branch.name}` : ""}</span>) : <span>Sin roles asignados</span>}</div></section>
  </div>;
}
