/** Public editorial content only. This contract is not a Prisma Tenant or membership. */
export type StorefrontConfig = Readonly<{
  slug: string;
  template: "wholesale";
  identity: Readonly<{
    name: string;
    caption: string;
    footerDescription: string;
    region: string;
    logo: Readonly<{ src: `/${string}`; width: number; height: number }>;
  }>;
  contact: Readonly<{ whatsappUrl: string }>;
  seo: Readonly<{
    title: string;
    description: string;
    socialTitle: string;
    socialDescription: string;
    socialName: string;
    locale: string;
  }>;
  theme: Readonly<{
    background: string;
    foreground: string;
    muted: string;
    silver: string;
    line: string;
    accent: string;
    accentHover: string;
    accentBorder: string;
    surface: string;
    footerBackground: string;
  }>;
  content: Readonly<{
    hero: Readonly<{
      eyebrow: string;
      titleLines: readonly string[];
      titleAccent: string;
      description: string;
      contactLabel: string;
      catalogLabel: string;
      artLabels: readonly [string, string];
    }>;
    highlights: readonly string[];
    catalog: Readonly<{
      eyebrow: string;
      title: string;
      titleAccent: string;
      lead: string;
      paragraphs: readonly string[];
      contactLabel: string;
    }>;
    steps: Readonly<{
      eyebrow: string;
      titleLines: readonly string[];
      description: string;
      items: readonly Readonly<{ number: string; title: string; text: string }>[];
    }>;
    contact: Readonly<{
      eyebrow: string;
      title: string;
      titleAccent: string;
      description: string;
      label: string;
    }>;
  }>;
}>;

export function storefrontPath(slug: string): string {
  return `/tiendas/${encodeURIComponent(slug)}`;
}
