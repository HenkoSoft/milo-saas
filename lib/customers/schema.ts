import { z } from "zod";

const line = (max: number) => z.string().trim().max(max).refine(v => !/[\u0000-\u001f\u007f]/u.test(v), "No se admiten saltos de línea ni caracteres de control.");
const fields = {
  name: line(200).min(1, "Ingresá el nombre del cliente."),
  email: line(254).pipe(z.union([z.literal(""), z.email()])).default(""),
  phone: line(50).default(""),
  address: line(400).default(""),
};
export const customerCreate = z.strictObject(fields);
export const customerEdit = customerCreate.extend({ id: z.uuid(), version: z.iso.datetime({ precision: 3 }) });
export const customerContact = customerCreate.extend({ schemaVersion: z.literal(1) });
export const customerId = z.uuid();
export const customerQuery = z.strictObject({ q: line(100).default(""), page: z.string().regex(/^[1-9][0-9]{0,5}$/).transform(Number).default(1) });

export function parseCustomerForm<T extends z.ZodType>(schema: T, form: unknown) {
  if (!(form instanceof FormData)) return null;
  const input: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of form.entries()) {
    if (key.startsWith("$ACTION_")) continue;
    if (Object.hasOwn(input, key)) return null;
    Object.defineProperty(input, key, { value, enumerable: true });
  }
  return schema.safeParse(input);
}
