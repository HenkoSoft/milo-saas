import type { Metadata } from "next";
import type { SearchParams } from "@/components/panel/catalog-ui";
import { PurchaseList } from "../purchase-list";
export const metadata: Metadata = { title: "Ingreso de Mercadería" };
export default function PurchaseEntryPage({ searchParams }: { searchParams: SearchParams }) {
  return <PurchaseList searchParams={searchParams} initialCreate />;
}
