"use client";
import { useActionState, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { createCategory, updateCategory } from "@/app/panel/categorias/actions";
import { createBrand, updateBrand } from "@/app/panel/marcas/actions";
import type { CatalogState, CategoryView } from "@/lib/catalog/types";
import { RecordEditor, EditorFooter, useDirectEditorGuard, type EditorCallbacks } from "./record-editor";

function Feedback({ state }: { state: CatalogState }) {
  return state.message ? <p className={state.status === "saved" ? "milo-company-success" : "milo-form-error"} role={state.status === "saved" ? "status" : "alert"}>{state.message}</p> : null;
}

export function CategoryForm({ category, kind = "category", onSaved, onCancel, onPendingChange }: { category?: CategoryView; kind?: "category" | "brand" } & Partial<EditorCallbacks>) {
  const save = kind === "brand" ? (category ? updateBrand : createBrand) : (category ? updateCategory : createCategory);
  const [state, action, pending] = useActionState(save, { status: "idle" } as CatalogState);
  const path = kind === "brand" ? "/panel/marcas" : "/panel/categorias";
  const [name, setName] = useState(category?.name ?? "");
  const formId = useId();
  const dirty = name !== (category?.name ?? "");
  useDirectEditorGuard(dirty, Boolean(onCancel), state.status === "saved");
  useEffect(() => { onPendingChange?.(pending); }, [pending, onPendingChange]);
  const router = useRouter();
  const editingId = category?.id;
  useEffect(() => {
    if (state.status === "saved") {
      if (onSaved) { onSaved(state.message ?? "Cambios guardados.", state.id); return; }
      if (!editingId && state.id) router.replace(`${path}/${state.id}`);
      router.refresh();
    }
  }, [state.status, state.version, state.id, state.message, editingId, path, router, onSaved]);
  return <RecordEditor footer={<EditorFooter formId={formId} pending={pending} disabled={state.status === "forbidden" || state.status === "conflict" || (!category && state.status === "saved")} onCancel={onCancel} cancelHref={path} reloadHref={category && (state.status === "conflict" || state.status === "error") ? `${path}/${category.id}` : undefined} dirty={dirty} />}><form id={formId} action={action} className="milo-catalog-form" aria-busy={pending} onSubmit={() => onPendingChange?.(true)}>
    {category && <><input type="hidden" name="id" value={category.id} /><input type="hidden" name="version" value={state.version ?? category.version} /></>}
    <div className="milo-catalog-form-grid"><div className="milo-field"><label htmlFor={formId + "-name"}>Nombre</label><input id={formId + "-name"} autoFocus={Boolean(onCancel)} name="name" value={name} onChange={e => setName(e.target.value)} maxLength={200} required disabled={pending || state.status === "forbidden" || state.status === "conflict"} /></div></div>
    <Feedback state={state} />
  </form></RecordEditor>;
}

export function BrandForm({ brand, ...callbacks }: { brand?: CategoryView } & Partial<EditorCallbacks>) {
  return <CategoryForm kind="brand" category={brand} {...callbacks} />;
}

export { ProductForm } from "./product-form";
