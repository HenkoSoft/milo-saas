"use server";
import { getSupplier, newSupplierEditor } from "@/lib/suppliers/service";
import { supplierId } from "@/lib/suppliers/schema";
import type { SupplierResult, SupplierView } from "@/lib/suppliers/types";
export async function loadSupplierEditor(id: unknown): Promise<SupplierResult<{ supplier?: SupplierView }>> {
  const parsed = supplierId.nullable().safeParse(id);
  if (!parsed.success) return { status: "invalid" };
  if (parsed.data === null) return newSupplierEditor();
  const result = await getSupplier(parsed.data);
  return result.status === "ok" ? { status: "ok", data: { supplier: result.data } } : result;
}
