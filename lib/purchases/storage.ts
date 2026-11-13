import "server-only";
import type { Prisma } from "@/generated/prisma/client";
export async function purchasesReady(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<{ ready: boolean }[]>`SELECT
    to_regclass('public.purchases') IS NOT NULL AND to_regclass('public.purchase_lines') IS NOT NULL AND to_regclass('public.purchase_counters') IS NOT NULL
    AND (SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND convalidated AND conname IN ('purchases_state_check','purchase_lines_amount_check','stock_movements_purchase_check','purchases_tenantId_supplierId_fkey','stock_movements_tenantId_branchId_productId_purchaseLineId_fkey'))=5
    AND (SELECT count(*) FROM pg_trigger WHERE tgname IN ('purchases_guard','purchase_lines_guard','products_preserve_purchase_unit','purchases_integrity','purchase_lines_integrity','purchase_movements_integrity') AND tgenabled='O' AND tgrelid IN (to_regclass('public.purchases'),to_regclass('public.purchase_lines'),to_regclass('public.products'),to_regclass('public.stock_movements')))=6
    AND EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public."stock_movements_tenantId_purchaseLineId_key"') AND indisvalid AND indisunique) AS ready`;
  return rows[0]?.ready === true;
}
