// CSV / Excel parsing utilities for tenancy bulk import.
// Maps flexible column headers → canonical tenancy fields,
// normalises dates (DD/MM/YYYY, M/D/YYYY, YYYY-MM-DD) and MY phone numbers.

import Papa from "papaparse";
import * as XLSX from "xlsx";

// ─── Canonical field names ────────────────────────────────────────────────────

export interface TenancyImportRow {
  property_name: string;
  unit: string;
  owner_name: string;
  owner_phone: string;
  tenant_name: string;
  tenant_phone: string;
  amount: number | null;           // rental amount in RM
  contract_start: string;          // YYYY-MM-DD or ""
  contract_end: string;            // YYYY-MM-DD or ""
  contract_duration_months: number | null;
  due_day: number | null;
  _rowIndex: number;               // 1-based CSV row number
  _autoFilled: Set<string>;        // fields that were auto-computed
}

// Fields that must be filled before import is allowed
export const CRITICAL_FIELDS: (keyof TenancyImportRow)[] = [
  "property_name",
  "unit",
  "owner_name",
  "owner_phone",
  "contract_start",
  "amount",
];

// ─── Header aliases ───────────────────────────────────────────────────────────

type CanonicalField = keyof Omit<TenancyImportRow, "_rowIndex" | "_autoFilled">;

const ALIASES: Record<string, CanonicalField> = {
  // property_name
  property: "property_name",
  "property name": "property_name",
  property_name: "property_name",
  propertyname: "property_name",
  condo: "property_name",
  building: "property_name",
  bangunan: "property_name",
  rumah: "property_name",
  "nama hartanah": "property_name",
  // unit
  unit: "unit",
  "unit number": "unit",
  unit_number: "unit",
  "unit no": "unit",
  "unit no.": "unit",
  "no unit": "unit",
  "no. unit": "unit",
  bilik: "unit",
  "lot no": "unit",
  // owner_name
  "owner name": "owner_name",
  owner_name: "owner_name",
  ownername: "owner_name",
  owner: "owner_name",
  tuan: "owner_name",
  pemilik: "owner_name",
  "nama pemilik": "owner_name",
  landlord: "owner_name",
  "landlord name": "owner_name",
  // owner_phone
  "owner phone": "owner_phone",
  owner_phone: "owner_phone",
  ownerphone: "owner_phone",
  "owner mobile": "owner_phone",
  "owner number": "owner_phone",
  "owner hp": "owner_phone",
  "tuan phone": "owner_phone",
  "tel pemilik": "owner_phone",
  "no pemilik": "owner_phone",
  // tenant_name
  tenant: "tenant_name",
  "tenant name": "tenant_name",
  tenant_name: "tenant_name",
  tenantname: "tenant_name",
  penyewa: "tenant_name",
  "nama penyewa": "tenant_name",
  "tenant/penyewa": "tenant_name",
  // tenant_phone
  "tenant phone": "tenant_phone",
  tenant_phone: "tenant_phone",
  tenantphone: "tenant_phone",
  "tenant mobile": "tenant_phone",
  "tenant number": "tenant_phone",
  "tenant hp": "tenant_phone",
  "tel penyewa": "tenant_phone",
  // amount
  amount: "amount",
  rent: "amount",
  "rental amount": "amount",
  rental_amount: "amount",
  rentalamount: "amount",
  "monthly rent": "amount",
  "monthly rental": "amount",
  sewa: "amount",
  "kadar sewa": "amount",
  price: "amount",
  // contract_start
  "contract start": "contract_start",
  contract_start: "contract_start",
  contractstart: "contract_start",
  "start date": "contract_start",
  startdate: "contract_start",
  "tarikh mula": "contract_start",
  "mula kontrak": "contract_start",
  commenced: "contract_start",
  "commencement date": "contract_start",
  // contract_end
  "contract end": "contract_end",
  contract_end: "contract_end",
  contractend: "contract_end",
  "end date": "contract_end",
  enddate: "contract_end",
  "expiry date": "contract_end",
  expiry: "contract_end",
  "tarikh tamat": "contract_end",
  "tamat kontrak": "contract_end",
  expires: "contract_end",
  // contract_duration_months
  duration: "contract_duration_months",
  "duration months": "contract_duration_months",
  contract_duration_months: "contract_duration_months",
  "duration (months)": "contract_duration_months",
  "tempoh (bulan)": "contract_duration_months",
  tempoh: "contract_duration_months",
  months: "contract_duration_months",
  // due_day
  "due day": "due_day",
  due_day: "due_day",
  dueday: "due_day",
  "payment day": "due_day",
  "day due": "due_day",
};

function normaliseHeader(h: string): CanonicalField | null {
  return ALIASES[h.trim().toLowerCase()] ?? null;
}

// ─── Value normalisers ────────────────────────────────────────────────────────

export function normalisePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("60") && digits.length >= 10 && digits.length <= 12) return digits;
  if (digits.startsWith("0") && digits.length >= 9 && digits.length <= 11) return "6" + digits;
  if (digits.startsWith("1") && digits.length >= 8 && digits.length <= 10) return "60" + digits;
  return raw.trim(); // return as-is if can't normalise
}

// Accepts: YYYY-MM-DD, DD/MM/YYYY, D/M/YYYY, M/D/YYYY (US), Excel serial numbers
export function normaliseDate(raw: string | number): string {
  if (typeof raw === "number") {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(raw);
    if (date) {
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${date.y}-${m}-${d}`;
    }
    return "";
  }
  const s = String(raw).trim();
  if (!s) return "";

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY or D/M/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    // Heuristic: if day > 12 it must be DD/MM; otherwise assume DD/MM (Malaysian convention)
    const dd = d.padStart(2, "0");
    const mm = m.padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }

  // MM/DD/YYYY (US) — detect if first number > 12 implying it's a day
  const mdyMatch = s.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{4})$/);
  if (mdyMatch) {
    const [, a, b, y] = mdyMatch;
    if (parseInt(a) > 12) return `${y}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
    return `${y}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
  }

  // YYYY/MM/DD
  const ymdSlash = s.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/);
  if (ymdSlash) {
    const [, y, m, d] = ymdSlash;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // "01 Jan 2024" / "1 January 2024"
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const textMatch = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (textMatch) {
    const [, d, mon, y] = textMatch;
    const m = months[mon.toLowerCase().slice(0, 3)];
    if (m) return `${y}-${m}-${d.padStart(2, "0")}`;
  }

  return "";
}

export function addMonths(dateStr: string, months: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function monthsBetween(startStr: string, endStr: string): number {
  const s = new Date(startStr + "T00:00:00");
  const e = new Date(endStr + "T00:00:00");
  return Math.round((e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()));
}

// ─── Row builder ──────────────────────────────────────────────────────────────

function buildRow(
  raw: Record<string, string>,
  colMap: Partial<Record<CanonicalField, string>>,
  rowIndex: number,
  defaultDurationMonths: number
): TenancyImportRow {
  function get(field: CanonicalField): string {
    const col = colMap[field];
    return col ? (raw[col] ?? "").trim() : "";
  }

  const autoFilled = new Set<string>();

  const property_name = get("property_name");
  const unit = get("unit");
  const owner_name = get("owner_name");
  const owner_phone_raw = get("owner_phone");
  const owner_phone = owner_phone_raw ? normalisePhone(owner_phone_raw) : "";
  const tenant_name = get("tenant_name");
  const tenant_phone_raw = get("tenant_phone");
  const tenant_phone = tenant_phone_raw ? normalisePhone(tenant_phone_raw) : "";

  const amountRaw = get("amount");
  const amount = amountRaw ? parseFloat(amountRaw.replace(/[^0-9.]/g, "")) || null : null;

  let contract_start = normaliseDate(get("contract_start"));
  let contract_end = normaliseDate(get("contract_end"));
  const durationRaw = get("contract_duration_months");
  let contract_duration_months: number | null = durationRaw ? parseInt(durationRaw) || null : null;

  // Auto-fill logic
  if (contract_start && !contract_end) {
    const dur = contract_duration_months ?? defaultDurationMonths;
    contract_end = addMonths(contract_start, dur);
    if (!contract_duration_months) contract_duration_months = dur;
    autoFilled.add("contract_end");
    if (!durationRaw) autoFilled.add("contract_duration_months");
  } else if (!contract_start && contract_end && contract_duration_months) {
    contract_start = addMonths(contract_end, -contract_duration_months);
    autoFilled.add("contract_start");
  } else if (contract_start && contract_end && !contract_duration_months) {
    contract_duration_months = monthsBetween(contract_start, contract_end);
    autoFilled.add("contract_duration_months");
  }

  const dueDayRaw = get("due_day");
  const due_day = dueDayRaw ? parseInt(dueDayRaw) || null : null;

  return {
    property_name,
    unit,
    owner_name,
    owner_phone,
    tenant_name,
    tenant_phone,
    amount,
    contract_start,
    contract_end,
    contract_duration_months,
    due_day,
    _rowIndex: rowIndex,
    _autoFilled: autoFilled,
  };
}

// ─── Column mapping from headers ─────────────────────────────────────────────

function detectColumnMap(headers: string[]): Partial<Record<CanonicalField, string>> {
  const map: Partial<Record<CanonicalField, string>> = {};
  for (const h of headers) {
    const field = normaliseHeader(h);
    if (field && !(field in map)) {
      map[field] = h;
    }
  }
  return map;
}

// ─── Public parse entrypoint ──────────────────────────────────────────────────

export interface ParseResult {
  rows: TenancyImportRow[];
  detectedColumns: Partial<Record<CanonicalField, string>>;
  headers: string[];
  error?: string;
}

export async function parseTenancyFile(
  file: File,
  defaultDurationMonths = 12
): Promise<ParseResult> {
  try {
    const ext = file.name.split(".").pop()?.toLowerCase();
    let rawRows: Record<string, string>[] = [];
    let headers: string[] = [];

    if (ext === "csv") {
      const text = await file.text();
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
      });
      headers = result.meta.fields ?? [];
      rawRows = result.data;
    } else if (ext === "xlsx" || ext === "xls") {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws, {
        raw: false,   // convert to strings, but preserve date values as-is
        defval: "",
      });
      if (data.length === 0) return { rows: [], detectedColumns: {}, headers: [], error: "The file is empty." };
      headers = Object.keys(data[0]).map((h) => String(h).trim());
      // Normalise: ensure all values are strings
      rawRows = data.map((row) => {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          out[k.trim()] = String(v ?? "").trim();
        }
        return out;
      });
    } else {
      return { rows: [], detectedColumns: {}, headers: [], error: "Only CSV, XLS, and XLSX files are supported." };
    }

    const colMap = detectColumnMap(headers);
    const rows = rawRows.map((raw, i) => buildRow(raw, colMap, i + 2, defaultDurationMonths));

    return { rows, detectedColumns: colMap, headers };
  } catch (err) {
    return {
      rows: [],
      detectedColumns: {},
      headers: [],
      error: err instanceof Error ? err.message : "Failed to parse file.",
    };
  }
}

export function isCriticalMissing(row: TenancyImportRow, field: keyof TenancyImportRow): boolean {
  if (!CRITICAL_FIELDS.includes(field as CanonicalField)) return false;
  const val = row[field];
  if (val === null || val === undefined || val === "") return true;
  return false;
}

export function rowHasCriticalErrors(row: TenancyImportRow): boolean {
  return CRITICAL_FIELDS.some((f) => isCriticalMissing(row, f));
}
