import type { ManagedPresentation } from "./types";

// There is no primary-presentation field in the model. Never guess among candidates.
export function resolveQuickSale(product: { baseUnitCode: string; baseUnitDimensionCode: string; allowsFractionalQuantity: boolean }, presentations: ManagedPresentation[]) {
  if (product.baseUnitCode !== "UN" || product.baseUnitDimensionCode !== "COUNT" || product.allowsFractionalQuantity)
    return { kind: "advanced" as const, reason: "Este producto tiene una configuración especial. Administrá sus precios en Opciones avanzadas." };
  const candidates = presentations.filter(p => p.unitCode === "UN" && p.factor === "1.000");
  if (candidates.length > 1) return { kind: "advanced" as const, reason: "Hay varias presentaciones individuales. Elegí cuál editar en Opciones avanzadas." };
  if (candidates[0] && !candidates[0].isEnabled) return { kind: "advanced" as const, reason: "La presentación individual está deshabilitada. Podés administrarla en Opciones avanzadas." };
  if (candidates[0]?.price?.startsWith("-")) return { kind: "advanced" as const, reason: "El precio existente requiere revisión en Opciones avanzadas." };
  return { kind: "available" as const, presentation: candidates[0] };
}
