"use client";
import type { ReactNode } from "react";
import { loadProductEditor, type ProductEditorData } from "@/app/panel/productos/editor-actions";
import { RecordWorkspace } from "./record-workspace";
import { ProductForm } from "./product-form";
import { PresentationManager } from "./presentation-manager";
import type { EditorCallbacks } from "./record-editor";

function ProductEditor({ data, callbacks }: { data: ProductEditorData; callbacks: EditorCallbacks }) {
  return <ProductForm {...data} {...callbacks} advanced={data.management && <PresentationManager data={data.management} onSaved={callbacks.onSaved} onPendingChange={callbacks.onPendingChange} />} />;
}

export function ProductWorkspace({ children }: { children: ReactNode }) {
  return <RecordWorkspace loadEditor={loadProductEditor} Editor={ProductEditor} createTitle="Nuevo producto" editTitle="Editar producto" description="Ficha comercial y precio de venta de tu empresa.">{children}</RecordWorkspace>;
}
