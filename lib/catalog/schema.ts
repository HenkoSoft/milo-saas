import { z } from "zod";

const text = (max: number) => z.string().trim().max(max).refine(v => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v));
const line = (max: number) => text(max).min(1).refine(v => !/[\r\n\t]/u.test(v));
const optionalId = z.union([z.uuid(), z.literal("")]).transform(v => v || null);
const version = z.iso.datetime({ precision: 3 });
const productFields = {
  sku: line(100), name: line(200), description: text(5000),
  categoryId: optionalId, brandId: optionalId,
  isPublished: z.enum(["true", "false"]).transform(v => v === "true"),
};
export const categoryCreate = z.strictObject({ name: line(200) });
export const categoryEdit = categoryCreate.extend({ id: z.uuid(), version });
export const productCreate = z.strictObject({
  ...productFields, baseUnitCode: line(100),
  // No implicit default or inference from units. This only stores the existing flag.
  allowsFractionalQuantity: z.enum(["true", "false"]).transform(v => v === "true"),
});
export const productEdit = z.strictObject({ ...productFields, id: z.uuid(), version });
export const listQuery = z.strictObject({
  q: text(100).default(""), page: z.string().regex(/^[1-9][0-9]{0,5}$/).transform(Number).default(1),
});
export const resourceId = z.uuid();

export function parseForm<T extends z.ZodType>(schema: T, form: unknown) {
  if (!(form instanceof FormData)) return null;
  const input: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of form.entries()) {
    if (key.startsWith("$ACTION_")) continue;
    if (Object.hasOwn(input, key)) return null;
    Object.defineProperty(input, key, { value, enumerable: true });
  }
  return schema.safeParse(input);
}
