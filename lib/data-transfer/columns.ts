export type TransferKind = "clientes" | "proveedores";
export type TransferRow = Record<string, string>;
export const limits = { file: 5 * 1024 * 1024, expanded: 32 * 1024 * 1024, entries: 256, importRows: 500, exportRows: 5000 } as const;
export const columns = {
  clientes: [["code", "Código"], ["legalName", "Razón social"], ["contactName", "Nombre de contacto"], ["documentType", "Tipo de documento"], ["documentNumber", "Número de documento"], ["vatCondition", "Condición frente al IVA"], ["phone", "Teléfono"], ["mobilePhone", "Celular"], ["whatsapp", "WhatsApp"], ["email", "Correo electrónico"], ["instagram", "Instagram"], ["address", "Dirección"], ["postalCode", "Código postal"], ["city", "Localidad"], ["province", "Provincia"], ["country", "País"], ["internalNotes", "Observaciones internas"], ["legacyName", "Nombre registrado"]],
  proveedores: [["code", "Código"], ["legalName", "Razón social"], ["commercialName", "Nombre comercial"], ["cuit", "CUIT"], ["vatCondition", "Condición frente al IVA"], ["contactName", "Contacto"], ["phone", "Teléfono"], ["whatsapp", "WhatsApp"], ["email", "Correo electrónico"], ["address", "Dirección"], ["postalCode", "Código postal"], ["city", "Localidad"], ["province", "Provincia"], ["country", "País"], ["internalNotes", "Observaciones internas"]],
} as const;
export const moduleTitle = (kind: TransferKind) => kind === "clientes" ? "Clientes" : "Proveedores";
export type PreviewLine = { row: number; status: "new" | "skip" | "error"; name: string; message: string };
export type ImportPreview = { fingerprint: string; total: number; created: number; skipped: number; errors: number; lines: PreviewLine[] };
