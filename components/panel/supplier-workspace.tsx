"use client";
import type { ReactNode } from "react";
import { loadSupplierEditor } from "@/app/panel/proveedores/editor-actions";
import type { SupplierView } from "@/lib/suppliers/types";
import { RecordWorkspace } from "./record-workspace";
import type { EditorCallbacks } from "./record-editor";
import { SupplierForm } from "./supplier-form";
function Editor({ data, callbacks }: { data: { supplier?: SupplierView }; callbacks: EditorCallbacks }) {
  return <SupplierForm key={data.supplier?.version ?? "new"} supplier={data.supplier} {...callbacks} />;
}
export function SupplierWorkspace({ children }: { children: ReactNode }) {
  return <RecordWorkspace loadEditor={loadSupplierEditor} Editor={Editor} createTitle="Nuevo proveedor" editTitle="Editar proveedor" description="Datos comerciales y de contacto de tu empresa.">{children}</RecordWorkspace>;
}
