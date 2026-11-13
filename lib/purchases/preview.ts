// UI estimate only. Saving and receiving always validate and recalculate in server Decimal.
// Integer cents preserve the monetary contract without rounding or coercing empty fields.
const maximum = BigInt("999999999999999999");
function cents(value: string): bigint | null {
  const match = /^(\d{1,16})(?:\.(\d{1,2}))?$/.exec(value);
  return match ? BigInt(match[1]) * BigInt(100) + BigInt((match[2] ?? "").padEnd(2, "0")) : null;
}
function canonical(value: bigint) {
  return `${value / BigInt(100)}.${String(value % BigInt(100)).padStart(2, "0")}`;
}
export function previewPurchase(lines: readonly { quantity: string; unitCost: string }[], taxAmount: string | null = null) {
  if (!lines.length || lines.length > 100) return null;
  let net = BigInt(0);
  const subtotals: string[] = [];
  for (const line of lines) {
    if (!/^\d{1,15}$/.test(line.quantity) || !/[1-9]/.test(line.quantity)) return null;
    const cost = cents(line.unitCost);
    if (cost === null) return null;
    const subtotal = BigInt(line.quantity) * cost;
    if (subtotal > maximum) return null;
    net += subtotal;
    subtotals.push(canonical(subtotal));
  }
  const tax = taxAmount === null ? BigInt(0) : cents(taxAmount);
  if (tax === null || net + tax > maximum) return null;
  return { net: canonical(net), total: canonical(net + tax), subtotals };
}
