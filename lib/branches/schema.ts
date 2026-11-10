import { z } from "zod";

const name = z.string().trim().min(1, "Ingresá el nombre de la sucursal.").max(200, "El nombre admite hasta 200 caracteres.")
  .refine(v => !/[\u0000-\u001f\u007f]/u.test(v), "El nombre no admite saltos de línea ni caracteres de control.");
export const branchCreate = z.strictObject({ name });
export const branchEdit = branchCreate.extend({ id: z.uuid(), version: z.iso.datetime({ precision: 3 }) });
export const branchId = z.uuid();
export const branchQuery = z.strictObject({
  q: z.string().trim().max(100).refine(v => !/[\u0000-\u001f\u007f]/u.test(v)).default(""),
  page: z.string().regex(/^[1-9][0-9]{0,5}$/).transform(Number).default(1),
});
export function parseBranchForm<T extends z.ZodType>(schema: T, form: unknown) {
  if (!(form instanceof FormData)) return null;
  const input: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of form.entries()) {
    if (key.startsWith("$ACTION_")) continue;
    if (Object.hasOwn(input, key)) return null;
    Object.defineProperty(input, key, { value, enumerable: true });
  }
  return schema.safeParse(input);
}
