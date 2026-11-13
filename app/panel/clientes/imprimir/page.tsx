import { RecordPrintPage } from "@/components/panel/record-print-page";
export const dynamic = "force-dynamic";
export default async function PrintCustomers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return <RecordPrintPage kind="clientes" query={(await searchParams).q ?? ""} />;
}
