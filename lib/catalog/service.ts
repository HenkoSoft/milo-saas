import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPanelAccess, type PanelContext } from "@/lib/panel/access";
import { canManageCatalog } from "@/lib/panel/catalog-permission";
import { categoryCreate, categoryEdit, productCreate, productEdit, listQuery, resourceId, parseForm } from "./schema";
import type { CatalogOptions, CatalogState, CategoryView, ProductView, PresentationView, PageData, ReadResult } from "./types";

class Denied extends Error {}
class Missing extends Error {}
class Conflict extends Error {}
class InvalidRelation extends Error {}
class UnitUnavailable extends Error {}
const size = 25;
const productSelect = {
  id: true, sku: true, name: true, description: true, categoryId: true, brandId: true,
  baseUnitCode: true, baseUnitDimensionCode: true, allowsFractionalQuantity: true, isPublished: true, updatedAt: true,
  category: { select: { name: true } }, brand: { select: { name: true } }, baseUnit: { select: { name: true } },
} as const;
const categorySelect = { id: true, name: true, updatedAt: true } as const;
function categoryView(row: Prisma.CategoryGetPayload<{ select: typeof categorySelect }>): CategoryView {
  return { id: row.id, name: row.name, version: row.updatedAt.toISOString() };
}
function productView(row: Prisma.ProductGetPayload<{ select: typeof productSelect }>): ProductView {
  return { id: row.id, sku: row.sku, name: row.name, description: row.description, categoryId: row.categoryId, brandId: row.brandId, categoryName: row.category?.name ?? null, brandName: row.brand?.name ?? null, baseUnitCode: row.baseUnitCode, baseUnitDimensionCode: row.baseUnitDimensionCode, baseUnitName: row.baseUnit.name, allowsFractionalQuantity: row.allowsFractionalQuantity, isPublished: row.isPublished, version: row.updatedAt.toISOString() };
}

async function membership(tx: Prisma.TransactionClient, context: PanelContext) {
  const p = await tx.userProfile.findUnique({ where: { authUserId: context.authUserId }, select: { id: true, tenantId: true } });
  if (!p || p.id !== context.profileId || p.tenantId !== context.tenant.id) throw new Denied();
  const role = await tx.userRoleAssignment.findFirst({
    where: { tenantId: p.tenantId, userProfileId: p.id, assignmentScope: "COMPANY", branchId: null, role: { code: { in: ["OWNER", "ADMIN"] }, assignmentScope: "COMPANY" } },
    select: { tenantId: true, userProfileId: true, assignmentScope: true, branchId: true, role: { select: { code: true, assignmentScope: true } } },
  });
  if (!role || role.tenantId !== p.tenantId || role.userProfileId !== p.id || role.assignmentScope !== "COMPANY" || role.branchId !== null || role.role.assignmentScope !== "COMPANY" || !["OWNER", "ADMIN"].includes(role.role.code)) throw new Denied();
  return p.tenantId;
}

async function read<T>(run: (tx: Prisma.TransactionClient, tenantId: string) => Promise<T>): Promise<ReadResult<T>> {
  const a = await getPanelAccess();
  if (a.status !== "allowed" || !canManageCatalog(a.context)) return { status: "forbidden" };
  try {
    const data = await prisma.$transaction(async tx => run(tx, await membership(tx, a.context)), { isolationLevel: "RepeatableRead" });
    return { status: "ok", data };
  } catch (e) { return { status: e instanceof Denied ? "forbidden" : e instanceof Missing ? "missing" : "error" }; }
}

export async function listCategories(query: unknown): Promise<ReadResult<PageData<CategoryView>>> {
  const parsed = listQuery.safeParse(query); if (!parsed.success) return { status: "invalid" };
  return read(async (tx, tenantId) => {
    const { q, page } = parsed.data;
    const where = { tenantId, ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}) };
    const total = await tx.category.count({ where }); const pages = Math.max(1, Math.ceil(total / size)); const current = Math.min(page, pages);
    const rows = await tx.category.findMany({ where, select: categorySelect, orderBy: [{ name: "asc" }, { id: "asc" }], take: size, skip: (current - 1) * size });
    return { items: rows.map(categoryView), total, pages, page: current, q };
  });
}
export async function getCategory(id: string): Promise<ReadResult<CategoryView>> {
  if (!resourceId.safeParse(id).success) return { status: "missing" };
  return read(async (tx, tenantId) => {
    const row = await tx.category.findFirst({ where: { tenantId, id }, select: categorySelect });
    if (!row) throw new Missing(); return categoryView(row);
  });
}
export async function listProducts(query: unknown): Promise<ReadResult<PageData<ProductView>>> {
  const parsed = listQuery.safeParse(query); if (!parsed.success) return { status: "invalid" };
  return read(async (tx, tenantId) => {
    const { q, page } = parsed.data;
    const where = { tenantId, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { sku: { contains: q, mode: "insensitive" as const } }] } : {}) };
    const total = await tx.product.count({ where }); const pages = Math.max(1, Math.ceil(total / size)); const current = Math.min(page, pages);
    const rows = await tx.product.findMany({ where, select: productSelect, orderBy: [{ name: "asc" }, { id: "asc" }], take: size, skip: (current - 1) * size });
    return { items: rows.map(productView), total, pages, page: current, q };
  });
}
export async function catalogOptions(): Promise<ReadResult<CatalogOptions>> {
  return read(async (tx, tenantId) => {
    const [categories, brands, units, tenant] = await Promise.all([
      tx.category.findMany({ where: { tenantId }, select: { id: true, name: true }, orderBy: [{ name: "asc" }, { id: "asc" }] }),
      tx.brand.findMany({ where: { tenantId }, select: { id: true, name: true }, orderBy: [{ name: "asc" }, { id: "asc" }] }),
      tx.unitOfMeasure.findMany({ select: { code: true, name: true, dimensionCode: true }, orderBy: { code: "asc" } }),
      tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { currency: true } }),
    ]);
    return { categories, brands, units, currency: tenant.currency };
  });
}
export async function getProduct(id: string): Promise<ReadResult<{ product: ProductView; presentations: PresentationView[]; currency: string | null }>> {
  if (!resourceId.safeParse(id).success) return { status: "missing" };
  return read(async (tx, tenantId) => {
    const row = await tx.product.findFirst({ where: { tenantId, id }, select: productSelect });
    if (!row) throw new Missing();
    const rows = await tx.productPresentation.findMany({
      where: { tenantId, productId: id }, select: { id: true, name: true, unitCode: true, isEnabled: true, conversionFactor: true, price: { select: { amount: true } } },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { currency: true } });
    // Native database decimals become exact fixed-scale strings, never JS numbers.
    return { product: productView(row), currency: tenant.currency, presentations: rows.map(p => ({ id: p.id, name: p.name, unitCode: p.unitCode, isEnabled: p.isEnabled, factor: p.conversionFactor.toFixed(3), price: p.price ? p.price.amount.toFixed(2) : null })) };
  });
}

async function write(run: (tx: Prisma.TransactionClient, tenantId: string, context: PanelContext) => Promise<{ id: string; version: string }>): Promise<CatalogState> {
  const a = await getPanelAccess();
  if (a.status !== "allowed" || !canManageCatalog(a.context)) return { status: "forbidden", message: "No tenés permisos para administrar el catálogo." };
  try {
    const saved = await prisma.$transaction(async tx => run(tx, await membership(tx, a.context), a.context), { isolationLevel: "Serializable" });
    return { status: "saved", message: "Cambios guardados.", ...saved };
  } catch (e) {
    if (e instanceof Denied) return { status: "forbidden", message: "Tu acceso cambió. Volvé a ingresar." };
    if (e instanceof Missing) return { status: "error", message: "El registro no está disponible." };
    const code = e instanceof Error && "code" in e ? e.code : undefined;
    if (e instanceof Conflict || code === "P2034") return { status: "conflict", message: "El registro cambió mientras editabas. Volvé a cargarlo antes de guardar." };
    if (e instanceof UnitUnavailable) return { status: "invalid", message: "Elegí una unidad base existente y aprobada. No se crean unidades desde esta pantalla." };
    if (e instanceof InvalidRelation || code === "P2003") return { status: "invalid", message: "La categoría o marca seleccionada no está disponible para tu empresa." };
    if (code === "P2002") return { status: "invalid", message: "No se pudo crear o actualizar: comprobá que el SKU no esté registrado en tu empresa. Volvé a cargar antes de repetir un alta." };
    return { status: "error", message: "No pudimos guardar. Volvé a cargar y verificá el resultado antes de intentarlo nuevamente." };
  }
}
async function audit(tx: Prisma.TransactionClient, tenantId: string, context: PanelContext, action: string, entityType: "Product" | "Category" | "Brand", entityId: string) {
  await tx.auditEvent.create({ data: { tenantId, actorUserId: context.profileId, action, entityType, entityId } });
}
const invalid: CatalogState = { status: "invalid", message: "Revisá los campos. Nombre y SKU no admiten líneas ni controles; verificá también las selecciones y volvé a cargar si el formulario está desactualizado." };
const nextTime = (old: Date) => new Date(Math.max(Date.now(), old.getTime() + 1));

export async function saveCategory(form: unknown, edit: boolean): Promise<CatalogState> {
  const p = parseForm<typeof categoryCreate | typeof categoryEdit>(edit ? categoryEdit : categoryCreate, form);
  if (!p?.success) return invalid;
  const data = p.data;
  return write(async (tx, tenantId, context) => {
    if ("id" in data) {
      const old = await tx.category.findFirst({ where: { tenantId, id: data.id }, select: categorySelect });
      if (!old) throw new Missing(); if (old.updatedAt.toISOString() !== data.version) throw new Conflict();
      if (old.name === data.name) return { id: old.id, version: old.updatedAt.toISOString() };
      const updatedAt = nextTime(old.updatedAt);
      const saved = await tx.category.updateMany({ where: { tenantId, id: old.id, updatedAt: new Date(data.version) }, data: { name: data.name, updatedAt } });
      if (saved.count !== 1) throw new Conflict();
      await audit(tx, tenantId, context, "CATEGORY_UPDATED", "Category", old.id);
      return { id: old.id, version: updatedAt.toISOString() };
    }
    const row = await tx.category.create({ data: { tenantId, name: data.name }, select: categorySelect });
    await audit(tx, tenantId, context, "CATEGORY_CREATED", "Category", row.id);
    return { id: row.id, version: row.updatedAt.toISOString() };
  });
}

export async function saveProduct(form: unknown, edit: boolean): Promise<CatalogState> {
  const p = edit ? parseForm(productEdit, form) : parseForm(productCreate, form);
  if (!p?.success) return invalid;
  const data = p.data;
  return write(async (tx, tenantId, context) => {
    if (data.categoryId && !await tx.category.findFirst({ where: { tenantId, id: data.categoryId }, select: { id: true } })) throw new InvalidRelation();
    if (data.brandId && !await tx.brand.findFirst({ where: { tenantId, id: data.brandId }, select: { id: true } })) throw new InvalidRelation();
    const mutable = { sku: data.sku, name: data.name, description: data.description, categoryId: data.categoryId, brandId: data.brandId, isPublished: data.isPublished };
    if ("id" in data) {
      const old = await tx.product.findFirst({ where: { tenantId, id: data.id }, select: productSelect });
      if (!old) throw new Missing(); if (old.updatedAt.toISOString() !== data.version) throw new Conflict();
      if (Object.entries(mutable).every(([key, value]) => old[key as keyof typeof mutable] === value)) return { id: old.id, version: old.updatedAt.toISOString() };
      const updatedAt = nextTime(old.updatedAt);
      const saved = await tx.product.updateMany({ where: { tenantId, id: old.id, updatedAt: new Date(data.version) }, data: { ...mutable, updatedAt } });
      if (saved.count !== 1) throw new Conflict();
      await audit(tx, tenantId, context, "PRODUCT_UPDATED", "Product", old.id);
      return { id: old.id, version: updatedAt.toISOString() };
    }
    const unit = await tx.unitOfMeasure.findUnique({ where: { code: data.baseUnitCode }, select: { code: true, dimensionCode: true } });
    if (!unit) throw new UnitUnavailable();
    const row = await tx.product.create({ data: { ...mutable, tenantId, baseUnitCode: unit.code, baseUnitDimensionCode: unit.dimensionCode, allowsFractionalQuantity: data.allowsFractionalQuantity }, select: { id: true, updatedAt: true } });
    await audit(tx, tenantId, context, "PRODUCT_CREATED", "Product", row.id);
    return { id: row.id, version: row.updatedAt.toISOString() };
  });
}

export async function listBrands(query: unknown): Promise<ReadResult<PageData<CategoryView>>> {
  const parsed = listQuery.safeParse(query); if (!parsed.success) return { status: "invalid" };
  return read(async (tx, tenantId) => {
    const { q, page } = parsed.data;
    const where = { tenantId, ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}) };
    const total = await tx.brand.count({ where }); const pages = Math.max(1, Math.ceil(total / size)); const current = Math.min(page, pages);
    const rows = await tx.brand.findMany({ where, select: categorySelect, orderBy: [{ name: "asc" }, { id: "asc" }], take: size, skip: (current - 1) * size });
    return { items: rows.map(categoryView), total, pages, page: current, q };
  });
}
export async function getBrand(id: string): Promise<ReadResult<CategoryView>> {
  if (!resourceId.safeParse(id).success) return { status: "missing" };
  return read(async (tx, tenantId) => {
    const row = await tx.brand.findFirst({ where: { tenantId, id }, select: categorySelect });
    if (!row) throw new Missing(); return categoryView(row);
  });
}
export async function saveBrand(form: unknown, edit: boolean): Promise<CatalogState> {
  const p = parseForm<typeof categoryCreate | typeof categoryEdit>(edit ? categoryEdit : categoryCreate, form);
  if (!p?.success) return invalid;
  const data = p.data;
  return write(async (tx, tenantId, context) => {
    if ("id" in data) {
      const old = await tx.brand.findFirst({ where: { tenantId, id: data.id }, select: categorySelect });
      if (!old) throw new Missing(); if (old.updatedAt.toISOString() !== data.version) throw new Conflict();
      if (old.name === data.name) return { id: old.id, version: old.updatedAt.toISOString() };
      const updatedAt = nextTime(old.updatedAt);
      const saved = await tx.brand.updateMany({ where: { tenantId, id: old.id, updatedAt: new Date(data.version) }, data: { name: data.name, updatedAt } });
      if (saved.count !== 1) throw new Conflict();
      await audit(tx, tenantId, context, "BRAND_UPDATED", "Brand", old.id);
      return { id: old.id, version: updatedAt.toISOString() };
    }
    const row = await tx.brand.create({ data: { tenantId, name: data.name }, select: categorySelect });
    await audit(tx, tenantId, context, "BRAND_CREATED", "Brand", row.id);
    return { id: row.id, version: row.updatedAt.toISOString() };
  });
}
