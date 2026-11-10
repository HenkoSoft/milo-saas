"use server";
import { revalidatePath } from "next/cache";
import { recordReceipt, recordAdjustment } from "@/lib/inventory/service";
import type { ReceiptState } from "@/lib/inventory/types";

export async function receiveStock(_previous: ReceiptState, form: FormData): Promise<ReceiptState> {
  const result = await recordReceipt(form);
  if (result.status === "saved") revalidatePath("/panel", "layout");
  return result;
}
export async function adjustStock(_previous: ReceiptState, form: FormData): Promise<ReceiptState> {
  const result = await recordAdjustment(form);
  if (result.status === "saved") revalidatePath("/panel", "layout");
  return result;
}
