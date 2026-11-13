"use server";
import { revalidatePath } from "next/cache";
import { saveCustomer, deleteCustomer } from "@/lib/customers/service";
import type { CustomerState } from "@/lib/customers/types";

export async function createCustomer(_previous: CustomerState, form: FormData): Promise<CustomerState> {
  const result = await saveCustomer(form, false);
  if (result.status === "saved") { revalidatePath("/panel/clientes"); revalidatePath("/panel"); }
  return result;
}
export async function updateCustomer(_previous: CustomerState, form: FormData): Promise<CustomerState> {
  const result = await saveCustomer(form, true);
  if (result.status === "saved") { revalidatePath("/panel/clientes"); revalidatePath("/panel"); }
  return result;
}
export async function deleteCustomerRecord(form: FormData): Promise<CustomerState> {
  const result = await deleteCustomer(form);
  if (result.status === "saved") { revalidatePath("/panel/clientes"); revalidatePath("/panel"); }
  return result;
}
