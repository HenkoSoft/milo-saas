"use client";
import { useContext, useEffect, useRef, type ReactNode } from "react";
import { loadPurchaseEditor } from "@/app/panel/compras/actions";
import type { PurchaseEditorData } from "@/lib/purchases/types";
import { RecordWorkspace, type RecordWorkspaceController } from "./record-workspace";
import { PurchaseNavigation } from "./purchase-navigation";
import { PurchaseForm } from "./purchase-form";
import type { EditorCallbacks } from "./record-editor";
function Editor({ data, callbacks }: { data: PurchaseEditorData; callbacks: EditorCallbacks }) {
  return <PurchaseForm key={`${data.id}:${data.purchase?.input.revision ?? 0}`} data={data} {...callbacks} />;
}
export function PurchaseWorkspace({ children, initialCreate = false }: { children: ReactNode; initialCreate?: boolean }) {
  const navigation = useContext(PurchaseNavigation), controller = useRef<RecordWorkspaceController>(null);
  useEffect(() => {
    navigation?.register(controller.current);
    return () => navigation?.register(null);
  }, [navigation]);
  return <RecordWorkspace loadEditor={loadPurchaseEditor} Editor={Editor} initialCreate={initialCreate} controllerRef={controller} onModeChange={navigation?.onModeChange} returnPath="/panel/compras" dialogClassName="milo-purchase-dialog" createTitle="Ingreso de Mercadería" editTitle="Detalle de compra" description="Borradores y recepción de mercadería · ARS · unidad base.">{children}</RecordWorkspace>;
}
