"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Brand } from "@/components/brand";
import { CapabilityIcon } from "@/components/icons";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { isActiveRoute, panelNavigation, purchaseNavigationPath, type PanelNavItem } from "@/lib/panel/navigation";
import { PurchaseNavigation } from "./purchase-navigation";
import type { RecordWorkspaceController, RecordWorkspaceMode } from "./record-workspace";

type Group = Extract<PanelNavItem, { kind: "group" }>;
function NavGroup({ item, path, collapsed, expandSidebar, navigate }: { item: Group; path: string; collapsed: boolean; expandSidebar: () => void; navigate: (event: MouseEvent<HTMLAnchorElement>, href: string) => void }) {
  const active = item.links.some(link => isActiveRoute(path, link.href));
  const [open, setOpen] = useState(active);
  const id = item.label === "Artículos" ? "panel-articles" : item.label === "Compras" ? "panel-purchases" : "panel-administration";
  return <li className="milo-erp-group"><button type="button" className={`milo-erp-nav-item${active ? " milo-erp-section-active" : ""}`} aria-expanded={open && !collapsed} aria-controls={id} title={item.label} onClick={() => { if (collapsed) { expandSidebar(); setOpen(true); } else setOpen(!open); }}><CapabilityIcon kind={item.icon} /><span className="milo-erp-nav-label">{item.label}</span><span className="milo-erp-chevron" aria-hidden="true">{open && !collapsed ? "−" : "+"}</span></button>
    <ul id={id} className="milo-erp-submenu" hidden={!open || collapsed}>{item.links.map(link => <li key={link.href}><Link className={isActiveRoute(path, link.href) ? "milo-erp-sub-active" : ""} href={link.href} aria-current={isActiveRoute(path, link.href) ? "page" : undefined} onClick={event => navigate(event, link.href)}>{link.label}</Link></li>)}</ul>
  </li>;
}

export function PanelShell({ children, companyName, userName, scopeLabel, canManageCompany, canManageCatalog, canManageBranches, canReadInventory, canManageCustomers = false, canManageSuppliers = false, canManagePurchases = false }: {
  children: ReactNode; companyName: string; userName: string; scopeLabel: string; canManageCompany: boolean; canManageCatalog: boolean; canManageBranches: boolean; canReadInventory: boolean; canManageCustomers?: boolean; canManageSuppliers?: boolean; canManagePurchases?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const mobileToggle = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const purchaseController = useRef<RecordWorkspaceController | null>(null);
  const [purchaseMode, setPurchaseMode] = useState<RecordWorkspaceMode | null>(null);
  const register = useCallback((controller: RecordWorkspaceController | null) => {
    purchaseController.current = controller;
    if (!controller) setPurchaseMode(null);
  }, []);
  const purchaseNavigation = useMemo(() => ({ register, onModeChange: setPurchaseMode }), [register]);
  const activePath = purchaseNavigationPath(pathname, purchaseMode);
  function navigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    setMobileOpen(false);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !purchaseController.current) return;
    if (href === "/panel/compras/ingresar") { event.preventDefault(); purchaseController.current.openCreate(); }
    else if (href === "/panel/compras") { event.preventDefault(); purchaseController.current.close(); }
  }
  const items = panelNavigation({ company: canManageCompany, catalog: canManageCatalog, branches: canManageBranches, inventory: canReadInventory, customers: canManageCustomers, suppliers: canManageSuppliers, purchases: canManagePurchases });
  const current = items.flatMap(item => item.kind === "group" ? item.links : item.kind === "link" ? [item] : []).find(link => isActiveRoute(activePath, link.href))?.label ?? "Panel";
  return <PurchaseNavigation.Provider value={purchaseNavigation}><div className="milo-panel milo-erp" data-collapsed={collapsed}>
    <a className="skip-link" href="#panel-content">Saltar al contenido</a>
    <aside className="milo-sidebar" aria-label="Menú principal" onKeyDown={event => { if (event.key === "Escape" && mobileOpen) { setMobileOpen(false); mobileToggle.current?.focus(); } }}>
      <div className="milo-sidebar-heading"><div className="milo-erp-brand"><Brand /><span>Powered by HenkoSoft</span></div><button ref={mobileToggle} className="milo-mobile-menu milo-erp-menu-button" type="button" aria-expanded={mobileOpen} aria-controls="panel-navigation" onClick={() => { setCollapsed(false); setMobileOpen(!mobileOpen); }}>{mobileOpen ? "Cerrar menú" : "Menú"}<span aria-hidden="true">{mobileOpen ? "×" : "☰"}</span></button></div>
      <div className="milo-sidebar-body" data-open={mobileOpen}>
        <div className="milo-workspace"><span className="milo-workspace-mark" aria-hidden="true">M</span><div><small>EMPRESA</small><p>{companyName}</p><span className="milo-erp-scope">{scopeLabel}</span></div></div>
        <nav id="panel-navigation" aria-label="Navegación del panel"><p className="milo-nav-label">MENÚ PRINCIPAL</p><ul className="milo-erp-navigation">{items.map(item => item.kind === "group" ? <NavGroup key={`${item.label}:${activePath}`} item={item} path={activePath} collapsed={collapsed} expandSidebar={() => setCollapsed(false)} navigate={navigate} /> : <li key={item.label}>{item.kind === "link" ? <Link className={`milo-erp-nav-item${isActiveRoute(activePath, item.href) ? " milo-erp-section-active" : ""}`} href={item.href} aria-current={isActiveRoute(activePath, item.href) ? "page" : undefined} title={item.label} onClick={() => setMobileOpen(false)}><CapabilityIcon kind={item.icon} /><span className="milo-erp-nav-label">{item.label}</span></Link> : <button className="milo-erp-nav-item milo-erp-pending" disabled type="button" title={`${item.label}: próximamente`}><CapabilityIcon kind={item.icon} /><span className="milo-erp-nav-label">{item.label}</span><small className="milo-erp-soon">Próximamente</small></button>}</li>)}</ul></nav>
        <div className="milo-sidebar-footer"><button className="milo-erp-collapse milo-erp-menu-button" type="button" aria-label={collapsed ? "Expandir menú lateral" : "Contraer menú lateral"} aria-expanded={!collapsed} aria-controls="panel-navigation" onClick={() => setCollapsed(!collapsed)}><span aria-hidden="true">{collapsed ? "»" : "«"}</span><span className="milo-erp-nav-label">Contraer menú</span></button><small className="milo-erp-nav-label">MILO · Gestión empresarial</small></div>
      </div>
    </aside>
    <div className="milo-panel-body"><header className="milo-topbar"><div className="milo-erp-top-context"><span className="milo-topbar-label">ESPACIO DE TRABAJO / {current}</span><p>{companyName}</p><small>{scopeLabel}</small></div><div className="milo-topbar-account"><div className="milo-account-name"><small>SESIÓN ACTIVA</small><span>{userName}</span></div><SignOutButton /></div></header><main id="panel-content" tabIndex={-1} className="milo-panel-content">{children}</main><footer className="milo-panel-footer"><span>MILO · Gestión empresarial</span><span>Powered by HenkoSoft</span></footer></div>
  </div></PurchaseNavigation.Provider>;
}
