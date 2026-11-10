"use server";

import { catalogOptions, getProduct } from "@/lib/catalog/service";
import { getPresentationManagement } from "@/lib/catalog/presentation-service";
import { resourceId } from "@/lib/catalog/schema";
import type { CatalogOptions, PresentationManagement, ProductView, ReadResult } from "@/lib/catalog/types";

export type ProductEditorData = { options: CatalogOptions; product?: ProductView; management?: PresentationManagement };

// Every service independently validates the current identity, OWNER/ADMIN membership
// and tenant on the server. Never accept a tenant, role or serialized product here.
export async function loadProductEditor(id: unknown): Promise<ReadResult<ProductEditorData>> {
  const parsed = resourceId.nullable().safeParse(id);
  if (!parsed.success) return { status: "invalid" };
  const options = await catalogOptions();
  if (options.status !== "ok") return options;
  if (parsed.data === null) return { status: "ok", data: { options: options.data } };
  const product = await getProduct(parsed.data);
  if (product.status !== "ok") return product;
  const management = await getPresentationManagement(parsed.data);
  if (management.status !== "ok") return management;
  return { status: "ok", data: { options: options.data, product: product.data.product, management: management.data } };
}
