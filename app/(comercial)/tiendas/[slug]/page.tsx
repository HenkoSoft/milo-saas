import { WholesaleTemplate } from "@/components/storefront/wholesale-template";
import { getStorefrontSlugs, requireStorefront } from "@/lib/storefront/registry";

// The editorial allowlist is exhaustive. Unregistered stores must return 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getStorefrontSlugs().map(slug => ({ slug }));
}

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const storefront = requireStorefront((await params).slug);
  return <WholesaleTemplate storefront={storefront} />;
}
