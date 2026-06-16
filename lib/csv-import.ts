// CSV header normalisation + row validation for owner-list imports.
// Tolerant to common variations (Name, owner_name, Owner Name, etc).

import { isInternationalPhone } from "@/lib/phone";

const HEADER_ALIASES: Record<string, keyof CanonicalRow> = {
  // owner name
  "name":             "owner_name",
  "nama":             "owner_name",
  "ownername":        "owner_name",
  "owner_name":       "owner_name",
  "owner name":       "owner_name",
  "fullname":         "owner_name",
  "full name":        "owner_name",
  // phone
  "phone":            "owner_phone",
  "phonenumber":      "owner_phone",
  "phone number":     "owner_phone",
  "owner_phone":      "owner_phone",
  "owner phone":      "owner_phone",
  "mobile":           "owner_phone",
  "whatsapp":         "owner_phone",
  "wa":               "owner_phone",
  "contact":          "owner_phone",
  "telefon":          "owner_phone",
  "telephone":        "owner_phone",
  "no tel":           "owner_phone",
  "no. tel":          "owner_phone",
  "no telefon":       "owner_phone",
  "no. telefon":      "owner_phone",
  "nombor telefon":   "owner_phone",
  "hp":               "owner_phone",
  // property
  "property":         "property_name",
  "property name":    "property_name",
  "property_name":    "property_name",
  "condo":            "property_name",
  "building":         "property_name",
  "block":            "property_name",
  "bangunan":         "property_name",
  // unit
  "unit":             "unit",
  "unit number":      "unit",
  "unit_number":      "unit",
  "unit no":          "unit",
  "unit no.":         "unit",
  "no unit":          "unit",
  // address
  "address":          "address",
  "alamat":           "address",
  "addr":             "address",
  // rent
  "rent":             "expected_rent",
  "expected_rent":    "expected_rent",
  "expected rent":    "expected_rent",
  "monthly rent":     "expected_rent",
  "price":            "expected_rent",
  "sewa":             "expected_rent",
  // beds / baths
  "bedrooms":         "bedrooms",
  "beds":             "bedrooms",
  "rooms":            "bedrooms",
  "bilik":            "bedrooms",
  "bathrooms":        "bathrooms",
  "baths":            "bathrooms",
  "toilets":          "bathrooms",
  "wc":               "bathrooms",
  // notes
  "notes":            "notes",
  "remarks":          "notes",
  "comments":         "notes",
  "catatan":          "notes",
};

// Malaysian road type keywords — stop condo name extraction here
const STREET_KEYWORDS = new Set([
  "JALAN", "JLN", "LORONG", "LRG", "PERSIARAN", "PSN",
  "LEBUH", "LEBUHRAYA", "LINGKARAN", "LALUAN", "BULATAN",
  "BATU", "KM",
]);

export interface CanonicalRow {
  owner_name: string;
  owner_phone: string;
  property_name?: string | null;
  unit?: string | null;
  address?: string | null;
  expected_rent?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  notes?: string | null;
}

export interface ImportRow extends CanonicalRow {
  rowNumber: number;
  errors: string[];
}

// Which CSV column header maps to which canonical field.
// null = not found in file. parseAddress* = extract from address column.
export interface ColumnMapping {
  owner_name: string | null;
  owner_phone: string | null;
  address: string | null;
  property_name: string | null;
  unit: string | null;
  expected_rent: string | null;
  bedrooms: string | null;
  bathrooms: string | null;
  notes: string | null;
  contract_start: string | null;
  contract_end: string | null;
  contract_duration_months: string | null;
  parseAddressForUnit: boolean;   // no unit column — extract from address
  parseAddressForCondo: boolean;  // no property column — extract from address
}

export function normaliseHeaderName(h: string): keyof CanonicalRow | null {
  return HEADER_ALIASES[h.trim().toLowerCase()] ?? null;
}

// ─── Content-based column sniffers ──────────────────────────────────────────

function looksLikeMyPhone(v: string): boolean {
  const d = v.replace(/[^\d]/g, "");
  return (
    (d.startsWith("60") && d.length >= 10 && d.length <= 12) ||
    (d.startsWith("0") && d.length >= 9 && d.length <= 11) ||
    (d.startsWith("1") && d.length >= 8 && d.length <= 10)
  );
}

function looksLikeName(v: string): boolean {
  // 2–5 words, only letters / spaces / hyphens / dots / apostrophes
  return /^[A-Za-z\s.'/()-]{2,60}$/.test(v) && v.trim().split(/\s+/).length >= 2;
}

function looksLikeAddress(v: string): boolean {
  const upper = v.toUpperCase();
  return (
    v.length > 15 &&
    (v.includes(",") || [...STREET_KEYWORDS].some((kw) => upper.includes(kw)))
  );
}

function hitRate(values: string[], fn: (v: string) => boolean): number {
  if (values.length === 0) return 0;
  return values.filter(fn).length / values.length;
}

// ─── Smart column detection ──────────────────────────────────────────────────

export function detectColumns(
  headers: string[],
  sampleRows: Record<string, string>[]
): ColumnMapping {
  const mapping: ColumnMapping = {
    owner_name: null, owner_phone: null, address: null,
    property_name: null, unit: null, expected_rent: null,
    bedrooms: null, bathrooms: null, notes: null,
    contract_start: null, contract_end: null, contract_duration_months: null,
    parseAddressForUnit: false, parseAddressForCondo: false,
  };

  // 1. Header-based detection (first wins per field)
  for (const h of headers) {
    const canonical = normaliseHeaderName(h);
    if (!canonical) continue;
    const cur = mapping[canonical as keyof ColumnMapping];
    if (cur === null) (mapping as unknown as Record<string, unknown>)[canonical] = h;
  }

  // 2. Content-based detection for unmatched critical fields
  const samples = sampleRows.slice(0, 15);
  for (const h of headers) {
    const vals = samples.map((r) => (r[h] ?? "").trim()).filter(Boolean);
    if (vals.length === 0) continue;

    if (!mapping.owner_phone && hitRate(vals, looksLikeMyPhone) > 0.5) {
      mapping.owner_phone = h;
    } else if (!mapping.owner_name && hitRate(vals, looksLikeName) > 0.6) {
      mapping.owner_name = h;
    } else if (!mapping.address && hitRate(vals, looksLikeAddress) > 0.5) {
      mapping.address = h;
    }
  }

  // 3. If address found but unit / condo missing, flag for extraction
  if (mapping.address) {
    if (!mapping.unit) mapping.parseAddressForUnit = true;
    if (!mapping.property_name) mapping.parseAddressForCondo = true;
  }

  return mapping;
}

// ─── AI-assisted column mapping ──────────────────────────────────────────────
// Calls /api/import/map-columns for columns the local heuristics couldn't place.
// Never throws — callers should treat any non-ok result as "keep manual mapping".

export type AiMappingResult =
  | { ok: true; mapping: Record<string, string>; confidence: "high" | "medium" | "low" }
  | { ok: false };

export async function fetchAiColumnMapping(
  headers: string[],
  rows: Record<string, string>[]
): Promise<AiMappingResult> {
  try {
    const sampleRows = rows.slice(0, 5).map((r) => headers.map((h) => r[h] ?? ""));
    const res = await fetch("/api/import/map-columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headers, sampleRows }),
    });
    const data = await res.json();
    if (!data.ok) return { ok: false };
    return { ok: true, mapping: data.mapping, confidence: data.confidence };
  } catch {
    return { ok: false };
  }
}

// Recompute the derived parse flags after user edits the mapping.
export function refreshMappingFlags(m: ColumnMapping): ColumnMapping {
  // If address and property_name point to the same column AND unit is explicitly
  // set, the "address" is just a condo name with nothing to extract — clear it.
  const address = (m.address && m.address === m.property_name && m.unit)
    ? null
    : m.address;
  return {
    ...m,
    address,
    parseAddressForUnit: !!address && !m.unit,
    parseAddressForCondo: !!address && !m.property_name,
  };
}

// ─── Excel / spreadsheet row parser ─────────────────────────────────────────
// Handles sheets where row 1 is a title and row 2 is the actual header.
// Pass the output of XLSX.utils.sheet_to_json(ws, { header: 1 }).

export function parseSpreadsheetRows(rawRows: unknown[][]): {
  headers: string[];
  rows: Record<string, string>[];
} {
  if (rawRows.length === 0) return { headers: [], rows: [] };

  // Find the first row that has ≥2 cells matching known column aliases.
  // This skips title rows like "UNION SOHO - BANDAR SUNWAY".
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(rawRows.length, 6); i++) {
    const cells = rawRows[i].map((c) => String(c ?? "").trim());
    const hits = cells.filter((cell) => normaliseHeaderName(cell) !== null).length;
    if (hits >= 2) { headerRowIdx = i; break; }
  }

  const headerRow = rawRows[headerRowIdx].map((c) => String(c ?? "").trim());

  const rows: Record<string, string>[] = rawRows
    .slice(headerRowIdx + 1)
    .filter((row) => row.some((c) => String(c ?? "").trim()))
    .map((row) => {
      const record: Record<string, string> = {};
      headerRow.forEach((h, i) => {
        if (h) record[h] = String(row[i] ?? "").trim();
      });
      return record;
    });

  return { headers: headerRow.filter(Boolean), rows };
}

// ─── Address parser ──────────────────────────────────────────────────────────

function toTitleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function parseOwnerAddress(raw: string): {
  unit: string | null;
  propertyName: string | null;
  address: string;
} {
  const commaIdx = raw.indexOf(",");
  if (commaIdx === -1) return { unit: null, propertyName: null, address: raw.trim() };

  const unit = raw.slice(0, commaIdx).trim() || null;
  const rest = raw.slice(commaIdx + 1).trim();
  const words = rest.split(/\s+/);

  // Strip punctuation before checking so "JALAN," is still recognised
  const stopIdx = words.findIndex((w) => STREET_KEYWORDS.has(w.replace(/\W/g, "").toUpperCase()));

  // Strip commas from individual words when building the property name
  const cleanWord = (w: string) => toTitleCase(w.replace(/,/g, ""));

  let propertyName: string | null = null;
  if (stopIdx > 0) {
    propertyName = words.slice(0, stopIdx).map(cleanWord).join(" ").trim() || null;
  } else if (stopIdx === -1 && words.length > 0) {
    propertyName = words.map(cleanWord).join(" ").trim() || null;
  }

  return { unit, propertyName, address: rest };
}

// ─── Canonical normalisation (header-based, existing behaviour) ──────────────

// Map an arbitrary { Name: "Ali", Phone: "0123..." } row to a CanonicalRow,
// flagging any validation issues (missing name/phone).
export function canonicalise(raw: Record<string, string>, rowNumber: number): ImportRow {
  const out: CanonicalRow = { owner_name: "", owner_phone: "" };
  const errors: string[] = [];

  for (const [rawKey, val] of Object.entries(raw)) {
    const k = normaliseHeaderName(rawKey);
    if (!k) continue;
    const v = (val ?? "").toString().trim();
    if (!v) continue;
    if (k === "expected_rent" || k === "bedrooms" || k === "bathrooms") {
      const num = parseFloat(v.replace(/[^\d.]/g, ""));
      if (!Number.isNaN(num)) (out as unknown as Record<string, unknown>)[k] = num;
    } else {
      (out as unknown as Record<string, unknown>)[k] = v;
    }
  }

  const wasInternational = isInternationalPhone(out.owner_phone);
  normalisePhone(out);

  if (!out.owner_name)  errors.push("Missing owner name");
  if (!out.owner_phone) errors.push("Missing phone number");
  else if (!wasInternational && (out.owner_phone.length < 10 || out.owner_phone.length > 13)) {
    errors.push(`Phone "${out.owner_phone}" looks malformed`);
  }

  return { ...out, rowNumber, errors };
}

// ─── Mapping-based normalisation ─────────────────────────────────────────────

export function canonicaliseWithMapping(
  raw: Record<string, string>,
  mapping: ColumnMapping,
  rowNumber: number
): ImportRow {
  const out: CanonicalRow = { owner_name: "", owner_phone: "" };
  const errors: string[] = [];

  function col(field: keyof ColumnMapping): string {
    const header = mapping[field] as string | null;
    return header ? (raw[header] ?? "").trim() : "";
  }

  out.owner_name = col("owner_name");
  out.owner_phone = col("owner_phone");
  const wasInternational = isInternationalPhone(out.owner_phone);
  normalisePhone(out);

  const rawAddress = col("address");
  if (rawAddress) {
    const parsed = parseOwnerAddress(rawAddress);
    out.address = parsed.address;
    if (mapping.parseAddressForUnit) out.unit = parsed.unit;
    if (mapping.parseAddressForCondo) out.property_name = parsed.propertyName;
  }

  // Explicit columns take precedence over address-extracted values
  if (!mapping.parseAddressForUnit) {
    const u = col("unit");
    if (u) out.unit = u;
  }
  if (!mapping.parseAddressForCondo) {
    const p = col("property_name");
    if (p) out.property_name = p.replace(/[,\s]+$/, "");
  }

  const rent = col("expected_rent");
  if (rent) {
    const n = parseFloat(rent.replace(/[^\d.]/g, ""));
    if (!Number.isNaN(n)) out.expected_rent = n;
  }

  const beds = col("bedrooms");
  if (beds) {
    const n = parseFloat(beds.replace(/[^\d.]/g, ""));
    if (!Number.isNaN(n)) out.bedrooms = n;
  }

  const baths = col("bathrooms");
  if (baths) {
    const n = parseFloat(baths.replace(/[^\d.]/g, ""));
    if (!Number.isNaN(n)) out.bathrooms = n;
  }

  const notes = col("notes");
  if (notes) out.notes = notes;

  if (!out.owner_name)  errors.push("Missing owner name");
  if (!out.owner_phone) errors.push("Missing phone number");
  else if (!wasInternational && (out.owner_phone.length < 10 || out.owner_phone.length > 13)) {
    errors.push(`Phone "${out.owner_phone}" looks malformed`);
  }

  return { ...out, rowNumber, errors };
}

function normalisePhone(out: CanonicalRow) {
  if (!out.owner_phone) return;
  if (isInternationalPhone(out.owner_phone)) {
    out.owner_phone = "+" + out.owner_phone.replace(/[\s\-().+]/g, "");
    return;
  }
  const digits = out.owner_phone.replace(/[^\d]/g, "");
  out.owner_phone =
    digits.startsWith("60") ? digits :               // already international
    digits.startsWith("0")  ? "60" + digits.slice(1) : // local 0XX → 60XX
    digits.startsWith("6")  ? "60" + digits.slice(1) : // "6" prefix variant (col E)
    digits.length >= 9      ? "60" + digits :         // bare digits e.g. 122734001
    digits;
}
