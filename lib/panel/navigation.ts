import type { PanelContext } from "./access";

export type PanelPermissions = { company: boolean; catalog: boolean; branches: boolean; inventory: boolean };
type Icon = "grid" | "people" | "branch" | "box" | "order" | "shield";
export type PanelLink = { label: string; href: string; icon: Icon };
export type PanelNavItem = { label: string; icon: Icon } & ({ kind: "link"; href: string } | { kind: "group"; links: PanelLink[] } | { kind: "pending" });
export const isActiveRoute = (path: string, href: string) => path === href || (href !== "/panel" && path.startsWith(href + "/"));

export function panelNavigation(permissions: PanelPermissions): PanelNavItem[] {
  const administration: PanelLink[] = [
    ...(permissions.company ? [{ label: "Empresa", href: "/panel/empresa", icon: "shield" as const }] : []),
    ...(permissions.branches ? [{ label: "Sucursales", href: "/panel/sucursales", icon: "branch" as const }] : []),
  ];
  return [
    { kind: "link", label: "Inicio", icon: "grid", href: "/panel" },
    ...(permissions.catalog ? [{ kind: "group" as const, label: "Artículos", icon: "box" as const, links: [
      { label: "Productos", href: "/panel/productos", icon: "box" as const },
      { label: "Categorías", href: "/panel/categorias", icon: "grid" as const },
      { label: "Marcas", href: "/panel/marcas", icon: "grid" as const },
    ] }] : []),
    { kind: "pending", label: "Clientes", icon: "people" },
    { kind: "pending", label: "Compras", icon: "order" },
    { kind: "pending", label: "Ventas", icon: "order" },
    { kind: "pending", label: "Proveedores", icon: "people" },
    ...(permissions.inventory ? [{ kind: "link" as const, label: "Inventario", icon: "box" as const, href: "/panel/inventario" }] : []),
    { kind: "pending", label: "Caja", icon: "shield" },
    { kind: "pending", label: "Reportes", icon: "grid" },
    ...(administration.length ? [{ kind: "group" as const, label: "Administración", icon: "branch" as const, links: administration }] : []),
    { kind: "pending", label: "Herramientas", icon: "shield" },
    { kind: "pending", label: "Ayuda", icon: "people" },
  ];
}
export function quickLinks(permissions: PanelPermissions): PanelLink[] {
  return panelNavigation(permissions).flatMap(item => item.kind === "group" ? item.links : item.kind === "link" && item.href !== "/panel" ? [item] : []);
}
// An assigned branch is not an active branch selection. No selection exists yet.
export function workspaceScope(context: PanelContext): string {
  if (context.assignments.some(a => a.scope === "COMPANY" && a.branch === null && ["OWNER", "ADMIN"].includes(a.code))) return "Alcance empresarial";
  const branches = [...new Map(context.assignments.filter(a => a.scope === "BRANCH" && a.branch).map(a => [a.branch!.id, a.branch!])).values()];
  if (branches.length === 1) return `Sucursal asignada: ${branches[0].name}`;
  return branches.length ? `${branches.length} sucursales asignadas` : "Sin sucursal seleccionada";
}
