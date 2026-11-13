import { z } from "zod";
import { supplierFieldLimits, vatConditions } from "./fields";
import { validDocument } from "../customers/commercial-schema";
export { parseCustomerForm as parseSupplierForm } from "../customers/schema";

const line = (limit: number) => z.string().trim().max(limit).refine(v => !/[\u0000-\u001f\u007f]/u.test(v), "No se admiten saltos de línea ni caracteres de control.").default("");
const fields = Object.fromEntries(Object.entries(supplierFieldLimits).map(([key, limit]) => [key, line(limit)])) as Record<keyof typeof supplierFieldLimits, ReturnType<typeof line>>;
const base = z.strictObject({
  ...fields,
  cuit: z.string().trim().max(20).regex(/^[0-9. -]*$/, "Ingresá un CUIT válido.").transform(v => v.replace(/[. -]/g, "")).refine(v => !v || validDocument("CUIT", v), "CUIT inválido: revisá los once dígitos y el verificador.").default(""),
  vatCondition: z.string().trim().max(2).refine(v => !v || vatConditions.some(([code]) => code === v), "Condición frente al IVA inválida.").default(""),
  internalNotes: z.string().trim().max(2000).refine(v => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v), "Las observaciones contienen caracteres de control.").default(""),
});
const validate = (data: z.infer<typeof base>, ctx: z.RefinementCtx) => {
  if (!data.legalName && !data.commercialName) ctx.addIssue({ code: "custom", path: ["legalName"], message: "Completá la razón social o el nombre comercial." });
  if (data.email && !z.email().safeParse(data.email).success) ctx.addIssue({ code: "custom", path: ["email"], message: "Ingresá un correo válido." });
};
export const supplierId = z.uuid();
export const supplierCreate = base.superRefine(validate);
export const supplierEdit = base.extend({ id: supplierId, version: z.iso.datetime({ precision: 3 }) }).superRefine(validate);
export const supplierDelete = z.strictObject({ id: supplierId, version: z.iso.datetime({ precision: 3 }), confirmation: z.literal("DELETE") });
export const supplierQuery = z.strictObject({ q: z.string().trim().max(100).refine(v => !/[\u0000-\u001f\u007f]/u.test(v)).default(""), page: z.string().regex(/^[1-9][0-9]{0,5}$/).transform(Number).default(1) });
