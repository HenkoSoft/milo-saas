import type { PurchaseInput } from "./schema";
export type Result<T> = { status: "ok"; data: T } | { status: "forbidden" | "pending" | "error" | "missing" | "invalid" | "conflict"; message?: string };
export type PurchaseState = { status: "saved"; id: string; message: string } | { status: "invalid" | "forbidden" | "error" | "conflict" | "pending"; message: string };
export type Choice = { id: string; label: string; unit?: string; sku?: string; name?: string; supplier?: SupplierSummary };
export type SupplierSummary = { code: string; name: string; vatCondition: string; cuit: string; address: string };
export type PurchaseView = {
  input: PurchaseInput; code: string; status: string; total: string; supplier: string; branch: string;
  creator: string; receiver: string | null; createdAt: string; receivedAt: string | null;
  supplierDetails?: SupplierSummary; net?: string;
  lines: { id: string; productId: string; sku: string; name: string; unit: string; quantity: string; unitCost: string; subtotal: string; movementId: string | null }[];
};
export type PurchaseEditorData = { id: string; date: string; branches: Choice[]; purchase?: PurchaseView; documentReady?: boolean; vatConditions?: readonly (readonly [string, string])[] };
