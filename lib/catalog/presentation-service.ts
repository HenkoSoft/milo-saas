import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPanelAccess, type PanelContext } from "@/lib/panel/access";
import { canManageCatalog } from "@/lib/panel/catalog-permission";
import { parseForm, resourceId } from "./schema";
import { presentationCreate, presentationEdit, priceInput } from "./presentation-schema";
import { quickProductCreate, quickProductEdit } from "./quick-product-schema";
import { resolveQuickSale } from "./quick-sale";
import type { CatalogState, PresentationManagement, ReadResult } from "./types";

class Denied extends Error {}
class Missing extends Error {}
class Conflict extends Error {}
class DimensionMismatch extends Error {}
class HistoricalIdentity extends Error {}
class CurrencyMissing extends Error {}
class QuickSaleUnavailable extends Error {}
class InvalidProductRelation extends Error {}
type Tx = Prisma.TransactionClient;
const presSelect = { id: true, productId: true, name: true, unitCode: true, dimensionCode: true, conversionFactor: true, isEnabled: true, updatedAt: true } as const;

async function membership(tx: Tx, context: PanelContext) {
  const p = await tx.userProfile.findUnique({ where: { authUserId: context.authUserId }, select: { id: true, tenantId: true } });
  if (!p || p.id !== context.profileId || p.tenantId !== context.tenant.id) throw new Denied();
  const a = await tx.userRoleAssignment.findFirst({
    where: { tenantId: p.tenantId, userProfileId: p.id, assignmentScope: "COMPANY", branchId: null, role: { code: { in: ["OWNER", "ADMIN"] }, assignmentScope: "COMPANY" } },
    select: { tenantId: true, userProfileId: true, assignmentScope: true, branchId: true, role: { select: { code: true, assignmentScope: true } } },
  });
  if (!a || a.tenantId !== p.tenantId || a.userProfileId !== p.id || a.assignmentScope !== "COMPANY" || a.branchId !== null || a.role.assignmentScope !== "COMPANY" || !["OWNER", "ADMIN"].includes(a.role.code)) throw new Denied();
  return p.tenantId;
}

export async function getPresentationManagement(productId: string): Promise<ReadResult<PresentationManagement>> {
  if (!resourceId.safeParse(productId).success) return { status: "missing" };
  const access = await getPanelAccess();
  if (access.status !== "allowed" || !canManageCatalog(access.context)) return { status: "forbidden" };
  try {
    const data = await prisma.$transaction(async tx => {
      const tenantId = await membership(tx, access.context);
      const product = await tx.product.findFirst({ where: { tenantId, id: productId }, select: { id: true, baseUnitCode: true, baseUnitDimensionCode: true, updatedAt: true } });
      if (!product) throw new Missing();
      const [units, rows, tenant] = await Promise.all([
        tx.unitOfMeasure.findMany({ where: { dimensionCode: product.baseUnitDimensionCode }, select: { code: true, name: true }, orderBy: { code: "asc" } }),
        tx.productPresentation.findMany({ where: { tenantId, productId }, select: { ...presSelect, price: { select: { amount: true, updatedAt: true } }, _count: { select: { orderLines: true } } }, orderBy: [{ name: "asc" }, { id: "asc" }] }),
        tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { currency: true } }),
      ]);
      return { productId, productVersion: product.updatedAt.toISOString(), baseUnitCode: product.baseUnitCode, currency: tenant.currency, units,
        presentations: rows.map(p => ({ id: p.id, name: p.name, unitCode: p.unitCode, isEnabled: p.isEnabled, factor: p.conversionFactor.toFixed(3), price: p.price ? p.price.amount.toFixed(2) : null, version: p.updatedAt.toISOString(), priceVersion: p.price?.updatedAt.toISOString() ?? "", hasHistory: p._count.orderLines > 0 })),
      };
    }, { isolationLevel: "RepeatableRead" });
    return { status: "ok", data };
  } catch (e) { return { status: e instanceof Denied ? "forbidden" : e instanceof Missing ? "missing" : "error" }; }
}

async function lockedProduct(tx: Tx, tenantId: string, productId: string, version: string) {
  const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.products WHERE "tenantId"=${tenantId}::uuid AND id=${productId}::uuid FOR UPDATE`;
  if (!locked.length) throw new Missing();
  const row = await tx.product.findFirst({ where: { tenantId, id: productId }, select: { id: true, baseUnitCode: true, baseUnitDimensionCode: true, allowsFractionalQuantity: true, sku: true, name: true, description: true, categoryId: true, brandId: true, isPublished: true, updatedAt: true } });
  if (!row) throw new Missing(); if (row.updatedAt.toISOString() !== version) throw new Conflict();
  return row;
}
async function lockedPresentation(tx: Tx, tenantId: string, productId: string, id: string, version: string) {
  const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.product_presentations WHERE "tenantId"=${tenantId}::uuid AND "productId"=${productId}::uuid AND id=${id}::uuid FOR UPDATE`;
  if (!locked.length) throw new Missing();
  const row = await tx.productPresentation.findFirst({ where: { tenantId, productId, id }, select: presSelect });
  if (!row) throw new Missing(); if (row.updatedAt.toISOString() !== version) throw new Conflict();
  return row;
}
const nextTime = (old: Date) => new Date(Math.max(Date.now(), old.getTime() + 1));
async function event(tx: Tx, tenantId: string, actorUserId: string, action: string, entityType: string, entityId: string) {
  await tx.auditEvent.create({ data: { tenantId, actorUserId, action, entityType, entityId } });
}
async function write(run: (tx: Tx, tenantId: string, actor: PanelContext) => Promise<{ id: string; version: string; changed: boolean }>): Promise<CatalogState> {
  const access = await getPanelAccess();
  if (access.status !== "allowed" || !canManageCatalog(access.context)) return { status: "forbidden", message: "No tenés permisos para administrar el catálogo." };
  try {
    // ReadCommitted + explicit parent locks: history is read AFTER any lock wait,
    // never from a Serializable snapshot taken before another writer committed.
    const result = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
      return run(tx, await membership(tx, access.context), access.context);
    }, { isolationLevel: "ReadCommitted", maxWait: 5000, timeout: 20000 });
    return { status: "saved", message: result.changed ? "Cambios guardados." : "No hay cambios para guardar.", id: result.id, version: result.version };
  } catch (e) {
    const code = e instanceof Error && "code" in e ? e.code : undefined;
    if (e instanceof Denied) return { status: "forbidden", message: "Tu acceso cambió. Volvé a ingresar." };
    if (e instanceof Missing) return { status: "error", message: "La presentación o el producto no están disponibles." };
    if (e instanceof Conflict || code === "P2034" || code === "P2002") return { status: "conflict", message: "La información cambió. Volvé a cargar la ficha antes de guardar." };
    if (e instanceof HistoricalIdentity) return { status: "invalid", message: "La presentación tiene historial: su unidad y factor no pueden cambiar. Podés renombrarla, habilitarla o deshabilitarla." };
    if (e instanceof DimensionMismatch || code === "P2003") return { status: "invalid", message: "La unidad debe existir y tener la misma dimensión que la unidad base del producto." };
    if (e instanceof CurrencyMissing) return { status: "invalid", message: "La moneda no está configurada o cambió. Recargá la ficha antes de configurar el precio." };
    if (e instanceof QuickSaleUnavailable) return { status: "invalid", message: "La venta por unidad no está disponible para esta configuración. Revisá las Opciones avanzadas; no se cambió ninguna presentación." };
    if (e instanceof InvalidProductRelation) return { status: "invalid", message: "La categoría o marca no está disponible para tu empresa." };
    return { status: "error", message: "No pudimos guardar. Recargá y verificá el resultado antes de volver a intentarlo." };
  }
}

export async function savePresentation(form: unknown, edit: boolean): Promise<CatalogState> {
  const parsed = parseForm<typeof presentationCreate | typeof presentationEdit>(edit ? presentationEdit : presentationCreate, form);
  if (!parsed?.success) return { status: "invalid", message: parsed?.error.issues[0]?.message ?? "Revisá los campos de la presentación." };
  const data = parsed.data;
  return write(async (tx, tenantId, actor) => {
    const product = await lockedProduct(tx, tenantId, data.productId, data.productVersion);
    const old = "id" in data ? await lockedPresentation(tx, tenantId, data.productId, data.id, data.version) : null;
    await membership(tx, actor); // Recheck after waiting on parent locks.
    const unit = await tx.unitOfMeasure.findUnique({ where: { code: data.unitCode }, select: { code: true, dimensionCode: true } });
    if (!unit || unit.dimensionCode !== product.baseUnitDimensionCode) throw new DimensionMismatch();
    const factor = new Prisma.Decimal(data.factor);
    if (old) {
      const identityChanged = old.unitCode !== unit.code || old.dimensionCode !== unit.dimensionCode || !old.conversionFactor.eq(factor);
      if (identityChanged && await tx.orderLine.count({ where: { tenantId, productPresentationId: old.id } }) > 0) throw new HistoricalIdentity();
      if (!identityChanged && old.name === data.name && old.isEnabled === data.isEnabled) return { id: old.id, version: old.updatedAt.toISOString(), changed: false };
      const updatedAt = nextTime(old.updatedAt);
      const result = await tx.productPresentation.updateMany({ where: { tenantId, productId: product.id, id: old.id, updatedAt: old.updatedAt }, data: {
        name: data.name, isEnabled: data.isEnabled, updatedAt,
        ...(identityChanged ? { unitCode: unit.code, dimensionCode: unit.dimensionCode, conversionFactor: factor } : {}),
      } });
      if (result.count !== 1) throw new Conflict();
      await event(tx, tenantId, actor.profileId, "PRESENTATION_UPDATED", "ProductPresentation", old.id);
      return { id: old.id, version: updatedAt.toISOString(), changed: true };
    }
    const row = await tx.productPresentation.create({ data: { tenantId, productId: product.id, name: data.name, unitCode: unit.code, dimensionCode: unit.dimensionCode, conversionFactor: factor, isEnabled: data.isEnabled }, select: { id: true, updatedAt: true } });
    await event(tx, tenantId, actor.profileId, "PRESENTATION_CREATED", "ProductPresentation", row.id);
    return { id: row.id, version: row.updatedAt.toISOString(), changed: true };
  });
}

async function persistPrice(tx: Tx, tenantId: string, actor: PanelContext, presentation: { id: string; productId: string; updatedAt: Date }, data: { amount: string; currency: string; priceVersion: string }) {
    const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { currency: true } });
    if (!tenant.currency || tenant.currency !== data.currency) throw new CurrencyMissing();
    const price = await tx.wholesalePrice.findFirst({ where: { tenantId, productPresentationId: presentation.id }, select: { id: true, amount: true, updatedAt: true } });
    if ((price?.updatedAt.toISOString() ?? "") !== data.priceVersion) throw new Conflict();
    const amount = new Prisma.Decimal(data.amount);
    if (price?.amount.eq(amount)) return { id: presentation.id, version: presentation.updatedAt.toISOString(), changed: false };
    const updatedAt = nextTime(presentation.updatedAt);
    const parent = await tx.productPresentation.updateMany({ where: { tenantId, productId: presentation.productId, id: presentation.id, updatedAt: presentation.updatedAt }, data: { updatedAt } });
    if (parent.count !== 1) throw new Conflict();
    if (price) {
      const result = await tx.wholesalePrice.updateMany({ where: { tenantId, id: price.id, productPresentationId: presentation.id, updatedAt: price.updatedAt }, data: { amount, updatedAt: nextTime(price.updatedAt) } });
      if (result.count !== 1) throw new Conflict();
      await event(tx, tenantId, actor.profileId, "WHOLESALE_PRICE_UPDATED", "WholesalePrice", price.id);
    } else {
      const row = await tx.wholesalePrice.create({ data: { tenantId, productPresentationId: presentation.id, amount }, select: { id: true } });
      await event(tx, tenantId, actor.profileId, "WHOLESALE_PRICE_CREATED", "WholesalePrice", row.id);
    }
    return { id: presentation.id, version: updatedAt.toISOString(), changed: true };
}

export async function savePresentationPrice(form: unknown): Promise<CatalogState> {
  const parsed = parseForm(priceInput, form);
  if (!parsed?.success) return { status: "invalid", message: parsed?.error.issues[0]?.message ?? "Revisá el importe y recargá la ficha si está desactualizada." };
  const data = parsed.data;
  return write(async (tx, tenantId, actor) => {
    await lockedProduct(tx, tenantId, data.productId, data.productVersion);
    const presentation = await lockedPresentation(tx, tenantId, data.productId, data.id, data.version);
    await membership(tx, actor);
    return persistPrice(tx, tenantId, actor, presentation, data);
  });
}

export async function saveQuickProduct(form: unknown, edit: boolean): Promise<CatalogState> {
  const parsed = parseForm<typeof quickProductCreate | typeof quickProductEdit>(edit ? quickProductEdit : quickProductCreate, form);
  if (!parsed?.success) return { status: "invalid", message: parsed?.error.issues.some(i => i.path[0] === "amount")
    ? "Ingresá un precio cero o positivo, con hasta dos decimales y sin separadores de miles."
    : "Revisá nombre, SKU y selecciones. El nombre admite 200 caracteres y el SKU 100, sin saltos de línea." };
  const data = parsed.data;
  return write(async (tx, tenantId, actor) => {
    const old = "id" in data ? await lockedProduct(tx, tenantId, data.id, data.version) : null;
    await membership(tx, actor);
    if (data.categoryId && !await tx.category.findFirst({ where: { tenantId, id: data.categoryId }, select: { id: true } })) throw new InvalidProductRelation();
    if (data.brandId && !await tx.brand.findFirst({ where: { tenantId, id: data.brandId }, select: { id: true } })) throw new InvalidProductRelation();
    const mutable = { sku: data.sku, name: data.name, description: data.description, categoryId: data.categoryId, brandId: data.brandId, isPublished: data.isPublished };
    let product: { id: string; updatedAt: Date };
    let changed = false;
    if (old) product = old;
    else {
      if (!("mode" in data)) throw new Conflict();
      const unit = await tx.unitOfMeasure.findUnique({ where: { code: data.mode === "individual" ? "UN" : data.baseUnitCode }, select: { code: true, dimensionCode: true } });
      if (!unit || (data.mode === "individual" && unit.dimensionCode !== "COUNT")) throw new QuickSaleUnavailable();
      product = await tx.product.create({ data: { ...mutable, tenantId, baseUnitCode: unit.code, baseUnitDimensionCode: unit.dimensionCode, allowsFractionalQuantity: data.mode === "individual" ? false : data.allowsFractionalQuantity }, select: { id: true, updatedAt: true } });
      await event(tx, tenantId, actor.profileId, "PRODUCT_CREATED", "Product", product.id);
      changed = true;
    }
    if (data.amount !== "") {
      let presentation: { id: string; productId: string; updatedAt: Date };
      if (old && "presentationId" in data) {
        const rows = await tx.productPresentation.findMany({ where: { tenantId, productId: old.id }, select: { ...presSelect, price: { select: { amount: true, updatedAt: true } } } });
        const selection = resolveQuickSale(old, rows.map(p => ({ id: p.id, name: p.name, unitCode: p.unitCode, isEnabled: p.isEnabled, factor: p.conversionFactor.toFixed(3), price: p.price?.amount.toFixed(2) ?? null, version: p.updatedAt.toISOString(), priceVersion: p.price?.updatedAt.toISOString() ?? "", hasHistory: false })));
        if (selection.kind !== "available") throw new QuickSaleUnavailable();
        if ((selection.presentation?.id ?? "") !== data.presentationId) throw new Conflict();
        if (selection.presentation) presentation = await lockedPresentation(tx, tenantId, old.id, data.presentationId, data.presentationVersion);
        else {
          if (data.presentationVersion !== "" || data.priceVersion !== "") throw new Conflict();
          presentation = await createIndividual(tx, tenantId, actor, product.id);
        }
      } else {
        if (!("mode" in data) || data.mode !== "individual") throw new QuickSaleUnavailable();
        presentation = await createIndividual(tx, tenantId, actor, product.id);
      }
      const price = await persistPrice(tx, tenantId, actor, presentation, { amount: data.amount, currency: data.currency, priceVersion: "priceVersion" in data ? data.priceVersion : "" });
      changed = changed || price.changed;
    } else if ("priceVersion" in data && data.priceVersion !== "") throw new QuickSaleUnavailable(); // Never interpret blank as deletion.
    if (old) {
      const metadataChanged = Object.entries(mutable).some(([key, value]) => old[key as keyof typeof mutable] !== value);
      if (metadataChanged || changed) {
        const updatedAt = nextTime(old.updatedAt);
        const result = await tx.product.updateMany({ where: { tenantId, id: old.id, updatedAt: old.updatedAt }, data: { ...mutable, updatedAt } });
        if (result.count !== 1) throw new Conflict();
        if (metadataChanged) await event(tx, tenantId, actor.profileId, "PRODUCT_UPDATED", "Product", old.id);
        product = { id: old.id, updatedAt }; changed = true;
      }
    }
    return { id: product.id, version: product.updatedAt.toISOString(), changed };
  });
}

async function createIndividual(tx: Tx, tenantId: string, actor: PanelContext, productId: string) {
  const unit = await tx.unitOfMeasure.findUnique({ where: { code: "UN" }, select: { dimensionCode: true } });
  if (unit?.dimensionCode !== "COUNT") throw new QuickSaleUnavailable();
  const row = await tx.productPresentation.create({ data: { tenantId, productId, name: "Individual", unitCode: "UN", dimensionCode: "COUNT", conversionFactor: new Prisma.Decimal("1"), isEnabled: true }, select: { id: true, productId: true, updatedAt: true } });
  await event(tx, tenantId, actor.profileId, "PRESENTATION_CREATED", "ProductPresentation", row.id);
  return row;
}
