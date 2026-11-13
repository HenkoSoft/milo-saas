export { vatConditions } from "../customers/commercial-fields";
export const supplierFieldLimits = {
  legalName: 200, commercialName: 200, contactName: 200, phone: 50, whatsapp: 50,
  email: 254, address: 400, postalCode: 20, city: 100, province: 100, country: 100,
} as const;
export type SupplierFields = Record<keyof typeof supplierFieldLimits, string> & { cuit: string; vatCondition: string; internalNotes: string };
export function emptySupplierFields(): SupplierFields {
  return { legalName: "", commercialName: "", contactName: "", phone: "", whatsapp: "", email: "", address: "", postalCode: "", city: "", province: "", country: "", cuit: "", vatCondition: "", internalNotes: "" };
}
