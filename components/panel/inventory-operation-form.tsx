"use client";
import { formatInventoryQuantity } from "@/lib/inventory/format";
import { useActionState, useState } from "react";
import { receiveStock, adjustStock } from "@/app/panel/inventario/actions";
import type { InventoryItem, ReceiptState } from "@/lib/inventory/types";

export function InventoryOperationForm({ adjustment, operationId, branch, products, selectedProduct = "" }: { adjustment: boolean; operationId: string; branch: { id: string; name: string }; products: InventoryItem[]; selectedProduct?: string }) {
  const [state, action, pending] = useActionState(adjustment ? adjustStock : receiveStock, { status: "idle" } as ReceiptState);
  // Preserve this ID across renders, errors and retries; never use previous
  // action state or an automatic fresh UUID after an uncertain commit.
  const [requestId] = useState(operationId);
  const [fields, setFields] = useState({ productId: selectedProduct, quantity: "", sourceReference: "", reason: "", direction: "" });
  const set = (key: keyof typeof fields, value: string) => setFields(old => ({ ...old, [key]: value }));
  const product = products.find(p => p.id === fields.productId);
  const disabled = pending || ["saved", "forbidden", "conflict", "blocked"].includes(state.status);
  const path = adjustment ? "/panel/inventario/ajustar" : "/panel/inventario/ingresar";
  return <form action={action} className="milo-catalog-form" aria-busy={pending}>
    <input type="hidden" name="requestId" value={requestId} /><input type="hidden" name="branchId" value={branch.id} /><input type="hidden" name="baseUnitCode" value={product?.unit ?? ""} />
    <p className="milo-company-hint">Sucursal: <strong>{branch.name}</strong>. La cantidad se expresa directamente en la unidad base del artículo.</p>
    <fieldset className="milo-catalog-fields" disabled={disabled}><div className="milo-catalog-form-grid">
      <div className="milo-field"><label htmlFor="movement-product">Artículo</label><select id="movement-product" name="productId" required value={fields.productId} onChange={e => set("productId", e.target.value)}><option value="">Elegí el artículo</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></div>
      <div className="milo-field"><label htmlFor="movement-quantity">Cantidad {product ? `(${product.unit})` : ""}</label><input id="movement-quantity" name="quantity" inputMode="numeric" maxLength={15} required value={fields.quantity} onChange={e => set("quantity", e.target.value)} aria-describedby="movement-quantity-help" /><span id="movement-quantity-help" className="milo-company-hint">Cantidad entera mayor a cero. No se convierten cajas o packs ni se redondean fracciones.</span></div>
      {adjustment && <div className="milo-field"><label htmlFor="movement-direction">Tipo de ajuste</label><select id="movement-direction" name="direction" required value={fields.direction} onChange={e => set("direction", e.target.value)}><option value="">Elegí cómo ajustar</option><option value="add">Sumar existencias</option><option value="subtract">Restar existencias</option></select></div>}
      <div className="milo-field"><label htmlFor="movement-reference">Documento o referencia (opcional)</label><input id="movement-reference" name="sourceReference" maxLength={200} value={fields.sourceReference} onChange={e => set("sourceReference", e.target.value)} /><span className="milo-company-hint">Ingresá una referencia real si disponés de ella.</span></div>
    </div>{adjustment && <div className="milo-field"><label htmlFor="movement-reason">Motivo del ajuste</label><textarea id="movement-reason" name="reason" required maxLength={1000} rows={3} value={fields.reason} onChange={e => set("reason", e.target.value)} /><span className="milo-company-hint">Explicá el motivo real. El ajuste quedará registrado como un movimiento nuevo.</span></div>}</fieldset>
    {product && <p className="milo-company-hint">Existencia consultada: {product.quantity === null ? "Sin saldo registrado" : `${formatInventoryQuantity(product.quantity, product)} ${product.unit}`}. Se vuelve a comprobar al guardar.</p>}
    {state.message && <p className={state.status === "saved" ? "milo-company-success" : "milo-form-error"} role={state.status === "saved" ? "status" : "alert"}>{state.message}</p>}
    <p className="milo-company-hint">Solicitud: <code>{requestId}</code>. Si hay un error, conservá este formulario para reintentar la misma solicitud.</p>
    <div className="milo-company-form-actions"><button className="milo-primary-button" disabled={disabled}>{pending ? "Registrando…" : adjustment ? "Registrar ajuste" : "Registrar ingreso"}</button><a className="milo-secondary-button" href={`/panel/inventario?${new URLSearchParams({ branch: branch.id })}`}>Volver a inventario</a>{state.status === "saved" && <a className="milo-secondary-button" href={`${path}?${new URLSearchParams({ branch: branch.id })}`}>Registrar otra operación</a>}{product && <a className="milo-secondary-button" href={`/panel/inventario/${product.id}?${new URLSearchParams({ branch: branch.id })}`}>Ver historial</a>}</div>
  </form>;
}
