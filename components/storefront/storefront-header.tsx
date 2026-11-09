import { SiteNav } from "@/components/site-nav";
import type { StorefrontConfig } from "@/lib/storefront/types";
import { storefrontPath } from "@/lib/storefront/types";
import { StorefrontBrand } from "./storefront-brand";

export function StorefrontHeader({ storefront }: { storefront: StorefrontConfig }) {
  const path = storefrontPath(storefront.slug);
  const items = [
    { href: `${path}#catalogo`, label: "Catálogo" },
    { href: `${path}#como-funciona`, label: "Cómo funciona" },
    { href: `${path}#contacto`, label: "Contacto" },
    { href: "/", label: "Conocer MILO" },
  ];
  return (
    <header className="site-header">
      <div className="site-container header-inner">
        <StorefrontBrand storefront={storefront} />
        <SiteNav items={items} id="storefront-navigation" label={`Navegación de ${storefront.identity.name}`} />
      </div>
    </header>
  );
}
