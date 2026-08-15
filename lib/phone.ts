/**
 * Returns true if the number is written with an explicit non-Malaysian
 * country code, e.g. "+44 7911 123456". Malaysian numbers written as
 * "+60123456789" are NOT considered international here.
 */
export function isInternationalPhone(raw: string): boolean {
  if (!raw.trim().startsWith("+")) return false;
  const digits = raw.replace(/[\s\-().+]/g, "");
  return !digits.startsWith("60");
}

/**
 * Normalise a phone number.
 * Malaysian numbers (60xxxxxxxxx, 0xxxxxxxxx, 1xxxxxxxxx, +60xxxxxxxxx, with
 * spaces/dashes/parens) are normalised to 60xxxxxxxxx, no leading +.
 * International numbers (e.g. +44...) are normalised to +<digits>, country
 * code intact. The leading + is kept (and not duplicated on re-normalising)
 * so this stays unambiguous from a Malaysian number missing its leading 0.
 */
export function normalizePhone(raw: string): string {
  if (isInternationalPhone(raw)) return "+" + raw.replace(/[\s\-().+]/g, "");
  const digits = raw.replace(/[\s\-().+]/g, "");
  if (digits.startsWith("60")) return digits;
  if (digits.startsWith("0")) return "6" + digits;
  if (digits.startsWith("1")) return "60" + digits;
  return digits;
}

/**
 * Returns true if the string is a valid Malaysian number after normalization
 * (10-12 digits starting with 60), or a plausible international number
 * (7-15 digits with an explicit country code).
 */
export function validatePhone(raw: string): boolean {
  if (!raw || raw.trim() === "") return true; // empty = optional field, skip validation
  const normalized = normalizePhone(raw);
  if (normalized.startsWith("+")) return /^\+\d{7,15}$/.test(normalized);
  return /^60\d{8,10}$/.test(normalized);
}

export function phoneError(raw: string): string | null {
  if (!raw || raw.trim() === "") return null;
  return validatePhone(raw)
    ? null
    : "Enter a valid number (e.g. 0123456789, or +44 7911 123456 for overseas)";
}

/** Prefix a stored phone number with + for display/dialling, without doubling it. */
export function toE164Display(phone: string): string {
  return phone.startsWith("+") ? phone : `+${phone}`;
}

/**
 * Build a wa.me URL for opening a WhatsApp chat.
 * If a WhatsApp username is given, it takes priority over the phone number
 * (WhatsApp resolves wa.me/<username> the same way it resolves wa.me/<phone>).
 * Phone is normalised before being embedded. Message is URL-encoded.
 */
export function buildWaLink(phone: string, message?: string, username?: string | null): string {
  const handle = username?.trim().replace(/^@/, "");
  const identifier = handle ? handle : normalizePhone(phone);
  if (message) return `https://wa.me/${identifier}?text=${encodeURIComponent(message)}`;
  return `https://wa.me/${identifier}`;
}
