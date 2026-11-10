"use server";
import { revalidatePath } from "next/cache";
import { savePresentation, savePresentationPrice } from "@/lib/catalog/presentation-service";
import type { CatalogState } from "@/lib/catalog/types";

export async function createPresentation(_previous: CatalogState, form: FormData): Promise<CatalogState> {
  const result = await savePresentation(form, false);
  if (result.status === "saved") revalidatePath("/panel", "layout");
  return result;
}
export async function updatePresentation(_previous: CatalogState, form: FormData): Promise<CatalogState> {
  const result = await savePresentation(form, true);
  if (result.status === "saved") revalidatePath("/panel", "layout");
  return result;
}
export async function setPresentationPrice(_previous: CatalogState, form: FormData): Promise<CatalogState> {
  const result = await savePresentationPrice(form);
  if (result.status === "saved") revalidatePath("/panel", "layout");
  return result;
}
