import { z } from "zod";

export const inventoryId = z.uuid();
export const inventoryQuery = z.strictObject({
  branch: z.union([z.uuid(), z.literal("")]).default(""),
  q: z.string().trim().max(100).refine(v => !/[\u0000-\u001f\u007f]/u.test(v)).default(""),
  page: z.string().regex(/^[1-9][0-9]{0,5}$/).transform(Number).default(1),
});
export const receiptInput = z.strictObject({
  requestId: z.uuid(), branchId: z.uuid(), productId: z.uuid(),
  baseUnitCode: z.string().min(1).max(100),
  // Integer base-unit receipts are explicitly defined by the requested 10 -> 10
  // flow. Fractional input and conversions remain unavailable.
  quantity: z.string().trim().regex(/^[0-9]{1,15}$/, "Ingresá una cantidad entera en unidad base, sin separadores.").refine(v => /[1-9]/.test(v), "La cantidad debe ser mayor a cero."),
  sourceReference: z.string().trim().max(200).refine(v => !/[\u0000-\u001f\u007f]/u.test(v)).default("").transform(v => v || null),
});
export const adjustmentInput = receiptInput.extend({
  direction: z.enum(["add", "subtract"]),
  reason: z.string().trim().min(1).max(1000).refine(v => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v)),
});
export function parseOperation(form: unknown, adjustment: boolean) {
  if (!(form instanceof FormData)) return null;
  const fields: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of form.entries()) {
    if (key.startsWith("$ACTION_")) continue;
    if (Object.hasOwn(fields, key)) return null;
    Object.defineProperty(fields, key, { value, enumerable: true });
  }
  if (adjustment) return adjustmentInput.safeParse(fields);
  return receiptInput.safeParse(fields);
}
