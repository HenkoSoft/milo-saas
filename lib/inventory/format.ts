/** Display only: input is the canonical database decimal, never localized text.
 * Keep the fractional digits as text to avoid floating-point rounding.
 * Formatting does not enable fractional writes or perform unit conversions.
 */
export function formatInventoryQuantity(
  value: string | null,
  product: { unit: string; allowsFractionalQuantity?: boolean },
): string {
  if (value === null) return "Sin saldo registrado";
  const match = /^(-?)(\d{1,15})(?:\.(\d{1,3}))?$/.exec(value);
  if (!match) return "Cantidad no válida";
  const [, sign, whole, decimal = ""] = match;
  const fraction = decimal.replace(/0+$/, "");
  const integer = BigInt(whole);
  const negative = sign && (integer !== BigInt(0) || fraction) ? "-" : "";
  const formatted = `${negative}${integer.toLocaleString("es-AR")}${fraction ? `,${fraction}` : ""}`;
  // Never hide or round an unexpected fractional balance in an integer unit.
  return fraction && (product.unit === "UN" || product.allowsFractionalQuantity !== true)
    ? `${formatted} (fracción no habilitada)`
    : formatted;
}
