import { z } from "zod";
const text = (max: number) => z.string().trim().max(max).refine(v => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v), "El texto contiene caracteres inválidos.");
export const purchaseLineInput = z.strictObject({
  id: z.uuid(), productId: z.uuid(), baseUnitCode: text(100).min(1),
  quantity: z.string().regex(/^[0-9]{1,15}$/, "Usá cantidades enteras en unidad base.").refine(v => /[1-9]/.test(v), "La cantidad debe ser positiva."),
  unitCost: z.string().regex(/^\d{1,16}(?:\.\d{1,2})?$/, "Ingresá un costo válido, incluso si es cero."),
});
export const documentInput = z.strictObject({
  type: z.enum(["", "FA", "FB", "FC", "OTRO"]),
  pointOfSale: z.string().regex(/^[0-9]{0,5}$/),
  number: z.string().regex(/^[0-9]{0,8}$/),
  category: text(100).refine(v => !/[\r\n]/.test(v)),
  taxAmount: z.string().regex(/^\d{1,16}(?:\.\d{1,2})?$/, "Ingresá el IVA del comprobante, incluso si es cero.").nullable(),
});
export const purchaseInput = z.strictObject({
  id: z.uuid(), revision: z.number().int().min(0).max(2147483646), supplierId: z.uuid(), branchId: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(v + "T00:00:00.000Z"); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v && v >= "1900-01-01" && v <= "9999-12-31"; }, "Revisá la fecha."),
  reference: text(200).refine(v => !/[\r\n]/.test(v)), notes: text(2000),
  lines: z.array(purchaseLineInput).min(1, "Agregá al menos un artículo.").max(100).refine(lines => new Set(lines.map(l => l.id)).size === lines.length, "Hay renglones duplicados."),
  document: documentInput.optional().transform(d => d && (d.type || d.pointOfSale || d.number || d.category || d.taxAmount !== null) ? d : undefined),
});
export const receiveInput = z.strictObject({ id: z.uuid(), revision: z.number().int().positive(), operationId: z.uuid(), confirmation: z.literal("RECEIVE") });
export const purchaseQuery = z.strictObject({ q: text(100).default(""), page: z.coerce.number().int().min(1).max(999999).default(1), status: z.enum(["", "DRAFT", "RECEIVED"]).default(""), branch: z.union([z.uuid(), z.literal("")]).default("") });
export const lookupInput = z.strictObject({ kind: z.enum(["products", "suppliers"]), q: text(100) });
export type PurchaseInput = Omit<z.infer<typeof purchaseInput>, "document"> & { document?: z.infer<typeof documentInput> };
