"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createCategory, updateCategory } from "@/app/panel/categorias/actions";
import { createBrand, updateBrand } from "@/app/panel/marcas/actions";
import type { CatalogState, CategoryView } from "@/lib/catalog/types";

function Feedback({ state }: { state: CatalogState }) {
  return state.message ? <p className={state.status === "saved" ? "milo-company-success" : "milo-form-error"} role={state.status === "saved" ? "status" : "alert"}>{state.message}</p> : null;
}

export function CategoryForm({ category, kind = "category" }: { category?: CategoryView; kind?: "category" | "brand" }) {
  const save = kind === "brand" ? (category ? updateBrand : createBrand) : (category ? updateCategory : createCategory);
  const [state, action, pending] = useActionState(save, { status: "idle" } as CatalogState);
  const path = kind === "brand" ? "/panel/marcas" : "/panel/categorias";
  const label = kind === "brand" ? "marca" : "categoría";
  const [name, setName] = useState(category?.name ?? "");
  const router = useRouter();
  const editingId = category?.id;
  useEffect(() => {
    if (state.status === "saved") {
      if (!editingId && state.id) router.replace(`${path}/${state.id}`);
      router.refresh();
    }
  }, [state.status, state.version, state.id, editingId, path, router]);
  return <form action={action} className="milo-catalog-form" aria-busy={pending}>
    {category && <><input type="hidden" name="id" value={category.id} /><input type="hidden" name="version" value={state.version ?? category.version} /></>}
    <div className="milo-field"><label htmlFor="category-name">Nombre</label><input id="category-name" name="name" value={name} onChange={e => setName(e.target.value)} maxLength={200} required disabled={pending} /></div>
    <Feedback state={state} />
    <div className="milo-company-form-actions"><button className="milo-primary-button" disabled={pending || state.status === "forbidden" || state.status === "conflict" || (!category && state.status === "saved")}>{pending ? "Guardando…" : category ? `Guardar ${label}` : `Crear ${label}`}</button>
      <a className="milo-secondary-button" href={category && (state.status === "conflict" || state.status === "error") ? `${path}/${category.id}` : path}>{state.status === "conflict" || state.status === "error" ? "Volver a cargar" : "Volver al listado"}</a>
    </div>
  </form>;
}

export function BrandForm({ brand }: { brand?: CategoryView }) {
  return <CategoryForm kind="brand" category={brand} />;
}

export { ProductForm } from "./product-form";
