import type { Metadata } from "next";
import type { SearchParams } from "@/components/panel/catalog-ui";
import { PurchaseList } from "./purchase-list";
export const metadata: Metadata = { title: "Consulta de Compras" };
export default function PurchasesPage({ searchParams }: { searchParams: SearchParams }) {
  return <PurchaseList searchParams={searchParams} />;
}
