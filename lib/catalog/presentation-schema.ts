import { z } from "zod";

function exactDecimal(scale: number, integerDigits: number, label: string, allowZero = false) {
  const pattern = new RegExp(`^[0-9]{1,${integerDigits}}(?:[.,][0-9]{1,${scale}})?$`);
  return z.string().trim().refine(v => pattern.test(v), `${label}: usá hasta ${integerDigits} enteros y ${scale} decimales, sin miles ni notación exponencial.`)
    .refine(v => allowZero || /[1-9]/.test(v), `${label}: el valor debe ser mayor a cero.`)
    .transform(v => v.replace(",", "."));
}
const text = z.string().trim().min(1, "Ingresá un nombre.").max(200, "El nombre admite hasta 200 caracteres.").refine(v => !/[\u0000-\u001f\u007f]/u.test(v), "El nombre no admite controles o saltos de línea.");
const base = { productId: z.uuid(), productVersion: z.iso.datetime({ precision: 3 }) };
export const saleAmount = exactDecimal(2, 16, "Precio", true);
export const presentationCreate = z.strictObject({
  ...base, name: text, unitCode: z.string().min(1).max(100),
  factor: exactDecimal(3, 15, "Factor"), isEnabled: z.enum(["true", "false"]).transform(v => v === "true"),
});
export const presentationEdit = presentationCreate.extend({ id: z.uuid(), version: z.iso.datetime({ precision: 3 }) });
export const priceInput = z.strictObject({
  ...base, id: z.uuid(), version: z.iso.datetime({ precision: 3 }),
  priceVersion: z.union([z.iso.datetime({ precision: 3 }), z.literal("")]),
  currency: z.string().min(1).max(3), amount: saleAmount,
});
