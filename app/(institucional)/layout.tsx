import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function InstitutionalLayout({ children }: { children: ReactNode }) {
  return <><a className="skip-link" href="#contenido">Saltar al contenido</a><SiteHeader /><main id="contenido" tabIndex={-1}>{children}</main><SiteFooter /></>;
}
