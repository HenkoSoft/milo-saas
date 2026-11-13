import { RecordPrintPage } from "@/components/panel/record-print-page";
export const dynamic = "force-dynamic";
export default async function PrintSuppliers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return <RecordPrintPage kind="proveedores" query={(await searchParams).q ?? ""} />;
}
