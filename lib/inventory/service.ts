import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPanelAccess, type PanelContext } from "@/lib/panel/access";
import { canReadInventory, canWriteInventory } from "./permission";
import { inventoryId, inventoryQuery, parseOperation } from "./schema";
import type { InventoryHistory, InventoryList, InventoryResult, ReceiptState } from "./types";

class Denied extends Error {}
class Missing extends Error {}
class ReceiptConflict extends Error {}
class QuantityOverflow extends Error {}
class InsufficientStock extends Error {}
class SchemaPending extends Error {}
async function operationsReady(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<{ ready: boolean }[]>`SELECT
    (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_movements' AND
      ((column_name='reason' AND data_type='character varying' AND character_maximum_length=1000) OR
       (column_name='sourceReference' AND data_type='character varying' AND character_maximum_length=200)))=2
    AND (SELECT count(*) FROM pg_constraint WHERE conrelid='public.stock_movements'::regclass AND contype='c' AND convalidated
      AND conname IN ('stock_movements_manual_receipt_check','stock_movements_manual_adjustment_check'))=2 AS ready`;
  return rows.length === 1 && rows[0].ready === true;
}
async function membership(tx: Prisma.TransactionClient, context: PanelContext, write = false) {
  const p = await tx.userProfile.findUnique({ where: { authUserId: context.authUserId }, select: { id: true, tenantId: true } });
  if (!p || p.id !== context.profileId || p.tenantId !== context.tenant.id) throw new Denied();
  const rows = await tx.userRoleAssignment.findMany({
    where: { tenantId: p.tenantId, userProfileId: p.id, role: { code: { in: write ? ["OWNER", "ADMIN", "WAREHOUSE"] : ["OWNER", "ADMIN", "WAREHOUSE", "MANAGER"] } } },
    select: { tenantId: true, userProfileId: true, assignmentScope: true, branchId: true, role: { select: { code: true, assignmentScope: true } }, branch: { select: { id: true, tenantId: true } } },
  });
  let company = false;
  const branches = new Set<string>();
  for (const a of rows) {
    if (a.tenantId !== p.tenantId || a.userProfileId !== p.id || a.assignmentScope !== a.role.assignmentScope) throw new Denied();
    if (["OWNER", "ADMIN"].includes(a.role.code)) {
      if (a.assignmentScope !== "COMPANY" || a.branchId !== null || a.branch !== null) throw new Denied();
      company = true;
    } else if (a.role.code === "WAREHOUSE" || (!write && a.role.code === "MANAGER")) {
      if (a.assignmentScope !== "BRANCH" || !a.branch || a.branchId !== a.branch.id || a.branch.tenantId !== p.tenantId) throw new Denied();
      branches.add(a.branch.id);
    } else throw new Denied();
  }
  if (!company && !branches.size) throw new Denied();
  return { tenantId: p.tenantId, branchIds: company ? null : [...branches] };
}
async function read<T>(run: (tx: Prisma.TransactionClient, scope: { tenantId: string; branchIds: string[] | null }) => Promise<T>): Promise<InventoryResult<T>> {
  const access = await getPanelAccess();
  if (access.status !== "allowed" || !canReadInventory(access.context)) return { status: "forbidden" };
  try {
    const data = await prisma.$transaction(async tx => run(tx, await membership(tx, access.context)), { isolationLevel: "RepeatableRead" });
    return { status: "ok", data };
  } catch (e) { return { status: e instanceof Denied ? "forbidden" : e instanceof Missing ? "missing" : "error" }; }
}
export async function listInventory(query: unknown): Promise<InventoryResult<InventoryList>> {
  const parsed = inventoryQuery.safeParse(query); if (!parsed.success) return { status: "invalid" };
  return read(async (tx, { tenantId, branchIds }) => {
    const { branch: branchId, q, page } = parsed.data;
    const branches = await tx.branch.findMany({ where: { tenantId, ...(branchIds ? { id: { in: branchIds } } : {}) }, select: { id: true, name: true }, orderBy: [{ name: "asc" }, { id: "asc" }] });
    const ready = await operationsReady(tx);
    const branch = branches.find(b => b.id === branchId) ?? null;
    if (branchId && !branch) throw new Missing();
    if (!branch) return { branches, branch: null, operationsReady: ready, items: [], total: 0, pages: 1, page: 1, q };
    const where = { tenantId, ...(q ? { OR: [{ sku: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } }] } : {}) };
    const total = await tx.product.count({ where }), pages = Math.max(1, Math.ceil(total / 25)), current = Math.min(page, pages);
    const products = await tx.product.findMany({ where, select: { id: true, name: true, sku: true, baseUnitCode: true, allowsFractionalQuantity: true }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 25, skip: (current - 1) * 25 });
    const balances = await tx.stockBalance.findMany({ where: { tenantId, branchId: branch.id, productId: { in: products.map(p => p.id) } }, select: { productId: true, quantityOnHand: true } });
    const amounts = new Map(balances.map(b => [b.productId, b.quantityOnHand.toFixed(3)]));
    return { branches, branch, operationsReady: ready, total, pages, page: current, q, items: products.map(p => ({ id: p.id, name: p.name, sku: p.sku, unit: p.baseUnitCode, allowsFractionalQuantity: p.allowsFractionalQuantity, quantity: amounts.get(p.id) ?? null })) };
  });
}
export async function inventoryHistory(id: string, query: unknown): Promise<InventoryResult<InventoryHistory>> {
  const parsed = inventoryQuery.safeParse(query);
  if (!inventoryId.safeParse(id).success) return { status: "missing" };
  if (!parsed.success || !parsed.data.branch) return { status: "invalid" };
  return read(async (tx, { tenantId, branchIds }) => {
    if (branchIds && !branchIds.includes(parsed.data.branch)) throw new Missing();
    const branch = await tx.branch.findFirst({ where: { tenantId, id: parsed.data.branch }, select: { id: true, name: true } });
    if (!branch) throw new Missing();
    const product = await tx.product.findFirst({ where: { tenantId, id }, select: { id: true, name: true, sku: true, baseUnitCode: true, allowsFractionalQuantity: true } });
    if (!product) throw new Missing();
    const where = { tenantId, branchId: branch.id, productId: id };
    const ready = await operationsReady(tx);
    const total = await tx.stockMovement.count({ where }), pages = Math.max(1, Math.ceil(total / 25)), page = Math.min(parsed.data.page, pages);
    const [rows, balance, tenant] = await Promise.all([
      tx.stockMovement.findMany({ where, select: { id: true, movementType: true, quantityDelta: true, occurredAt: true, actorUserId: true, sourceOrderId: true, ...(ready ? { reason: true, sourceReference: true } : {}), actor: { select: { authUser: { select: { name: true } } } } }, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: 25, skip: (page - 1) * 25 }),
      tx.stockBalance.findUnique({ where: { tenantId_branchId_productId: where }, select: { quantityOnHand: true } }),
      tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { timeZone: true } }),
    ]);
    return { product: { id, name: product.name, sku: product.sku, unit: product.baseUnitCode, allowsFractionalQuantity: product.allowsFractionalQuantity }, branch, quantity: balance?.quantityOnHand.toFixed(3) ?? null, total, pages, page, timeZone: tenant.timeZone,
      movements: rows.map(m => ({ id: m.id, type: m.movementType, quantity: m.quantityDelta.toFixed(3), date: m.occurredAt.toISOString(), actorId: m.actorUserId, actorName: m.actor.authUser?.name ?? null, sourceOrderId: m.sourceOrderId, reason: m.reason ?? null, sourceReference: m.sourceReference ?? null })) };
  });
}

const receiptType = "MANUAL_RECEIPT";
const receiptSelect = { id: true, tenantId: true, branchId: true, productId: true, actorUserId: true, movementType: true, quantityDelta: true, sourceOrderId: true, reason: true, sourceReference: true } as const;
type OperationData = { requestId: string; branchId: string; productId: string; baseUnitCode: string; delta: Prisma.Decimal; type: string; reason: string | null; sourceReference: string | null };
function sameReceipt(row: Prisma.StockMovementGetPayload<{ select: typeof receiptSelect }>, data: OperationData, actorId: string) {
  return row.branchId === data.branchId && row.productId === data.productId && row.actorUserId === actorId && row.movementType === data.type && row.sourceOrderId === null && row.quantityDelta.eq(data.delta) && row.reason === data.reason && row.sourceReference === data.sourceReference;
}
async function receiptBranch(tx: Prisma.TransactionClient, context: PanelContext, branchId: string) {
  const scope = await membership(tx, context, true);
  if (scope.branchIds && !scope.branchIds.includes(branchId)) throw new Denied();
  if (!await tx.branch.findFirst({ where: { tenantId: scope.tenantId, id: branchId }, select: { id: true } })) throw new Denied();
  return scope.tenantId;
}
export async function recordReceipt(form: unknown): Promise<ReceiptState> {
  return recordOperation(form, false);
}
export async function recordAdjustment(form: unknown): Promise<ReceiptState> {
  return recordOperation(form, true);
}
async function recordOperation(form: unknown, adjustment: boolean): Promise<ReceiptState> {
  const parsed = parseOperation(form, adjustment);
  if (!parsed?.success) {
    const field = parsed?.error.issues[0]?.path[0];
    return { status: "invalid", message: field === "reason" ? "Ingresá el motivo real del ajuste, de hasta 1000 caracteres."
      : field === "direction" ? "Elegí si el ajuste suma o resta existencias."
      : field === "sourceReference" ? "La referencia admite hasta 200 caracteres, sin saltos de línea."
      : "Elegí sucursal y artículo válidos e ingresá una cantidad entera mayor a cero (hasta 15 dígitos). Fracciones y conversiones todavía no están habilitadas." };
  }
  const access = await getPanelAccess();
  if (access.status !== "allowed" || !canWriteInventory(access.context)) return { status: "forbidden", message: "No tenés permiso para modificar existencias en esta sucursal." };
  const input = parsed.data, context = access.context;
  const isAdjustment = "direction" in input && "reason" in input;
  const positive = new Prisma.Decimal(input.quantity);
  const data: OperationData = { requestId: input.requestId, branchId: input.branchId, productId: input.productId, baseUnitCode: input.baseUnitCode, sourceReference: input.sourceReference,
    type: isAdjustment ? "MANUAL_ADJUSTMENT" : receiptType, delta: isAdjustment && input.direction === "subtract" ? positive.negated() : positive, reason: isAdjustment && typeof input.reason === "string" ? input.reason : null };
  let stage = "transaction-start";
  let callbackCompleted = false;
  try {
    const result = await prisma.$transaction(async tx => {
      stage = "access-and-schema";
      await tx.$executeRaw`SET LOCAL lock_timeout='5s'`;
      const tenantId = await receiptBranch(tx, context, data.branchId);
      if (!await operationsReady(tx)) throw new SchemaPending();
      // One Product lock coordinates balance initialization, unit identity and
      // all receipts of the same article, including different branches.
      stage = "product-lock";
      const locked = await tx.$queryRaw<{ id: string; baseUnitCode: string }[]>`SELECT id,"baseUnitCode" FROM public.products WHERE "tenantId"=${tenantId}::uuid AND id=${data.productId}::uuid FOR UPDATE`;
      if (locked.length !== 1) throw new Denied();
      if (locked[0].baseUnitCode !== data.baseUnitCode) throw new ReceiptConflict();
      await receiptBranch(tx, context, data.branchId); // Recheck after any wait.
      stage = "idempotency-read";
      const existing = await tx.stockMovement.findFirst({ where: { tenantId, id: data.requestId }, select: receiptSelect });
      if (existing) {
        if (!sameReceipt(existing, data, context.profileId)) throw new ReceiptConflict();
        stage = "commit";
        callbackCompleted = true;
        return { movementId: existing.id, repeated: true };
      }
      const key = { tenantId, branchId: data.branchId, productId: data.productId };
      stage = "balance-read";
      const balance = await tx.stockBalance.findUnique({ where: { tenantId_branchId_productId: key }, select: { quantityOnHand: true } });
      // Only a new, locked receipt initializes a missing balance to its own
      // quantity. Consultation never silently invents zero balances.
      const quantity = data.delta;
      const next = balance ? balance.quantityOnHand.plus(quantity) : quantity;
      if (next.lt(0)) throw new InsufficientStock();
      if (!next.isFinite() || next.gt(new Prisma.Decimal("999999999999999.999"))) throw new QuantityOverflow();
      stage = "movement-create";
      await tx.stockMovement.create({ data: { id: data.requestId, ...key, actorUserId: context.profileId, movementType: data.type, quantityDelta: quantity, sourceOrderId: null, reason: data.reason, sourceReference: data.sourceReference }, select: { id: true } });
      stage = "balance-write";
      if (balance) await tx.stockBalance.update({ where: { tenantId_branchId_productId: key }, data: { quantityOnHand: { increment: quantity } } });
      else await tx.stockBalance.create({ data: { ...key, quantityOnHand: quantity } });
      stage = "audit-create";
      await tx.auditEvent.create({ data: { tenantId, actorUserId: context.profileId, action: isAdjustment ? "STOCK_MANUAL_ADJUSTMENT_RECORDED" : "STOCK_MANUAL_RECEIPT_RECORDED", entityType: "StockMovement", entityId: data.requestId } });
      stage = "commit";
      callbackCompleted = true;
      return { movementId: data.requestId, repeated: false };
    }, { isolationLevel: "ReadCommitted", maxWait: 5000, timeout: 20000 });
    return { status: "saved", message: result.repeated ? "Esta operación ya estaba registrada. No se duplicó el movimiento." : "Movimiento de inventario registrado.", ...result };
  } catch (e) {
    if (e instanceof Denied) return { status: "forbidden", message: "La sucursal o el artículo no están disponibles para tu cuenta. No se registró un ingreso nuevo." };
    if (e instanceof ReceiptConflict) return { status: "conflict", message: "Esta solicitud corresponde a otra operación. Consultá el historial antes de continuar." };
    if (e instanceof QuantityOverflow) return { status: "invalid", message: "La cantidad supera la capacidad de existencias del artículo. No se registró el ingreso." };
    if (e instanceof InsufficientStock) return { status: "invalid", message: "No hay existencias suficientes. No se permite stock negativo." };
    if (e instanceof SchemaPending) return { status: "blocked", message: "Los movimientos manuales están pendientes de activación en esta base. No se modificaron existencias." };
    reportFailure(data.requestId, stage, e);
    // A query validation failure before the callback completed cannot have
    // committed this transaction. Do not present an application defect as a
    // lost commit acknowledgement; keep the request ID unchanged in the form.
    if (!callbackCompleted && e instanceof Error && e.name === "PrismaClientValidationError") {
      return { status: "blocked", message: "El movimiento no se registró por un error de validación de la aplicación. Conservá la solicitud y pedí al administrador que revise el cliente de datos antes de continuar." };
    }
    // A uniqueness race or lost commit acknowledgement is reconciled only by
    // the same stable ID/payload. Never retry a write or generate a replacement.
    try {
      const found = await prisma.$transaction(async tx => {
        const tenantId = await receiptBranch(tx, context, data.branchId);
        if (!await operationsReady(tx)) return null;
        const product = await tx.product.findFirst({ where: { tenantId, id: data.productId }, select: { baseUnitCode: true } });
        if (product?.baseUnitCode !== data.baseUnitCode) return null;
        return tx.stockMovement.findFirst({ where: { tenantId, id: data.requestId }, select: receiptSelect });
      }, { isolationLevel: "RepeatableRead" });
      if (found) {
        if (!sameReceipt(found, data, context.profileId)) return { status: "conflict", message: "La solicitud ya identifica otra operación. Consultá el historial." };
        return { status: "saved", movementId: found.id, repeated: true, message: "Ingreso confirmado por su identificador. No se repitió la operación." };
      }
    } catch (reconciliationError) { reportFailure(data.requestId, "commit-reconciliation", reconciliationError); }
    return { status: "error", message: "No pudimos confirmar el resultado. Conservá esta solicitud y consultá el historial. Si reintentás, usá este mismo formulario; no abras una operación nueva." };
  }
}

function reportFailure(requestId: string, stage: string, error: unknown) {
  const code = error instanceof Error && error.name === "PrismaClientValidationError" ? "PRISMA_CLIENT_VALIDATION"
    : error && typeof error === "object" && "code" in error && typeof error.code === "string" && /^[A-Z0-9_]{1,50}$/.test(error.code) ? error.code : "UNEXPECTED_ERROR";
  // Correlate only a request identifier and an allowlisted code/stage. Never
  // log the provider message, SQL, credentials, actor, quantity or free text.
  console.error("MILO_INVENTORY_OPERATION_FAILURE", { requestId, stage, code });
}
