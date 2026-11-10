import { z } from "zod";

// A bounded plain-text input, preserving Tenant's optional name contract.
// No address/contact JSON, IDs, roles, policies or other mutable fields accepted.
export const companyInputSchema = z.strictObject({
  commercialName: z.string({ error: "Ingresá un nombre comercial válido." }).trim()
    .max(200, "El nombre comercial admite hasta 200 caracteres.")
    .refine(value => !/[\u0000-\u001f\u007f]/u.test(value), "Usá un nombre sin saltos de línea ni caracteres de control.")
    .transform(value => value === "" ? null : value),
  version: z.iso.datetime({ precision: 3, error: "Volvé a cargar la página antes de guardar." }),
});

export function parseCompanyForm(form: unknown) {
  if (!(form instanceof FormData)) return null;
  const input: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of form.entries()) {
    if (key.startsWith("$ACTION_")) continue; // Next's own form transport metadata.
    if (Object.hasOwn(input, key)) return null;
    Object.defineProperty(input, key, { value, enumerable: true });
  }
  return companyInputSchema.safeParse(input);
}
