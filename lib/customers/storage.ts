import "server-only";
import { prisma } from "@/lib/prisma";

// No cached readiness: applying the pending migration later does not require
// trusting a browser flag or restarting the application.
export async function customerStorage(): Promise<"basic" | "extended" | "unavailable"> {
  try {
    const rows = await prisma.$queryRaw<{ columns: number; counter: boolean; constraints: number; unique_code: boolean; immutable_code: boolean }[]>`
      SELECT (SELECT count(*)::int FROM information_schema.columns WHERE table_schema='public' AND table_name='customers'
        AND column_name IN ('commercialNumber','commercialDataVersion','legalName','contactName','documentType','documentNumber','vatCondition','phone','mobilePhone','whatsapp','email','instagram','address','postalCode','city','province','country','internalNotes')) AS columns,
        to_regclass('public.customer_counters') IS NOT NULL AS counter,
        (SELECT count(*)::int FROM pg_constraint WHERE connamespace='public'::regnamespace AND convalidated AND conname IN
          ('customers_commercial_number_check','customers_commercial_version_check','customers_document_check','customers_vat_check','customer_counters_number_check','customer_counters_tenantId_fkey')) AS constraints,
        EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public."customers_tenantId_commercialNumber_key"') AND indisvalid AND indisunique) AS unique_code,
        EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.customers'::regclass AND tgname='customers_immutable_commercial_number' AND tgenabled='O') AS immutable_code`;
    const row = rows[0];
    if (row?.columns === 0 && !row.counter) return "basic";
    return row?.columns === 18 && row.counter && row.constraints === 6 && row.unique_code && row.immutable_code ? "extended" : "unavailable";
  } catch { return "unavailable"; }
}
