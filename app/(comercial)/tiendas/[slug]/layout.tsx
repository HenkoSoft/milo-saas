import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { requireStorefront } from "@/lib/storefront/registry";
import { storefrontPath } from "@/lib/storefront/types";

type StorefrontParams = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: StorefrontParams): Promise<Metadata> {
  const storefront = requireStorefront((await params).slug);
  const { identity, seo } = storefront;
  return {
    title: { absolute: seo.title },
    description: seo.description,
    applicationName: `MILO · ${identity.name}`,
    icons: { icon: `${storefrontPath(storefront.slug)}/icon.svg` },
    openGraph: {
      title: seo.socialTitle, description: seo.socialDescription,
      siteName: seo.socialName, locale: seo.locale, type: "website",
    },
  };
}

export default async function CommercialLayout({ children, params }: StorefrontParams & { children: ReactNode }) {
  const storefront = requireStorefront((await params).slug);
  return <StorefrontShell storefront={storefront}>{children}</StorefrontShell>;
}
