import type { Metadata } from "next";
import { InventoryOperationPage } from "@/components/panel/inventory-operation-page";
import type { SearchParams } from "@/components/panel/catalog-ui";
export const metadata: Metadata = { title: "Ingresar mercadería" };
export default function ReceiptPage({ searchParams }: { searchParams: SearchParams }) { return <InventoryOperationPage searchParams={searchParams} />; }
