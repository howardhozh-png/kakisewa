/**
 * Normalise a Malaysian phone number to E.164 without the leading +.
 * Accepts: 60xxxxxxxxx, 0xxxxxxxxx, 1xxxxxxxxx (mobile) or with spaces/dashes.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s\-().+]/g, "");
  if (digits.startsWith("60")) return digits;
  if (digits.startsWith("0")) return "6" + digits;
  if (digits.startsWith("1")) return "60" + digits;
  return digits;
}

/**
 * Returns true if the string is a valid Malaysian mobile/fixed number
 * after normalization (10–12 digits starting with 60).
 */
export function validatePhone(raw: string): boolean {
  if (!raw || raw.trim() === "") return true; // empty = optional field, skip validation
  const normalized = normalizePhone(raw);
  return /^60\d{8,10}$/.test(normalized);
}

export function phoneError(raw: string): string | null {
  if (!raw || raw.trim() === "") return null;
  return validatePhone(raw) ? null : "Enter a valid Malaysian number (e.g. 0123456789)";
}
