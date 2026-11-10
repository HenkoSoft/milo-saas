"use server";

import { revalidatePath } from "next/cache";
import { saveCompanySettings } from "@/lib/company/service";
import type { CompanyFormState } from "@/lib/company/types";

export async function updateCompany(_previous: CompanyFormState, form: FormData): Promise<CompanyFormState> {
  // The previous client state is never trusted. Service reauthorizes every request.
  const result = await saveCompanySettings(form);
  if (result.status === "saved") revalidatePath("/panel", "layout");
  return result;
}
