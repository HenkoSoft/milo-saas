"use client";
import { deleteCustomerRecord } from "@/app/panel/clientes/actions";
import { RecordDeleteAction } from "./record-delete-action";
export function CustomerDeleteAction(props: { id: string; version: string; label: string }) {
  return <RecordDeleteAction {...props} kind="Cliente" action={deleteCustomerRecord} />;
}
