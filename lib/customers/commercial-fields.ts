export const vatConditions = [
  ["1", "IVA Responsable Inscripto"], ["4", "IVA Sujeto Exento"], ["5", "Consumidor Final"],
  ["6", "Responsable Monotributo"], ["7", "Sujeto No Categorizado"], ["8", "Proveedor del Exterior"],
  ["9", "Cliente del Exterior"], ["10", "IVA Liberado — Ley 19.640"], ["13", "Monotributista Social"],
  ["15", "IVA No Alcanzado"], ["16", "Monotributo Trabajador Independiente Promovido"],
] as const;

export const commercialFieldLimits = {
  legalName: 200, contactName: 200, phone: 50, mobilePhone: 50, whatsapp: 50,
  email: 254, instagram: 100, address: 400, postalCode: 20, city: 100, province: 100, country: 100,
} as const;
export type CommercialFields = Record<keyof typeof commercialFieldLimits, string> & {
  documentType: string; documentNumber: string; vatCondition: string; internalNotes: string;
};
export function emptyCommercialFields(): CommercialFields {
  return { legalName: "", contactName: "", phone: "", mobilePhone: "", whatsapp: "", email: "", instagram: "", address: "", postalCode: "", city: "", province: "", country: "", documentType: "", documentNumber: "", vatCondition: "", internalNotes: "" };
}
