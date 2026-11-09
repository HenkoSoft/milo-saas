import type { CSSProperties, ReactNode } from "react";
import type { StorefrontConfig } from "@/lib/storefront/types";
import { StorefrontHeader } from "./storefront-header";
import { StorefrontFooter } from "./storefront-footer";
import "./storefront.css";

type StorefrontStyles = CSSProperties & { [key: `--store-${string}`]: string };

export function StorefrontShell({ storefront, children }: { storefront: StorefrontConfig; children: ReactNode }) {
  const { theme, identity } = storefront;
  const style: StorefrontStyles = {
    "--store-background": theme.background,
    "--store-foreground": theme.foreground,
    "--store-muted": theme.muted,
    "--store-silver": theme.silver,
    "--store-line": theme.line,
    "--store-accent": theme.accent,
    "--store-accent-hover": theme.accentHover,
    "--store-accent-border": theme.accentBorder,
    "--store-surface": theme.surface,
    "--store-footer-background": theme.footerBackground,
  };
  return (
    <div className="storefront" data-storefront={storefront.slug} style={style}>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <div className="store-platform-bar"><div className="site-container">{identity.name}<span>Un espacio comercial en MILO</span></div></div>
      <StorefrontHeader storefront={storefront} />
      <main id="contenido" tabIndex={-1}>{children}</main>
      <StorefrontFooter storefront={storefront} />
    </div>
  );
}
