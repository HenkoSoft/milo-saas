"use server";
import { revalidatePath } from "next/cache";
import { saveSupplier, deleteSupplier } from "@/lib/suppliers/service";
import type { SupplierState } from "@/lib/suppliers/types";
function refresh(result: SupplierState) { if (result.status === "saved") revalidatePath("/panel/proveedores"); return result; }
export async function createSupplier(_previous: SupplierState, form: FormData): Promise<SupplierState> { return refresh(await saveSupplier(form, false)); }
export async function updateSupplier(_previous: SupplierState, form: FormData): Promise<SupplierState> { return refresh(await saveSupplier(form, true)); }
export async function deleteSupplierRecord(form: FormData): Promise<SupplierState> { return refresh(await deleteSupplier(form)); }
