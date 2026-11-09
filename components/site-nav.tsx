"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowIcon } from "./icons";

export function SiteNav({ items, id = "milo-navigation", label = "Navegación de MILO" }: { items: { href: string; label: string }[]; id?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const menuId = id;
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  return <>
    <button ref={toggle} type="button" className="menu-toggle" aria-expanded={open} aria-controls={menuId} aria-label={open ? "Cerrar navegación" : "Abrir navegación"} onClick={() => setOpen(!open)}><span>{open ? "Cerrar" : "Menú"}</span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={open ? "m6 6 12 12M6 18 18 6" : "M4 8h16M4 16h16"} stroke="currentColor" strokeWidth="1.5" /></svg></button>
    <nav id={menuId} aria-label={label} className={`site-nav${open ? " is-open" : ""}`}>
      <div className="nav-links">{items.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} onClick={() => setOpen(false)}>{item.label}</Link>)}</div>
      <Link href="/acceso" className="button button-small button-silver" onClick={() => setOpen(false)}>Acceso al sistema <ArrowIcon diagonal /></Link>
    </nav>
  </>;
}
