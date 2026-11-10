"use server";
import { revalidatePath } from "next/cache";
import { saveBrand } from "@/lib/catalog/service";
import type { CatalogState } from "@/lib/catalog/types";

export async function createBrand(_previous: CatalogState, form: FormData): Promise<CatalogState> {
  const result = await saveBrand(form, false);
  if (result.status === "saved") revalidatePath("/panel", "layout");
  return result;
}
export async function updateBrand(_previous: CatalogState, form: FormData): Promise<CatalogState> {
  const result = await saveBrand(form, true);
  if (result.status === "saved") revalidatePath("/panel", "layout");
  return result;
}
