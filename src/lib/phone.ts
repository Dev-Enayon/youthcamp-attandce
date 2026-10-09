/**
 * Nigerian phone number handling.
 *
 * Accepts the common ways a participant might type a number and normalises it
 * to E.164 (`+234XXXXXXXXXX`). We deliberately accept multiple Nigerian mobile
 * prefixes (070/080/081/090/091…) instead of assuming one fixed format.
 */

const NIGERIAN_NSN = /^[789]\d{9}$/;

export function normalizeNigerianPhone(raw: string): string | null {
  if (typeof raw !== "string") return null;
  let value = raw.trim();
  if (!value) return null;

  value = value.replace(/[\s().-]/g, "");
  if (value.startsWith("+")) value = value.slice(1);
  value = value.replace(/\D/g, "");

  if (value.startsWith("00")) value = value.slice(2);
  if (value.startsWith("234")) value = value.slice(3);

  // National trunk prefix.
  if (value.startsWith("0")) value = value.slice(1);

  if (!NIGERIAN_NSN.test(value)) return null;
  return `+234${value}`;
}

export function isValidNigerianPhone(raw: string): boolean {
  return normalizeNigerianPhone(raw) !== null;
}
