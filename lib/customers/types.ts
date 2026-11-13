import type { CommercialFields } from "./commercial-fields";
export type CustomerView = {
  id: string; version: string; name: string; email: string; phone: string; address: string;
  editable: boolean; contactState: "current" | "empty" | "legacy"; statusLabel: string;
  schemaReady?: boolean; commercialCode?: string; details?: CommercialFields;
};
export type CustomerState = { status: "idle" | "saved" | "invalid" | "forbidden" | "conflict" | "error"; message?: string; id?: string; version?: string };
export type CustomerResult<T> = { status: "ok"; data: T } | { status: "forbidden" | "invalid" | "missing" | "error" };
export type CustomerList = { items: CustomerView[]; total: number; pages: number; page: number; q: string; schemaReady?: boolean };
