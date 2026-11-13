import { z } from "zod";
import { commercialFieldLimits, vatConditions } from "./commercial-fields";

const line = (limit: number) => z.string().trim().max(limit).refine(v => !/[\u0000-\u001f\u007f]/u.test(v));
export function validDocument(type: string, number: string): boolean {
  if (!type && !number) return true;
  if (type === "DNI") return /^[0-9]{1,8}$/.test(number) && /[1-9]/.test(number);
  if (type !== "CUIT" || !/^[0-9]{11}$/.test(number) || !/[1-9]/.test(number)) return false;
  const sum = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2].reduce((total, weight, i) => total + weight * Number(number[i]), 0);
  return (11 - sum % 11) % 11 === Number(number[10]);
}
const optionalLine = (limit: number) => line(limit).default("");
const fields = Object.fromEntries(Object.entries(commercialFieldLimits).map(([key, limit]) => [key, optionalLine(limit)])) as Record<keyof typeof commercialFieldLimits, ReturnType<typeof optionalLine>>;
const base = z.strictObject({
  ...fields,
  profileMode: z.literal("extended"),
  documentType: z.enum(["", "DNI", "CUIT"]).default(""),
  documentNumber: line(20).regex(/^[0-9. -]*$/).transform(v => v.replace(/[. -]/g, "")).default(""),
  vatCondition: line(2).refine(v => !v || vatConditions.some(([code]) => code === v)).default(""),
  internalNotes: z.string().trim().max(2000).refine(v => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v)).default(""),
});
const validate = (data: z.infer<typeof base>, ctx: z.RefinementCtx) => {
  if (data.email && !z.email().safeParse(data.email).success) ctx.addIssue({ code: "custom", path: ["email"], message: "Ingresá un correo válido." });
  if (!validDocument(data.documentType, data.documentNumber)) ctx.addIssue({ code: "custom", path: ["documentNumber"], message: "Documento inválido: revisá el tipo, número y dígito verificador del CUIT." });
};
export const commercialCreate = base.superRefine((data, ctx) => {
  validate(data, ctx);
  if (!data.legalName && !data.contactName) ctx.addIssue({ code: "custom", path: ["legalName"], message: "Completá la razón social o el nombre de contacto." });
});
export const commercialEdit = base.extend({ id: z.uuid(), version: z.iso.datetime({ precision: 3 }) }).superRefine(validate);
export const customerDelete = z.strictObject({ id: z.uuid(), version: z.iso.datetime({ precision: 3 }), confirmation: z.literal("DELETE") });
