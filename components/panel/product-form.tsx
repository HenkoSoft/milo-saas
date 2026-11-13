"use client";
import { useActionState, useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct } from "@/app/panel/productos/actions";
import { resolveQuickSale } from "@/lib/catalog/quick-sale";
import { formatPrice, parsePrice, formatEnteredPrice } from "@/lib/catalog/price-format";
import { RecordEditor, EditorTabs, EditorTabPanel, EditorFooter, useDirectEditorGuard, type EditorCallbacks } from "./record-editor";
import type { CatalogOptions, CatalogState, PresentationManagement, ProductView } from "@/lib/catalog/types";

type Props = { product?: ProductView; options: CatalogOptions; management?: PresentationManagement; advanced?: ReactNode } & Partial<EditorCallbacks>;

export function ProductForm(props: Props) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const editingId = props.product?.id;
  const onSaved = props.onSaved;
  const saved = useCallback((message: string, id?: string) => {
    if (onSaved) { onSaved(message, id); return; }
    setNotice(message);
    if (!editingId && id) router.replace(`/panel/productos/${id}`);
    router.refresh();
  }, [router, editingId, onSaved]);
  const key = `${props.product?.version ?? "new"}:${props.management?.presentations.map(p => `${p.id}:${p.version}:${p.priceVersion}`).join("|") ?? ""}`;
  return <>{notice && <p className="milo-company-success" role="status">{notice}</p>}<ProductEditor key={key} {...props} onSaved={saved} /></>;
}

function ProductEditor({ product, options, management, advanced, onSaved, onCancel, onPendingChange }: Props & { onSaved: (message: string, id?: string) => void }) {
  const [state, action, pending] = useActionState(product ? updateProduct : createProduct, { status: "idle" } as CatalogState);
  const hasUnit = options.units.some(u => u.code === "UN" && u.dimensionCode === "COUNT");
  const quick = product && management ? resolveQuickSale(product, management.presentations) : null;
  const [mode, setMode] = useState(hasUnit ? "individual" : "advanced");
  const [initialFields] = useState({ name: product?.name ?? "", sku: product?.sku ?? "", description: product?.description ?? "", categoryId: product?.categoryId ?? "", brandId: product?.brandId ?? "", isPublished: String(product?.isPublished ?? false), baseUnitCode: "", allowsFractionalQuantity: "", amount: quick?.kind === "available" ? formatPrice(quick.presentation?.price ?? "") : "" });
  const [fields, setFields] = useState(initialFields);
  const [tab, setTab] = useState<"data" | "prices">("data");
  const [validation, setValidation] = useState("");
  const formId = useId();
  const dirty = JSON.stringify(fields) !== JSON.stringify(initialFields) || mode !== (hasUnit ? "individual" : "advanced");
  useEffect(() => { onPendingChange?.(pending); }, [pending, onPendingChange]);
  useDirectEditorGuard(dirty, Boolean(onCancel), state.status === "saved");
  const set = (key: keyof typeof fields, value: string) => setFields(old => ({ ...old, [key]: value }));
  const priceAvailable = product ? quick?.kind === "available" : mode === "individual";
  const currency = product ? management?.currency : options.currency;
  const target = currency && quick?.kind === "available" ? quick.presentation : undefined;
  const blocked = (!product && !options.units.length) || (!product && mode === "individual" && !currency);
  useEffect(() => { if (state.status === "saved") onSaved(state.message ?? "Producto guardado.", state.id); }, [state.status, state.version, state.id, state.message, onSaved]);
  return <RecordEditor className="milo-product-editor" tabs={<EditorTabs id={formId} items={[["data", "Datos"], ["prices", "Precios"]] as const} value={tab} onChange={setTab} />} footer={<EditorFooter formId={formId} pending={pending} disabled={blocked || state.status === "forbidden" || state.status === "conflict" || (!product && state.status === "saved")} onCancel={onCancel} cancelHref="/panel/productos" reloadHref={product && (state.status === "conflict" || state.status === "error") ? "/panel/productos/" + product.id : undefined} dirty={dirty} validation={validation} />}>
    <form id={formId} action={action} className="milo-catalog-form milo-product-quick" aria-busy={pending} onSubmit={() => { setValidation(""); onPendingChange?.(true); }} onInvalidCapture={event => {
      event.preventDefault();
      const input = event.target as HTMLInputElement;
      const panel = input.closest<HTMLElement>("[role=tabpanel]");
      if (panel) setTab(panel.dataset.tab === "prices" ? "prices" : "data");
      let parent = input.parentElement;
      while (parent) { if (parent instanceof HTMLDetailsElement) parent.open = true; parent = parent.parentElement; }
      setValidation(input.validationMessage);
      requestAnimationFrame(() => input.focus());
    }}>
    {product ? <><input type="hidden" name="id" value={product.id} /><input type="hidden" name="version" value={state.version ?? product.version} /><input type="hidden" name="presentationId" value={target?.id ?? ""} /><input type="hidden" name="presentationVersion" value={target?.version ?? ""} /><input type="hidden" name="priceVersion" value={target?.priceVersion ?? ""} /></> : <input type="hidden" name="mode" value={mode} />}
    <input type="hidden" name="currency" value={currency ?? ""} />
    <fieldset disabled={pending || state.status === "forbidden" || state.status === "conflict" || (!product && !options.units.length)} className="milo-catalog-fields">
      <EditorTabPanel id={formId} tab="data" active={tab} className="milo-product-data"><header className="milo-product-heading"><h2>{product ? "Datos del producto" : "Carga rápida"}</h2><p className="milo-company-hint">{product ? "Actualizá la ficha y el precio de venta de tu empresa." : "Completá los datos y el precio. Para productos comunes, la venta por unidad queda preparada al guardar."}</p></header>
      <div className="milo-catalog-form-grid">
        <div className="milo-field"><label htmlFor="product-name">Nombre del producto</label><input id="product-name" autoFocus={Boolean(onCancel)} name="name" value={fields.name} onChange={e => set("name", e.target.value)} maxLength={200} required placeholder="Cómo lo reconocen tus clientes" /></div>
        <div className="milo-field"><label htmlFor="product-sku">SKU / código interno</label><input id="product-sku" name="sku" value={fields.sku} onChange={e => set("sku", e.target.value)} maxLength={100} required autoComplete="off" /><span className="milo-company-hint">Un código único dentro de tu empresa.</span></div>
        <div className="milo-field"><label htmlFor="product-category">Categoría</label><select id="product-category" name="categoryId" value={fields.categoryId} onChange={e => set("categoryId", e.target.value)}><option value="">Sin categoría</option>{options.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="milo-field"><label htmlFor="product-brand">Marca (opcional)</label><select id="product-brand" name="brandId" value={fields.brandId} onChange={e => set("brandId", e.target.value)}><option value="">Sin marca</option>{options.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      <div className="milo-field"><label htmlFor="product-published">Visibilidad de la ficha</label><select id="product-published" name="isPublished" value={fields.isPublished} onChange={e => set("isPublished", e.target.value)}><option value="false">No publicada</option><option value="true">Publicada</option></select></div>
      <div className="milo-field milo-product-description"><label htmlFor="product-description">Descripción</label><textarea id="product-description" name="description" value={fields.description} onChange={e => set("description", e.target.value)} maxLength={5000} rows={3} placeholder="Características que ayudan a elegir el producto" /></div>
      </div></EditorTabPanel>
      <EditorTabPanel id={formId} tab="prices" active={tab}><h2>Precio de venta</h2><div className="milo-product-price-row">
        <div className="milo-field"><label htmlFor="product-price">Precio de venta {currency ? `(${currency})` : ""}</label>
          {priceAvailable && currency ? <><input type="hidden" name="amount" value={parsePrice(fields.amount) ?? "invalid"} /><input id="product-price" value={fields.amount} onChange={e => { set("amount", e.target.value); e.target.setCustomValidity(parsePrice(e.target.value) === null ? "Usá punto para miles y coma para centavos; hasta 2 decimales." : ""); }} onBlur={() => set("amount", formatEnteredPrice(fields.amount))} inputMode="decimal" maxLength={24} required={!product || (quick?.kind === "available" && quick.presentation?.price != null)} placeholder={product ? "Sin precio" : "0,00"} aria-describedby="product-price-help" /></> : <><input type="hidden" name="amount" value="" /><input id="product-price" value="" disabled placeholder="Administrar en Opciones avanzadas" /></>}
          <span id="product-price-help" className="milo-company-hint">{priceAvailable ? currency ? "Precio por unidad. Punto para miles y coma para centavos. Ejemplo: 100.000,00." : "La empresa necesita una moneda configurada para guardar precios." : quick?.kind === "advanced" ? quick.reason : "El precio de esta configuración se define por presentación en Opciones avanzadas, después de crear el producto."}</span>
        </div>
      </div></EditorTabPanel>
      {!product && <details className="milo-product-advanced"><summary>Opciones avanzadas</summary><div className="milo-product-advanced-body">
        <div className="milo-field"><label htmlFor="product-mode">Forma de venta</label><select id="product-mode" value={mode} onChange={e => setMode(e.target.value)}><option value="individual" disabled={!hasUnit}>Venta habitual por unidad</option><option value="advanced">Otra unidad o configuración especial</option></select></div>
        {mode === "individual" ? <p className="milo-company-hint">Unidad (UN), sin cantidades fraccionarias. Se prepara una presentación individual al guardar.</p> : <div className="milo-catalog-form-grid">
          <div className="milo-field"><label htmlFor="product-unit">Unidad base</label><select id="product-unit" name="baseUnitCode" value={fields.baseUnitCode} onChange={e => set("baseUnitCode", e.target.value)} required><option value="">Elegí la unidad</option>{options.units.map(u => <option key={u.code} value={u.code}>{u.name} ({u.code})</option>)}</select></div>
          <div className="milo-field"><label htmlFor="product-fractional">¿Admite cantidades fraccionarias?</label><select id="product-fractional" name="allowsFractionalQuantity" value={fields.allowsFractionalQuantity} onChange={e => set("allowsFractionalQuantity", e.target.value)} required><option value="">Elegí una opción</option><option value="false">No</option><option value="true">Sí</option></select></div>
        </div>}
        <p className="milo-company-hint">Después de guardar podés agregar cajas, packs u otras presentaciones. No se calculan fracciones ni redondeos.</p>
      </div></details>}
    </fieldset>
    {!product && !options.units.length && <p className="milo-form-error" role="alert">No hay unidades aprobadas disponibles. No se crean unidades desde este formulario.</p>}
    {!product && !hasUnit && <p className="milo-company-hint">La unidad UN no está disponible para carga rápida. Elegí una configuración en Opciones avanzadas.</p>}
    <p className="milo-company-hint">Este formulario no carga existencias. El stock se administrará mediante movimientos de inventario.</p>
    {state.message && <p className={state.status === "saved" ? "milo-company-success" : "milo-form-error"} role={state.status === "saved" ? "status" : "alert"}>{state.message}</p>}
    </form>
    {product && <details className="milo-product-advanced"><summary>Opciones avanzadas</summary><div className="milo-product-advanced-body"><p className="milo-company-hint">Unidad base: {product.baseUnitName} ({product.baseUnitCode}). Cantidades fraccionarias: {product.allowsFractionalQuantity ? "sí" : "no"}. Esta configuración se conserva.</p>{dirty && <p className="milo-company-hint">Guardá los datos del producto antes de modificar presentaciones.</p>}<fieldset className="milo-catalog-fields" disabled={dirty || pending}>{advanced}</fieldset></div></details>}
  </RecordEditor>;
}
