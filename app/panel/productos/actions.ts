"use server";
import { revalidatePath } from "next/cache";
import { saveQuickProduct } from "@/lib/catalog/presentation-service";
import type { CatalogState } from "@/lib/catalog/types";

export async function createProduct(_previous: CatalogState, form: FormData): Promise<CatalogState> {
  const result = await saveQuickProduct(form, false);
  if (result.status === "saved") revalidatePath("/panel", "layout");
  return result;
}
export async function updateProduct(_previous: CatalogState, form: FormData): Promise<CatalogState> {
  const result = await saveQuickProduct(form, true);
  if (result.status === "saved") revalidatePath("/panel", "layout");
  return result;
}
