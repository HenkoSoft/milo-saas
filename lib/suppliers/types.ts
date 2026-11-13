import type { SupplierFields } from "./fields";
export type SupplierView = { id: string; version: string; commercialCode: string; name: string; details: SupplierFields };
export type SupplierState = { status: "idle" | "saved" | "invalid" | "forbidden" | "conflict" | "error"; message?: string; id?: string; version?: string };
export type SupplierResult<T> = { status: "ok"; data: T } | { status: "forbidden" | "invalid" | "missing" | "error" | "pending" };
export type SupplierList = { items: SupplierView[]; total: number; pages: number; page: number; q: string };
