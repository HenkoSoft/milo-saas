import type { PanelContext } from "./access";

export function purchaseNavigationPath(path: string, mode: "create" | "edit" | "closed" | null) {
  if (!["/panel/compras", "/panel/compras/ingresar", "/panel/compras/nueva"].includes(path)) return path;
  if (mode === "create") return "/panel/compras/ingresar";
  if (mode === "closed" || mode === "edit") return "/panel/compras";
  return path === "/panel/compras/nueva" ? "/panel/compras/ingresar" : path;
}

export type PanelPermissions = { company: boolean; catalog: boolean; branches: boolean; inventory: boolean; customers?: boolean; suppliers?: boolean; purchases?: boolean };
type Icon = "grid" | "people" | "branch" | "box" | "order" | "shield";
export type PanelLink = { label: string; href: string; icon: Icon };
export type PanelNavItem = { label: string; icon: Icon } & ({ kind: "link"; href: string } | { kind: "group"; links: PanelLink[] } | { kind: "pending" });
export const isActiveRoute = (path: string, href: string) => path === href || (href !== "/panel" && href !== "/panel/compras" && href !== "/panel/compras/notas-credito" && path.startsWith(href + "/")) || (href === "/panel/compras" && /^\/panel\/compras\/[0-9a-f-]{36}$/i.test(path));

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
    ...(permissions.customers ? [{ kind: "link" as const, label: "Clientes", icon: "people" as const, href: "/panel/clientes" }] : []),
    ...(permissions.purchases ? [{ kind: "group" as const, label: "Compras", icon: "order" as const, links: [
      { label: "Ingreso de Mercadería", href: "/panel/compras/ingresar", icon: "box" as const },
      { label: "N/C Proveedor (Carga)", href: "/panel/compras/notas-credito/nueva", icon: "order" as const },
      { label: "Consulta de Compras", href: "/panel/compras", icon: "order" as const },
      { label: "Consulta de N/C", href: "/panel/compras/notas-credito", icon: "order" as const },
      { label: "Pagos a Proveedores", href: "/panel/compras/pagos", icon: "people" as const },
    ] }] : []),
    { kind: "pending", label: "Ventas", icon: "order" },
    ...(permissions.suppliers ? [{ kind: "link" as const, label: "Proveedores", icon: "people" as const, href: "/panel/proveedores" }] : []),
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
