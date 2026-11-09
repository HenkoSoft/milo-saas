import Link from "next/link";
import { Brand } from "./brand";
import { ArrowIcon } from "./icons";
import { institutionalNavigation, siteConfig } from "@/lib/site";

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="site-container footer-grid">
      <div><Brand /><p className="footer-description">Una nueva perspectiva para la gestión de tu empresa.</p><span className="caption">Una plataforma de HenkoSoft</span></div>
      <nav aria-label="Enlaces del pie de página"><span className="footer-label">Explorá MILO</span>{institutionalNavigation.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
      <div className="footer-contact"><span className="footer-label">Primer espacio comercial</span><Link className="footer-feature-link" href={siteConfig.storePath}>Milo Store <ArrowIcon diagonal /></Link><a href={siteConfig.whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp de Milo Store ↗</a><Link href="/acceso">Acceso al sistema</Link></div>
    </div>
    <div className="site-container footer-bottom"><span>© {new Date().getFullYear()} MILO</span><span>MILO · Plataforma desarrollada por HenkoSoft</span><span>Argentina</span></div>
  </footer>;
}
