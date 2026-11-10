export type InventoryResult<T> = { status: "ok"; data: T } | { status: "forbidden" | "missing" | "invalid" | "error" };
export type ReceiptState = { status: "idle" | "saved" | "invalid" | "forbidden" | "conflict" | "blocked" | "error"; message?: string; movementId?: string; repeated?: boolean };
export type InventoryItem = { id: string; sku: string; name: string; unit: string; allowsFractionalQuantity: boolean; quantity: string | null };
export type InventoryList = {
  branches: { id: string; name: string }[]; branch: { id: string; name: string } | null;
  operationsReady: boolean;
  items: InventoryItem[]; total: number; pages: number; page: number; q: string;
};
export type InventoryHistory = {
  product: { id: string; name: string; sku: string; unit: string; allowsFractionalQuantity: boolean };
  branch: { id: string; name: string }; quantity: string | null;
  movements: { id: string; type: string; quantity: string; date: string; actorId: string; actorName: string | null; sourceOrderId: string | null; reason: string | null; sourceReference: string | null }[];
  total: number; pages: number; page: number; timeZone: string | null;
};
