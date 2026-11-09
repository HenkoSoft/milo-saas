import Image from "next/image";
import Link from "next/link";
import type { StorefrontConfig } from "@/lib/storefront/types";
import { storefrontPath } from "@/lib/storefront/types";

export function StorefrontBrand({ storefront }: { storefront: StorefrontConfig }) {
  const { identity } = storefront;
  return (
    <Link className="brand brand-store" href={storefrontPath(storefront.slug)} aria-label={`${identity.name}, inicio de la tienda`}>
      <Image {...identity.logo} alt="" />
      <span className="brand-wordmark">{identity.name}</span>
      <span className="brand-tag">{identity.caption}</span>
    </Link>
  );
}
