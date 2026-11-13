"use server";

import { catalogOptions, getBrand, getCategory } from "@/lib/catalog/service";
import { resourceId } from "@/lib/catalog/schema";
import type { CategoryView, ReadResult } from "@/lib/catalog/types";

export type TaxonomyEditorData = { record?: CategoryView };

async function loadEditor(kind: "brand" | "category", id: unknown): Promise<ReadResult<TaxonomyEditorData>> {
  const parsed = resourceId.nullable().safeParse(id);
  if (!parsed.success) return { status: "invalid" };
  if (parsed.data !== null) {
    const result = await (kind === "brand" ? getBrand(parsed.data) : getCategory(parsed.data));
    return result.status === "ok" ? { status: "ok", data: { record: result.data } } : result;
  }
  // Reuse the existing protected read: membership is checked inside its
  // transaction too. No tenant or permissions are accepted from the client.
  const access = await catalogOptions();
  return access.status === "ok" ? { status: "ok", data: {} } : access;
}

export async function loadBrandEditor(id: unknown) { return loadEditor("brand", id); }
export async function loadCategoryEditor(id: unknown) { return loadEditor("category", id); }
