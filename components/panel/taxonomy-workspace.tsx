"use client";
import type { ReactNode } from "react";
import { loadBrandEditor, loadCategoryEditor, type TaxonomyEditorData } from "@/app/panel/catalog-editor-actions";
import { RecordWorkspace } from "./record-workspace";
import { CategoryForm } from "./catalog-forms";
import type { EditorCallbacks } from "./record-editor";

type Props = { data: TaxonomyEditorData; callbacks: EditorCallbacks };
function BrandEditor({ data, callbacks }: Props) { return <CategoryForm key={data.record?.version ?? "new"} category={data.record} kind="brand" {...callbacks} />; }
function CategoryEditor({ data, callbacks }: Props) { return <CategoryForm key={data.record?.version ?? "new"} category={data.record} {...callbacks} />; }

export function TaxonomyWorkspace({ kind, children }: { kind: "brand" | "category"; children: ReactNode }) {
  return <RecordWorkspace compact loadEditor={kind === "brand" ? loadBrandEditor : loadCategoryEditor} Editor={kind === "brand" ? BrandEditor : CategoryEditor} createTitle={kind === "brand" ? "Nueva marca" : "Nueva categoría"} editTitle={kind === "brand" ? "Editar marca" : "Editar categoría"} description="Datos del catálogo de tu empresa.">{children}</RecordWorkspace>;
}
