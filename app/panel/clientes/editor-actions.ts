"use server";
import { getCustomer, newCustomerEditor } from "@/lib/customers/service";
import { customerId } from "@/lib/customers/schema";
import type { CustomerResult, CustomerView } from "@/lib/customers/types";

export async function loadCustomerEditor(id: unknown): Promise<CustomerResult<{ customer?: CustomerView; schemaReady?: boolean }>> {
  const parsed = customerId.nullable().safeParse(id);
  if (!parsed.success) return { status: "invalid" };
  if (parsed.data === null) return newCustomerEditor();
  const result = await getCustomer(parsed.data);
  return result.status === "ok" ? { status: "ok", data: { customer: result.data } } : result;
}
