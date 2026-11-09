import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { institutionalNavigation, siteConfig } from "@/lib/site";
import type { StorefrontConfig } from "@/lib/storefront/types";
import { storefrontPath } from "@/lib/storefront/types";
import { StorefrontBrand } from "./storefront-brand";

export function StorefrontFooter({ storefront }: { storefront: StorefrontConfig }) {
  const { identity, contact } = storefront;
  return (
    <footer className="site-footer">
      <div className="site-container footer-grid">
        <div>
          <StorefrontBrand storefront={storefront} />
          <p className="footer-description">{identity.footerDescription}</p>
          <span className="caption">Un espacio comercial en MILO</span>
        </div>
        <nav aria-label="Enlaces del pie de página">
          <span className="footer-label">Plataforma</span>
          {institutionalNavigation.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
        <div className="footer-contact">
          <span className="footer-label">Contacto comercial</span>
          <Link className="footer-feature-link" href={storefrontPath(storefront.slug)}>{identity.name} <ArrowIcon diagonal /></Link>
          <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp de {identity.name} ↗</a>
          <Link href={siteConfig.accessPath}>Acceso al sistema</Link>
        </div>
      </div>
      <div className="site-container footer-bottom">
        <span>© {new Date().getFullYear()} {identity.name}</span>
        <span>MILO · Plataforma desarrollada por HenkoSoft</span>
        <span>{identity.region}</span>
      </div>
    </footer>
  );
}
