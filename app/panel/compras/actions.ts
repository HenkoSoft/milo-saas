"use server";
import { revalidatePath } from "next/cache";
import { loadPurchase, lookupPurchases, quotePurchase, receivePurchase, savePurchase } from "@/lib/purchases/service";
import { z } from "zod";
export async function loadPurchaseEditor(id: unknown) {
  const parsed = z.uuid().nullable().safeParse(id);
  if (!parsed.success) return { status: "invalid" as const };
  const result = await loadPurchase(parsed.data);
  return result.status === "ok" ? result : { status: result.status === "conflict" ? "error" as const : result.status };
}
export async function searchPurchaseChoices(input: unknown) { return lookupPurchases(input); }
export async function calculatePurchaseQuote(input: unknown) { return quotePurchase(input); }
async function refresh() {
  revalidatePath("/panel/compras"); revalidatePath("/panel/inventario"); revalidatePath("/panel/proveedores");
}
export async function savePurchaseDraft(input: unknown) {
  const result = await savePurchase(input); if (result.status === "saved") await refresh(); return result;
}
export async function confirmPurchaseReceipt(input: unknown) {
  const result = await receivePurchase(input); if (result.status === "saved") await refresh(); return result;
}
