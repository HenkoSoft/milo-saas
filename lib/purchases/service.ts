import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPanelAccess, type PanelContext } from "@/lib/panel/access";
import { canManagePurchases } from "@/lib/panel/purchase-permission";
import { supplierMembership, SupplierMembershipDenied } from "@/lib/suppliers/service";
import { vatConditions } from "../customers/commercial-fields";
import { purchasesReady } from "./storage";
import { legacyPurchaseOmit, purchaseDocumentReady, readPurchaseDocument, readPurchaseDocuments } from "./document";
import { lookupInput, purchaseInput, purchaseQuery, receiveInput, type PurchaseInput } from "./schema";
import type { Choice, PurchaseEditorData, PurchaseState, PurchaseView, Result } from "./types";
class Failure extends Error { constructor(public status: "invalid" | "conflict" | "pending" | "missing", message: string) { super(message); } }
const maxMoney = new Prisma.Decimal("9999999999999999.99"), maxStock = new Prisma.Decimal("999999999999999.999");
const options = { isolationLevel: "ReadCommitted", maxWait: 10000, timeout: 20000 } as const;
const code = (n: number) => "CP" + String(n).padStart(6, "0");
const supplierLabel = (s: { commercialNumber: number; legalName: string | null; commercialName: string | null }) => `P${String(s.commercialNumber).padStart(6, "0")} · ${s.legalName || s.commercialName || "Proveedor"}`;
function supplierDetails(s: { commercialNumber: number; legalName: string | null; commercialName: string | null; vatCondition: string | null; cuit: string | null; address: string | null }) {
  return { code: "P" + String(s.commercialNumber).padStart(6, "0"), name: s.legalName || s.commercialName || "Proveedor", vatCondition: s.vatCondition ?? "", cuit: s.cuit ?? "", address: s.address ?? "" };
}
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function failure(error: unknown): Exclude<PurchaseState, { status: "saved" }> {
  if (error instanceof SupplierMembershipDenied) return { status: "forbidden", message: "Tu acceso cambió. Volvé a ingresar." };
  if (error instanceof Failure) return { status: error.status === "missing" ? "invalid" : error.status, message: error.message };
  const dbCode = error instanceof Error && "code" in error ? error.code : null;
  if (["P2002", "P2034"].includes(String(dbCode))) return { status: "conflict", message: "Hubo una operación concurrente. Recargá y verificá el documento antes de continuar." };
  return { status: "error", message: "No se pudo confirmar la operación. Recargá el detalle antes de reintentar; no se reintenta automáticamente." };
}
async function run<T>(callback: (tx: Prisma.TransactionClient, tenantId: string, context: PanelContext) => Promise<T>): Promise<Result<T>> {
  const access = await getPanelAccess();
  if (access.status !== "allowed" || !canManagePurchases(access.context)) return { status: "forbidden" };
  try {
    return { status: "ok", data: await prisma.$transaction(async tx => {
      await tx.$executeRaw`SET LOCAL lock_timeout='5s'`;
      const tenantId = await supplierMembership(tx, access.context);
      if (!await purchasesReady(tx)) throw new Failure("pending", "Compras requiere aplicar la migración pendiente, con autorización independiente.");
      return callback(tx, tenantId, access.context);
    }, options) };
  } catch (error) { return failure(error); }
}
export function calculatePurchase(input: PurchaseInput) {
  const lines = input.lines.map(l => {
    const quantity = new Prisma.Decimal(l.quantity), unitCost = new Prisma.Decimal(l.unitCost), subtotal = quantity.mul(unitCost);
    if (unitCost.gt(maxMoney) || subtotal.gt(maxMoney)) throw new Failure("invalid", "El costo o subtotal supera el máximo admitido.");
    return { ...l, quantity, unitCost, subtotal };
  });
  const net = lines.reduce((sum, l) => sum.plus(l.subtotal), new Prisma.Decimal(0));
  const total = net.plus(input.document?.taxAmount ?? "0");
  if (total.gt(maxMoney)) throw new Failure("invalid", "El total supera el máximo admitido.");
  return { lines, total, net };
}
async function productsLocked(tx: Prisma.TransactionClient, tenantId: string, ids: string[]) {
  const products = [];
  for (const id of [...new Set(ids)].sort()) {
    const rows = await tx.$queryRaw<{ id: string; sku: string; name: string; baseUnitCode: string }[]>`SELECT id,sku,name,"baseUnitCode" FROM products WHERE "tenantId"=${tenantId}::uuid AND id=${id}::uuid FOR UPDATE`;
    if (!rows[0]) throw new Failure("invalid", "Un artículo no pertenece a tu empresa o dejó de estar disponible.");
    products.push(rows[0]);
  }
  return products;
}
async function audit(tx: Prisma.TransactionClient, tenantId: string, actorUserId: string, entityId: string, action: string) {
  await tx.auditEvent.create({ data: { tenantId, actorUserId, entityId, entityType: "Purchase", action } });
}
const supplierSelect = { id: true, commercialNumber: true, legalName: true, commercialName: true, vatCondition: true, cuit: true, address: true } as const;
const include = { supplier: { select: supplierSelect }, branch: { select: { name: true } }, creator: { select: { authUser: { select: { name: true } } } }, receiver: { select: { authUser: { select: { name: true } } } }, lines: { orderBy: { position: "asc" as const }, include: { movements: { select: { id: true } } } } } as const;
function view(p: Prisma.PurchaseGetPayload<{ include: typeof include; omit: typeof legacyPurchaseOmit }>): PurchaseView {
  return {
    input: { id: p.id, revision: p.revision, supplierId: p.supplierId, branchId: p.branchId, date: p.date.toISOString().slice(0, 10), reference: p.reference ?? "", notes: p.notes ?? "", lines: p.lines.map(l => ({ id: l.id, productId: l.productId, baseUnitCode: l.baseUnitCode, quantity: l.quantity.toFixed(0), unitCost: l.unitCost.toFixed(2) })) },
    supplierDetails: supplierDetails(p.supplier),
    code: code(p.commercialNumber), status: p.status, total: p.total.toFixed(2), supplier: p.supplierSnapshot ?? supplierLabel(p.supplier), branch: p.branch.name,
    creator: p.creator.authUser?.name ?? "Usuario registrado", receiver: p.receiver ? p.receiver.authUser?.name ?? "Usuario registrado" : null, createdAt: p.createdAt.toISOString(), receivedAt: p.receivedAt?.toISOString() ?? null,
    lines: p.lines.map(l => ({ id: l.id, productId: l.productId, sku: l.sku, name: l.name, unit: l.baseUnitCode, quantity: l.quantity.toFixed(0), unitCost: l.unitCost.toFixed(2), subtotal: l.subtotal.toFixed(2), movementId: l.movements[0]?.id ?? null })),
  };
}
export async function loadPurchase(id: string | null): Promise<Result<PurchaseEditorData>> {
  if (id !== null && !receiveInput.shape.id.safeParse(id).success) return { status: "missing" };
  return run(async (tx, tenantId) => {
    const branches = await tx.branch.findMany({ where: { tenantId }, select: { id: true, name: true }, orderBy: [{ name: "asc" }, { id: "asc" }] });
    const purchase = id ? await tx.purchase.findFirst({ where: { tenantId, id }, include, omit: legacyPurchaseOmit }) : null;
    if (id && !purchase) throw new Failure("missing", "Compra no disponible.");
    const documentReady = await purchaseDocumentReady(tx);
    const result = purchase ? view(purchase) : undefined;
    if (result && documentReady) { result.input.document = await readPurchaseDocument(tx, tenantId, result.input.id); result.net = purchase!.total.minus(result.input.document?.taxAmount ?? "0").toFixed(2); }
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    return { id: id ?? randomUUID(), date: today, branches: branches.map(b => ({ id: b.id, label: b.name })), documentReady, vatConditions, ...(result ? { purchase: result } : {}) };
  });
}
export async function lookupPurchases(input: unknown): Promise<Result<Choice[]>> {
  const parsed = lookupInput.safeParse(input); if (!parsed.success) return { status: "invalid" };
  return run(async (tx, tenantId) => {
    const q = parsed.data.q;
    if (parsed.data.kind === "products") {
      const products = await tx.product.findMany({ where: { tenantId, OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] }, select: { id: true, name: true, sku: true, baseUnitCode: true }, take: 25, orderBy: [{ name: "asc" }, { id: "asc" }] });
      return products.map(p => ({ id: p.id, label: `${p.sku} · ${p.name}`, unit: p.baseUnitCode, sku: p.sku, name: p.name }));
    }
    const suppliers = await tx.supplier.findMany({ select: supplierSelect, where: { tenantId, OR: [{ legalName: { contains: q, mode: "insensitive" } }, { commercialName: { contains: q, mode: "insensitive" } }, { cuit: { contains: q } }] }, take: 25, orderBy: [{ commercialNumber: "asc" }] });
    return suppliers.map(s => ({ id: s.id, label: supplierLabel(s), supplier: supplierDetails(s) }));
  });
}
export async function quotePurchase(input: unknown): Promise<Result<{ total: string; net: string; subtotals: string[] }>> {
  const parsed = purchaseInput.safeParse(input); if (!parsed.success) return { status: "invalid" };
  return run(async (tx, tenantId) => {
    const ids = [...new Set(parsed.data.lines.map(l => l.productId))];
    if (await tx.product.count({ where: { tenantId, id: { in: ids } } }) !== ids.length) throw new Failure("invalid", "Artículo no disponible.");
    const { lines, total, net } = calculatePurchase(parsed.data);
    return { total: total.toFixed(2), net: net.toFixed(2), subtotals: lines.map(l => l.subtotal.toFixed(2)) };
  });
}
export async function savePurchase(input: unknown): Promise<PurchaseState> {
  const parsed = purchaseInput.safeParse(input); if (!parsed.success) return { status: "invalid", message: parsed.error.issues[0]?.message ?? "Revisá la compra." };
  const data = parsed.data;
  const result = await run(async (tx, tenantId, context) => {
    const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { currency: true } });
    if (tenant.currency && tenant.currency !== "ARS") throw new Failure("invalid", "Compras V1 admite únicamente ARS.");
    const documentReady = await purchaseDocumentReady(tx);
    if (data.document && !documentReady) throw new Failure("pending", "Comprobante, categoría e IVA requieren la migración adicional autorizada por separado. Podés guardar V1 sin esos campos.");
    const hash = digest({ ...data, revision: 0 });
    await tx.$queryRaw`SELECT id FROM purchases WHERE "tenantId"=${tenantId}::uuid AND id=${data.id}::uuid FOR UPDATE`;
    const old = await tx.purchase.findFirst({ where: { tenantId, id: data.id }, omit: legacyPurchaseOmit });
    if (old && data.revision === 0 && old.createHash === hash && old.createdById === context.profileId) return old.id;
    if ((old && (old.status !== "DRAFT" || old.revision !== data.revision)) || (!old && data.revision !== 0)) throw new Failure("conflict", "La compra cambió. Recargá el detalle antes de guardar.");
    const supplier = await tx.supplier.findFirst({ where: { tenantId, id: data.supplierId }, select: { id: true } });
    const branch = await tx.branch.findFirst({ where: { tenantId, id: data.branchId }, select: { id: true } });
    if (!supplier || !branch) throw new Failure("invalid", "Elegí proveedor y sucursal de tu empresa.");
    const oldLines = old ? await tx.purchaseLine.findMany({ where: { tenantId, purchaseId: old.id }, select: { productId: true } }) : [];
    const products = await productsLocked(tx, tenantId, [...oldLines.map(l => l.productId), ...data.lines.map(l => l.productId)]);
    await supplierMembership(tx, context);
    const { lines, total } = calculatePurchase(data);
    const fields = { supplierId: data.supplierId, branchId: data.branchId, date: new Date(data.date + "T00:00:00.000Z"), reference: data.reference || null, notes: data.notes || null, total,
      ...(documentReady ? { documentType: data.document?.type || null, pointOfSale: data.document?.pointOfSale || null, documentNumber: data.document?.number || null, purchaseCategory: data.document?.category || null, taxAmount: data.document?.taxAmount == null ? null : new Prisma.Decimal(data.document.taxAmount) } : {}),
    };
    if (old) {
      await tx.purchaseLine.deleteMany({ where: { tenantId, purchaseId: old.id } });
      await tx.purchase.update({ where: { id: old.id }, data: { ...fields, revision: { increment: 1 } }, select: { id: true } });
    } else {
      const counter = await tx.purchaseCounter.upsert({ where: { tenantId }, create: { tenantId, lastNumber: 1 }, update: { lastNumber: { increment: 1 } } });
      await tx.purchase.create({ data: { id: data.id, tenantId, commercialNumber: counter.lastNumber, createdById: context.profileId, createHash: hash, ...fields }, select: { id: true } });
    }
    // One insert, with the same tenant-aware rows, snapshots and database triggers.
    // All product locks have already been acquired in stable order above.
    await tx.purchaseLine.createMany({ data: lines.map((line, position) => {
      const product = products.find(p => p.id === line.productId)!;
      if (product.baseUnitCode !== line.baseUnitCode) throw new Failure("conflict", "La unidad del artículo cambió. Volvé a seleccionarlo.");
      return { id: line.id, tenantId, purchaseId: data.id, branchId: data.branchId, productId: line.productId, position, sku: product.sku, name: product.name, baseUnitCode: product.baseUnitCode, quantity: line.quantity, unitCost: line.unitCost, subtotal: line.subtotal };
    }) });
    await audit(tx, tenantId, context.profileId, data.id, old ? "PURCHASE_UPDATED" : "PURCHASE_CREATED");
    return data.id;
  });
  return result.status === "ok" ? { status: "saved", id: result.data, message: "Borrador guardado. El stock no cambió." } : { status: result.status === "missing" ? "invalid" : result.status, message: result.message ?? "No se pudo guardar la compra." };
}
export async function receivePurchase(input: unknown): Promise<PurchaseState> {
  const parsed = receiveInput.safeParse(input); if (!parsed.success) return { status: "invalid", message: "Confirmá la recepción de un borrador vigente." };
  const data = parsed.data;
  const result = await run(async (tx, tenantId, context) => {
    await tx.$queryRaw`SELECT id FROM purchases WHERE "tenantId"=${tenantId}::uuid AND id=${data.id}::uuid FOR UPDATE`;
    const p = await tx.purchase.findFirst({ where: { tenantId, id: data.id }, include: { lines: { orderBy: { position: "asc" } }, supplier: true }, omit: legacyPurchaseOmit });
    if (!p) throw new Failure("missing", "Compra no disponible.");
    const hash = digest({ id: data.id, revision: data.revision, actor: context.profileId });
    if (p.status === "RECEIVED") {
      if (p.receiveOperationId === data.operationId && p.receiveHash !== hash) throw new Failure("conflict", "El identificador de recepción corresponde a otra solicitud.");
      return p.id;
    }
    if (p.revision !== data.revision) throw new Failure("conflict", "El borrador cambió. Revisalo antes de recibir.");
    const products = await productsLocked(tx, tenantId, p.lines.map(l => l.productId));
    await supplierMembership(tx, context);
    const document = await purchaseDocumentReady(tx) ? await readPurchaseDocument(tx, tenantId, p.id) : undefined;
    const calculated = calculatePurchase({ id: p.id, revision: p.revision, supplierId: p.supplierId, branchId: p.branchId, date: p.date.toISOString().slice(0, 10), reference: p.reference ?? "", notes: p.notes ?? "", document, lines: p.lines.map(l => ({ id: l.id, productId: l.productId, baseUnitCode: l.baseUnitCode, quantity: l.quantity.toFixed(0), unitCost: l.unitCost.toFixed(2) })) });
    if (!calculated.total.eq(p.total) || !p.lines.length || p.lines.length > 100) throw new Failure("invalid", "Los renglones requieren revisión.");
    for (const product of products) {
      const lines = p.lines.filter(l => l.productId === product.id);
      if (lines.some(l => l.baseUnitCode !== product.baseUnitCode)) throw new Failure("conflict", "La unidad del artículo cambió.");
      const delta = lines.reduce((sum, l) => sum.plus(l.quantity), new Prisma.Decimal(0));
      const key = { tenantId, branchId: p.branchId, productId: product.id };
      const balance = await tx.stockBalance.findUnique({ where: { tenantId_branchId_productId: key } });
      const next = (balance?.quantityOnHand ?? new Prisma.Decimal(0)).plus(delta);
      if (!next.isFinite() || next.gt(maxStock)) throw new Failure("invalid", "La recepción supera el saldo máximo de inventario.");
      for (const line of lines) await tx.stockMovement.create({ data: { tenantId, branchId: p.branchId, productId: product.id, movementType: "PURCHASE_RECEIPT", quantityDelta: line.quantity, purchaseLineId: line.id, sourceReference: code(p.commercialNumber), actorUserId: context.profileId } });
      await tx.stockBalance.upsert({ where: { tenantId_branchId_productId: key }, create: { ...key, quantityOnHand: delta }, update: { quantityOnHand: { increment: delta } } });
    }
    await tx.purchase.update({ where: { id: p.id }, data: { status: "RECEIVED", revision: { increment: 1 }, receivedAt: new Date(), receivedById: context.profileId, receiveOperationId: data.operationId, receiveHash: hash, supplierSnapshot: supplierLabel(p.supplier) }, select: { id: true } });
    await audit(tx, tenantId, context.profileId, p.id, "PURCHASE_RECEIVED");
    return p.id;
  });
  return result.status === "ok" ? { status: "saved", id: result.data, message: "Compra recibida. La recepción quedó registrada una sola vez." } : { status: result.status === "missing" ? "invalid" : result.status, message: result.message ?? "No se pudo confirmar la recepción." };
}
export async function listPurchases(input: unknown) {
  const parsed = purchaseQuery.safeParse(input); if (!parsed.success) return { status: "invalid" as const };
  return run(async (tx, tenantId) => {
    const { q, status, branch, page } = parsed.data;
    const branches = await tx.branch.findMany({ where: { tenantId }, select: { id: true, name: true }, orderBy: [{ name: "asc" }, { id: "asc" }] });
    if (branch && !branches.some(b => b.id === branch)) throw new Failure("invalid", "Sucursal no disponible.");
    const documentReady = await purchaseDocumentReady(tx);
    const match = /^CP0*([1-9][0-9]{0,8})$/i.exec(q);
    const where: Prisma.PurchaseWhereInput = { tenantId, ...(status ? { status } : {}), ...(branch ? { branchId: branch } : {}), ...(q ? { OR: [...(documentReady ? [{ documentNumber: { contains: q } }, { purchaseCategory: { contains: q, mode: "insensitive" as const } }] : []), { reference: { contains: q, mode: "insensitive" } }, { supplier: { OR: [{ legalName: { contains: q, mode: "insensitive" } }, { commercialName: { contains: q, mode: "insensitive" } }] } }, { supplierSnapshot: { contains: q, mode: "insensitive" } }, ...(match ? [{ commercialNumber: Number(match[1]) }] : [])] } : {}) };
    const total = await tx.purchase.count({ where }), pages = Math.max(1, Math.ceil(total / 25)), current = Math.min(page, pages);
    const rows = await tx.purchase.findMany({ where, select: { id: true, commercialNumber: true, date: true, status: true, supplierSnapshot: true, reference: true, total: true, supplier: { select: { commercialNumber: true, legalName: true, commercialName: true } }, branch: { select: { name: true } } }, take: 25, skip: (current - 1) * 25, orderBy: [{ date: "desc" }, { id: "asc" }] });
    const documents = documentReady ? await readPurchaseDocuments(tx, tenantId, rows.map(p => p.id)) : new Map<string, PurchaseInput["document"]>();
    return { ...parsed.data, documentReady, page: current, total, pages, branches, items: rows.map(p => ({ id: p.id, code: code(p.commercialNumber), date: p.date.toISOString().slice(0, 10), status: p.status, supplier: p.supplierSnapshot ?? supplierLabel(p.supplier), branch: p.branch.name, reference: p.reference, document: documents.get(p.id), total: p.total.toFixed(2) })) };
  });
}
export async function purchaseWorkspaceAccess() { return run(async () => null); }
