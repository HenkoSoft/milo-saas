"use server";
import { revalidatePath } from "next/cache";
import { saveBranch } from "@/lib/branches/service";
import type { BranchState } from "@/lib/branches/types";

export async function createBranch(_previous: BranchState, form: FormData): Promise<BranchState> {
  const result = await saveBranch(form, false);
  if (result.status === "saved") revalidatePath("/panel", "layout");
  return result;
}
export async function updateBranch(_previous: BranchState, form: FormData): Promise<BranchState> {
  const result = await saveBranch(form, true);
  if (result.status === "saved") revalidatePath("/panel", "layout");
  return result;
}
