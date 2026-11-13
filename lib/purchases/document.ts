import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { PurchaseInput } from "./schema";

// Always omit extension columns from V1 reads so the deployed seven-migration
// database remains usable until the separately authorized deployment.
export const legacyPurchaseOmit = { documentType: true, pointOfSale: true, documentNumber: true, purchaseCategory: true, taxAmount: true } as const;
export async function purchaseDocumentReady(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<{ ready: boolean; present: bigint }[]>`SELECT
    (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='purchases' AND column_name IN ('documentType','pointOfSale','documentNumber','purchaseCategory','taxAmount')) AS present,
    (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='purchases' AND column_name IN ('documentType','pointOfSale','documentNumber','purchaseCategory','taxAmount'))=5
    AND EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.purchases') AND conname='purchases_document_check' AND convalidated)
    AND position('taxAmount' in pg_get_functiondef(to_regprocedure('public.check_purchase_integrity()')))>0 AS ready`;
  if (rows[0] && rows[0].present > 0 && !rows[0].ready) throw new Error("Purchase document schema is incomplete");
  return rows[0]?.ready === true;
}
export async function readPurchaseDocument(tx: Prisma.TransactionClient, tenantId: string, id: string): Promise<PurchaseInput["document"]> {
  return (await readPurchaseDocuments(tx, tenantId, [id])).get(id);
}
export async function readPurchaseDocuments(tx: Prisma.TransactionClient, tenantId: string, ids: string[]) {
  const rows = ids.length ? await tx.purchase.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, documentType: true, pointOfSale: true, documentNumber: true, purchaseCategory: true, taxAmount: true } }) : [];
  return new Map<string, PurchaseInput["document"]>(rows.map(row => [row.id,
    [row.documentType, row.pointOfSale, row.documentNumber, row.purchaseCategory, row.taxAmount].every(v => v === null) ? undefined : {
      type: (row.documentType ?? "") as "" | "FA" | "FB" | "FC" | "OTRO", pointOfSale: row.pointOfSale ?? "", number: row.documentNumber ?? "", category: row.purchaseCategory ?? "", taxAmount: row.taxAmount?.toFixed(2) ?? null,
    },
  ]));
}
