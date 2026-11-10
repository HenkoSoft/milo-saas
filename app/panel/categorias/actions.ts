"use server";
import { revalidatePath } from "next/cache";
import { saveCategory } from "@/lib/catalog/service";
import type { CatalogState } from "@/lib/catalog/types";

export async function createCategory(_previous: CatalogState, form: FormData): Promise<CatalogState> {
  const result = await saveCategory(form, false);
  if (result.status === "saved") revalidatePath("/panel", "layout");
  return result;
}
export async function updateCategory(_previous: CatalogState, form: FormData): Promise<CatalogState> {
  const result = await saveCategory(form, true);
  if (result.status === "saved") revalidatePath("/panel", "layout");
  return result;
}
