"use client";
import { deleteSupplierRecord } from "@/app/panel/proveedores/actions";
import { RecordDeleteAction } from "./record-delete-action";
export function SupplierDeleteAction(props: { id: string; version: string; label: string }) {
  return <RecordDeleteAction {...props} kind="Proveedor" action={deleteSupplierRecord} />;
}
