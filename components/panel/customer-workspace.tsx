"use client";
import type { ReactNode } from "react";
import { loadCustomerEditor } from "@/app/panel/clientes/editor-actions";
import { RecordWorkspace } from "./record-workspace";
import type { EditorCallbacks } from "./record-editor";
import type { CustomerView } from "@/lib/customers/types";
import { CustomerForm } from "./customer-form";

function Editor({ data, callbacks }: { data: { customer?: CustomerView; schemaReady?: boolean }; callbacks: EditorCallbacks }) {
  return <CustomerForm key={data.customer?.version ?? "new"} customer={data.customer} schemaReady={data.schemaReady} {...callbacks} />;
}
export function CustomerWorkspace({ children }: { children: ReactNode }) {
  return <RecordWorkspace loadEditor={loadCustomerEditor} Editor={Editor} createTitle="Nuevo cliente" editTitle="Editar cliente" description="Datos comerciales y de contacto de tu empresa.">{children}</RecordWorkspace>;
}
