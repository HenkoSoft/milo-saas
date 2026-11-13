import "server-only";
import { prisma } from "@/lib/prisma";
// No cache: a separately authorized deployment becomes available on refresh.
export async function supplierStorage(): Promise<"ready" | "pending" | "unavailable"> {
  try {
    const rows = await prisma.$queryRaw<{ suppliers: boolean; counter: boolean; columns: number; constraints: number; indexes: number; immutable: boolean }[]>`
      SELECT to_regclass('public.suppliers') IS NOT NULL AS suppliers,
        to_regclass('public.supplier_counters') IS NOT NULL AS counter,
        (SELECT count(*)::int FROM information_schema.columns WHERE table_schema='public' AND table_name='suppliers' AND column_name IN
          ('id','tenantId','commercialNumber','legalName','commercialName','cuit','vatCondition','contactName','phone','whatsapp','email','address','postalCode','city','province','country','internalNotes','createdAt','updatedAt')) AS columns,
        (SELECT count(*)::int FROM pg_constraint WHERE connamespace='public'::regnamespace AND convalidated AND conname IN
          ('suppliers_number_check','suppliers_name_check','suppliers_vat_check','suppliers_cuit_check','supplier_counters_number_check','suppliers_tenantId_fkey','supplier_counters_tenantId_fkey')) AS constraints,
        (SELECT count(*)::int FROM pg_index WHERE indexrelid IN (to_regclass('public."suppliers_tenantId_id_key"'),to_regclass('public."suppliers_tenantId_commercialNumber_key"')) AND indisvalid AND indisunique) AS indexes,
        EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('public.suppliers') AND tgname='suppliers_immutable_commercial_number' AND tgenabled='O') AS immutable`;
    const row = rows[0];
    if (row && !row.suppliers && !row.counter) return "pending";
    return row?.suppliers && row.counter && row.columns === 19 && row.constraints === 7 && row.indexes === 2 && row.immutable ? "ready" : "unavailable";
  } catch { return "unavailable"; }
}
