// Exact strings only: never round money through JavaScript Number.
export function formatPrice(value: string): string {
  const match = /^(\d{1,16})(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return value;
  const whole = match[1].replace(/^0+(?=\d)/, "");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${(match[2] ?? "").padEnd(2, "0")}`;
}

export function parsePrice(value: string): string | null {
  const text = value.trim();
  if (!text) return "";
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(text)) return null;
  const canonical = text.replace(/\./g, "").replace(",", ".");
  return /^\d{1,16}(?:\.\d{1,2})?$/.test(canonical) ? canonical : null;
}

export function formatEnteredPrice(value: string): string {
  const canonical = parsePrice(value);
  return canonical === null || canonical === "" ? value : formatPrice(canonical);
}
