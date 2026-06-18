"use client";

import { useRef, useState, useCallback } from "react";
import { usePostHog } from "posthog-js/react";
import { Upload, AlertCircle, CheckCircle2, FileSpreadsheet, ChevronLeft, ChevronRight, X, Lightbulb, Sparkles, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  extractRawData,
  buildRowsFromMapping,
  detectColumnMap,
  isCriticalMissing,
  rowHasCriticalErrors,
  tenancyEndDate,
  type TenancyImportRow,
  type RawImportData,
  type CanonicalField,
  CRITICAL_FIELDS,
} from "@/lib/tenancy-csv-import";
import {
  detectColumns,
  parseOwnerAddress,
  fetchAiColumnMapping,
} from "@/lib/csv-import";

// ─── Column display config (review grid) ─────────────────────────────────────

interface ColDef {
  field: keyof TenancyImportRow;
  label: string;
  width: number;
  type: "text" | "number" | "date";
  critical: boolean;
}

const COLUMNS: ColDef[] = [
  { field: "property_name",            label: "Property",      width: 160, type: "text",   critical: false },
  { field: "unit",                     label: "Unit",          width: 90,  type: "text",   critical: false },
  { field: "owner_name",               label: "Owner Name",    width: 140, type: "text",   critical: false },
  { field: "owner_phone",              label: "Owner Phone",   width: 130, type: "text",   critical: false },
  { field: "tenant_name",              label: "Tenant Name",   width: 140, type: "text",   critical: false },
  { field: "tenant_phone",             label: "Tenant Phone",  width: 130, type: "text",   critical: false },
  { field: "amount",                   label: "Rent (RM)",     width: 100, type: "number", critical: false },
  { field: "contract_start",           label: "Start Date",    width: 115, type: "date",   critical: true },
  { field: "contract_end",             label: "End Date",      width: 115, type: "date",   critical: false },
  { field: "contract_duration_months", label: "Duration (mo)", width: 105, type: "number", critical: false },
  { field: "due_day",                  label: "Due Day",       width: 80,  type: "number", critical: false },
];

// ─── Tenancy column mapping type ──────────────────────────────────────────────

interface TenancyColumnMapping {
  contract_start: string | null;
  address: string | null;
  property_name: string | null;
  unit: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  amount: string | null;
  tenant_name: string | null;
  tenant_phone: string | null;
  contract_end: string | null;
  contract_duration_months: string | null;
  due_day: string | null;
  parseAddressForUnit: boolean;
  parseAddressForCondo: boolean;
}

type TenancyMappingField = keyof Omit<TenancyColumnMapping, "parseAddressForUnit" | "parseAddressForCondo">;

const FIELD_LABELS: Record<TenancyMappingField, string> = {
  contract_start:           "Contract start",
  address:                  "Address (unit + property)",
  owner_name:               "Owner name",
  owner_phone:              "Owner phone",
  amount:                   "Monthly rent (RM)",
  tenant_name:              "Tenant name",
  tenant_phone:             "Tenant phone",
  property_name:            "Property name",
  unit:                     "Unit number",
  contract_end:             "Contract end",
  contract_duration_months: "Duration (months)",
  due_day:                  "Due day",
};

const DISPLAY_ORDER: TenancyMappingField[] = [
  "contract_start", "contract_end", "address", "owner_name", "owner_phone", "amount",
  "tenant_name", "tenant_phone", "property_name", "unit",
  "contract_duration_months", "due_day",
];

const ALWAYS_SHOW = new Set<TenancyMappingField>([
  "contract_start", "contract_end", "address", "owner_name", "owner_phone", "amount",
]);

const FIELD_HINTS: Partial<Record<TenancyMappingField, string>> = {
  contract_duration_months: "defaults to 12 if blank",
  contract_end: "auto-filled: start + duration if blank",
};

const LS_KEY = "kk-tenancy-mapping";

// ─── Detection + flag refresh ─────────────────────────────────────────────────

function detectTenancyMapping(
  headers: string[],
  sampleRows: Record<string, string>[]
): TenancyColumnMapping {
  // Smart owner-level detection (address, name, phone, property, unit)
  const ownerMap = detectColumns(headers, sampleRows);
  // Alias-based tenancy-specific detection (contract_start, amount, tenant, etc.)
  const tenancyMap = detectColumnMap(headers);

  return refreshTenancyFlags({
    contract_start:           tenancyMap.contract_start ?? null,
    address:                  ownerMap.address,
    property_name:            ownerMap.property_name ?? tenancyMap.property_name ?? null,
    unit:                     ownerMap.unit ?? tenancyMap.unit ?? null,
    owner_name:               ownerMap.owner_name,
    owner_phone:              ownerMap.owner_phone,
    amount:                   tenancyMap.amount ?? null,
    tenant_name:              tenancyMap.tenant_name ?? null,
    tenant_phone:             tenancyMap.tenant_phone ?? null,
    contract_end:             tenancyMap.contract_end ?? null,
    contract_duration_months: tenancyMap.contract_duration_months ?? null,
    due_day:                  tenancyMap.due_day ?? null,
    parseAddressForUnit:      false,
    parseAddressForCondo:     false,
  });
}

function refreshTenancyFlags(m: TenancyColumnMapping): TenancyColumnMapping {
  return {
    ...m,
    parseAddressForUnit:  !!m.address && !m.unit,
    parseAddressForCondo: !!m.address && !m.property_name,
  };
}

// ─── Cell editor (review grid) ────────────────────────────────────────────────

interface CellProps {
  value: string | number | null;
  field: keyof TenancyImportRow;
  isMissing: boolean;
  isAutoFilled: boolean;
  width: number;
  type: "text" | "number" | "date";
  onChange: (val: string) => void;
}

function EditableCell({ value, field, isMissing, isAutoFilled, width, type, onChange }: CellProps) {
  const displayVal = value === null || value === undefined ? "" : String(value);
  let bg = "transparent";
  if (isMissing) bg = "#FFF3CD";
  else if (isAutoFilled) bg = "#E8F4FD";

  return (
    <td style={{ width, minWidth: width, maxWidth: width, padding: 0, borderRight: "1px solid #E5E7EB", borderBottom: "1px solid #E5E7EB", background: bg, position: "relative" }}>
      {isMissing && (
        <span style={{ position: "absolute", top: 2, left: 2, width: 5, height: 5, borderRadius: "50%", background: "#F59E0B", zIndex: 1, pointerEvents: "none" }} />
      )}
      <input
        type={type === "date" ? "text" : type}
        value={displayVal}
        placeholder={type === "date" ? "YYYY-MM-DD" : ""}
        onChange={(e) => onChange(e.target.value)}
        data-field={field}
        style={{ width: "100%", height: "100%", padding: "4px 6px 4px 10px", border: "none", outline: "none", background: "transparent", fontSize: 12, color: "var(--kk-ink)", fontFamily: "inherit" }}
      />
    </td>
  );
}

// ─── Mapping table ────────────────────────────────────────────────────────────

function MappingTable({
  headers,
  rows,
  mapping,
  defaultContractStart,
  onChange,
}: {
  headers: string[];
  rows: Record<string, string>[];
  mapping: TenancyColumnMapping;
  defaultContractStart: string | null;
  onChange: (field: TenancyMappingField, value: string) => void;
}) {
  const sample = rows.slice(0, 3);

  const fieldsToShow = DISPLAY_ORDER.filter((f) => {
    if (ALWAYS_SHOW.has(f)) return true;
    if (f === "property_name" && mapping.parseAddressForCondo) return false;
    if (f === "unit" && mapping.parseAddressForUnit) return false;
    return !!(mapping[f]);
  });

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
      {fieldsToShow.map((field, i) => {
        const isLast = i === fieldsToShow.length - 1;
        const mappedHeader = mapping[field] as string | null;
        const isRequired = field === "contract_start";
        // Not missing if resolved via "Add today"
        const isMissing = isRequired && !mappedHeader && !defaultContractStart;
        const isFromAddress =
          (field === "unit" && mapping.parseAddressForUnit) ||
          (field === "property_name" && mapping.parseAddressForCondo);

        const sampleValues = mappedHeader
          ? sample.map((r) => (r[mappedHeader] ?? "").trim()).filter(Boolean)
          : [];

        return (
          <div
            key={field}
            className="px-4 py-3 flex items-start gap-3 overflow-hidden"
            style={{
              borderBottom: isLast ? "none" : "1px solid var(--kk-line)",
              background: isMissing ? "var(--kk-red-soft)" : "transparent",
            }}
          >
            <div className="w-[140px] shrink-0 pt-0.5">
              <p className="text-[12px] font-semibold" style={{ color: isMissing ? "var(--kk-red)" : "var(--kk-ink)" }}>
                {FIELD_LABELS[field]}
                {isRequired && <span style={{ color: "var(--kk-red)" }}> *</span>}
              </p>
              {FIELD_HINTS[field] && (
                <p className="text-[10px] mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>{FIELD_HINTS[field]}</p>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {isFromAddress ? (
                <span className="text-[12px] italic" style={{ color: "var(--kk-ink-mute)" }}>
                  extracted from address
                </span>
              ) : (
                <select
                  value={mappedHeader ?? "__none__"}
                  onChange={(e) => onChange(field, e.target.value)}
                  className="w-full text-[12px] rounded-lg px-2 py-1.5 outline-none"
                  style={{
                    background: "var(--kk-surface-2)",
                    border: `1px solid ${isMissing ? "var(--kk-red)" : "var(--kk-line)"}`,
                    color: "var(--kk-ink)",
                  }}
                >
                  <option value="__none__">(not in file)</option>
                  {headers.map((h, i) => (
                    <option key={`${h}-${i}`} value={h}>{h}</option>
                  ))}
                </select>
              )}

              {sampleValues.length > 0 && (
                <p
                  className="text-[11px] mt-1 truncate"
                  style={{ color: "var(--kk-ink-faint)" }}
                  title={sampleValues.join(" · ")}
                >
                  e.g. {sampleValues[0]}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Address extraction preview ───────────────────────────────────────────────

function AddressExtractionPreview({
  addressHeader,
  rows,
  extractUnit,
  extractCondo,
}: {
  addressHeader: string;
  rows: Record<string, string>[];
  extractUnit: boolean;
  extractCondo: boolean;
}) {
  const samples = rows.slice(0, 3).map((r) => (r[addressHeader] ?? "").trim()).filter(Boolean);
  if (samples.length === 0) return null;

  return (
    <div className="rounded-2xl p-4 space-y-2" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--kk-ink-mute)" }}>
        Address extraction preview
      </p>
      {samples.map((raw, i) => {
        const { unit, propertyName } = parseOwnerAddress(raw);
        return (
          <div key={i} className="text-[12px] space-y-0.5 overflow-hidden">
            <p className="font-mono truncate" style={{ color: "var(--kk-ink-faint)", fontSize: "11px" }} title={raw}>{raw}</p>
            <div className="flex flex-wrap gap-3 pl-1">
              {extractUnit && <span style={{ color: "var(--kk-ink)" }}>Unit: <strong>{unit ?? "—"}</strong></span>}
              {extractCondo && <span style={{ color: "var(--kk-ink)" }}>Property: <strong>{propertyName ?? "—"}</strong></span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Step = "upload" | "map" | "review" | "done";

interface Props {
  trigger?: React.ReactNode;
  onImported?: () => void;
}

export function UploadTenancyCsvDialog({ trigger, onImported }: Props) {
  const ph = usePostHog();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<TenancyImportRow[]>([]);
  const [rawData, setRawData] = useState<RawImportData | null>(null);
  const [mapping, setMapping] = useState<TenancyColumnMapping | null>(null);
  const [defaultDuration, setDefaultDuration] = useState(12);
  const [defaultContractStart, setDefaultContractStart] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [aiState, setAiState] = useState<"idle" | "loading" | "done" | "skipped">("idle");
  const [aiConfidence, setAiConfidence] = useState<"high" | "medium" | "low" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setRows([]);
    setRawData(null);
    setMapping(null);
    setImporting(false);
    setDefaultDuration(12);
    setDefaultContractStart(null);
    setDragOver(false);
    setAiState("idle");
    setAiConfidence(null);
  }, []);

  // Fills only the gaps local heuristics couldn't place — never overwrites an
  // already-detected or user-edited column. Runs in the background so the
  // mapping step is usable immediately; failures silently keep manual mapping.
  const runAiMapping = useCallback(async (headers: string[], rows: Record<string, string>[], current: TenancyColumnMapping) => {
    if ((current.contract_end || current.contract_start) && current.owner_name && current.owner_phone) { setAiState("skipped"); return; }
    setAiState("loading");
    const res = await fetchAiColumnMapping(headers, rows);
    if (!res.ok) { setAiState("skipped"); return; }
    setMapping((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      for (const [idxStr, field] of Object.entries(res.mapping)) {
        const idx = Number(idxStr);
        const header = headers[idx];
        if (!header) continue;
        if (!(DISPLAY_ORDER as readonly string[]).includes(field)) continue;
        const key = field as TenancyMappingField;
        if (next[key]) continue;
        (next as Record<string, unknown>)[key] = header;
      }
      return refreshTenancyFlags(next);
    });
    setAiConfidence(res.confidence);
    setAiState("done");
  }, []);

  function downloadSampleCsv() {
    const csv = `Contract Start,Contract End,Owner Name,Owner Phone,Property,Unit,Monthly Rent,Tenant Name,Tenant Phone
01/01/2024,31/12/2024,Ahmad bin Hassan,0123456789,Sunway Pyramid,A-12-05,2500,Sarah Lim,0187654321
15/03/2023,14/03/2024,Tan Wei Ming,0198765432,Mont Kiara Meridin,B-08-02,3200,,
01/06/2024,,Raj Kumar,60181112222,Residensi Mutiara,C-05-11,1800,Amirah Yusof,0112345678
`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kakisewa-contracts-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const handleFile = useCallback(async (file: File) => {
    const result = await extractRawData(file);
    if (result.error) { toast.error(result.error); return; }
    if (result.allRows.length === 0) { toast.error("No data rows found in the file."); return; }

    let detected = detectTenancyMapping(result.headers, result.sampleRows);

    // Apply saved column preferences
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") as Partial<TenancyColumnMapping>;
      const merged = { ...detected };
      for (const [k, v] of Object.entries(saved)) {
        if (typeof v === "string" && result.headers.includes(v)) {
          (merged as Record<string, unknown>)[k] = v;
        }
      }
      detected = refreshTenancyFlags(merged);
    } catch { /* ignore */ }

    setRawData(result);
    setMapping(detected);
    setStep("map");
    runAiMapping(result.headers, result.allRows, detected);
  }, [runAiMapping]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) await handleFile(file);
  }, [handleFile]);

  function handleMappingChange(field: TenancyMappingField, value: string) {
    if (!mapping) return;
    const updated = { ...mapping, [field]: value === "__none__" ? null : value };
    const refreshed = refreshTenancyFlags(updated);
    setMapping(refreshed);
    try {
      const toSave: Record<string, string> = {};
      for (const [k, v] of Object.entries(refreshed)) {
        if (typeof v === "string") toSave[k] = v;
      }
      localStorage.setItem(LS_KEY, JSON.stringify(toSave));
    } catch { /* ignore */ }
  }

  function handleApplyMapping() {
    if (!rawData || !mapping) return;

    // Pre-process rows: inject parsed unit/property from address column,
    // and inject a synthetic __default_start__ column when using "Add today"
    const processedRows = rawData.allRows.map((row) => {
      const out = { ...row };
      if (mapping.address && row[mapping.address]) {
        const { unit, propertyName } = parseOwnerAddress(row[mapping.address]);
        if (unit) out["__unit__"] = unit;
        if (propertyName) out["__property__"] = propertyName;
      }
      if (!mapping.contract_start && defaultContractStart) {
        out["__default_start__"] = defaultContractStart;
      }
      return out;
    });

    const colMap: Partial<Record<CanonicalField, string>> = {};
    // Use real column if mapped, otherwise use synthetic default-start column so
    // buildRowsFromMapping auto-fills contract_end correctly in the same pass
    if (mapping.contract_start)           colMap.contract_start = mapping.contract_start;
    else if (defaultContractStart)        colMap.contract_start = "__default_start__";
    if (mapping.parseAddressForUnit && mapping.address) colMap.unit = "__unit__";
    else if (mapping.unit)                colMap.unit = mapping.unit;
    if (mapping.parseAddressForCondo && mapping.address) colMap.property_name = "__property__";
    else if (mapping.property_name)       colMap.property_name = mapping.property_name;
    if (mapping.owner_name)               colMap.owner_name = mapping.owner_name;
    if (mapping.owner_phone)              colMap.owner_phone = mapping.owner_phone;
    if (mapping.amount)                   colMap.amount = mapping.amount;
    if (mapping.tenant_name)              colMap.tenant_name = mapping.tenant_name;
    if (mapping.tenant_phone)             colMap.tenant_phone = mapping.tenant_phone;
    if (mapping.contract_end)             colMap.contract_end = mapping.contract_end;
    if (mapping.contract_duration_months) colMap.contract_duration_months = mapping.contract_duration_months;
    if (mapping.due_day)                  colMap.due_day = mapping.due_day;

    const newRows = buildRowsFromMapping(processedRows, colMap, defaultDuration, rawData.headerRowIndex);
    if (newRows.length === 0) { toast.error("No data rows found."); return; }

    setRows(newRows);
    setStep("review");
  }

  function updateCell(rowIdx: number, field: keyof TenancyImportRow, rawVal: string) {
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[rowIdx] };
      const autoFilled = new Set(row._autoFilled);

      if (field === "amount" || field === "contract_duration_months" || field === "due_day") {
        const n = parseFloat(rawVal.replace(/[^0-9.]/g, ""));
        (row as Record<string, unknown>)[field] = isNaN(n) ? null : n;
      } else {
        (row as Record<string, unknown>)[field] = rawVal;
      }

      autoFilled.delete(field as string);
      row._autoFilled = autoFilled;

      if (field === "contract_start" && row.contract_duration_months) {
        row.contract_end = tenancyEndDate(rawVal, row.contract_duration_months);
        autoFilled.add("contract_end");
        row._autoFilled = autoFilled;
      }

      next[rowIdx] = row;
      return next;
    });
  }

  async function handleImport() {
    const errorCount = rows.filter(rowHasCriticalErrors).length;
    if (errorCount > 0) {
      toast.error(`${errorCount} row${errorCount > 1 ? "s are" : " is"} still missing a contract end date (highlighted in amber).`);
      return;
    }

    setImporting(true);
    try {
      const payload = rows.map((r) => ({
        property_name: r.property_name,
        unit: r.unit,
        owner_name: r.owner_name,
        owner_phone: r.owner_phone,
        tenant_name: r.tenant_name,
        tenant_phone: r.tenant_phone,
        amount: r.amount,
        contract_start: r.contract_start,
        contract_end: r.contract_end,
        contract_duration_months: r.contract_duration_months,
        due_day: r.due_day,
      }));

      const res = await fetch("/api/tenancies/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Import failed");
      }

      const data = await res.json() as { imported: number };
      setImportedCount(data.imported);
      setStep("done");
      track(ph, "csv_imported", { rows: rows.length, type: "tenancy" });
      onImported?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const missingCount = rows.filter(rowHasCriticalErrors).length;
  const totalWidth = COLUMNS.reduce((s, c) => s + c.width, 0) + 50;
  const canProceed = !!(mapping?.contract_end) || !!(mapping?.contract_start) || !!defaultContractStart;

  return (
    <>
      <span onClick={() => { reset(); setOpen(true); }} style={{ cursor: "pointer", display: "inline-flex" }}>
        {trigger ?? (
          <button className="kk-pill kk-pill-white" style={{ background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.12)", border: "1px solid rgba(0,0,0,0.08)" }}>
            <Upload size={14} />
            Upload file
          </button>
        )}
      </span>

      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); setOpen(v); }}>
        <DialogContent
          showCloseButton={false}
          style={{
            maxWidth: step === "review" ? "min(98vw, 1100px)" : "min(98vw, 560px)",
            width: "100%",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            padding: 0,
          }}
        >
          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-0 shrink-0">
            <div className="flex items-center gap-2">
              {step === "map" && (
                <button
                  type="button"
                  onClick={() => setStep("upload")}
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <div>
                <p className="kk-overline mb-1">Bulk import</p>
                <h2 className="text-[18px] font-semibold leading-tight" style={{ color: "var(--kk-ink)", letterSpacing: "-0.014em" }}>
                  {step === "upload" && "Import existing contracts"}
                  {step === "map"    && "Confirm column mapping"}
                  {step === "review" && `Review ${rows.length} rows`}
                  {step === "done"   && "Import complete"}
                </h2>
                {step === "map" && rawData && (
                  <p className="text-[13px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>
                    {rawData.allRows.length} rows detected · confirm how kakisewa reads each column
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Step 1: Upload ── */}
          {step === "upload" && (
            <>
              <div className="px-6 pb-0 pt-1 space-y-5">
                <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
                  CSV, Excel or Google Sheets export. Contract end date is the only required column — start date is auto-calculated from end date if not provided.
                </p>

                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="flex items-center gap-1.5 text-[12px] font-medium hover:underline"
                  style={{ color: "var(--kk-blue)" }}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Download sample CSV
                </button>

                <div className="flex items-start gap-2.5 rounded-xl px-4 py-3" style={{ background: "rgba(255,149,0,0.08)", border: "1px solid rgba(255,149,0,0.25)" }}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--kk-amber)" }} />
                  <p className="text-[12px] leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
                    Bulk upload works best with a clean spreadsheet — consistent column headers, one row per tenancy, no merged cells. If your data is messy, uploading one by one will save you more time.
                  </p>
                </div>

                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className="rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors select-none"
                  style={{
                    border: `1.5px dashed ${dragOver ? "var(--kk-blue)" : "var(--kk-line-strong)"}`,
                    background: dragOver ? "var(--kk-blue-soft)" : "var(--kk-surface-2)",
                  }}
                >
                  <FileSpreadsheet className="w-7 h-7" style={{ color: "var(--kk-ink-mute)" }} />
                  <div className="text-center">
                    <p className="text-[13px] font-medium" style={{ color: "var(--kk-ink)" }}>Click to pick a file</p>
                    <p className="text-[11px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>.csv, .xlsx, or .xls — up to 20 000 rows</p>
                  </div>
                </div>
                <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" className="hidden"
                  onChange={async (e) => { const f = e.target.files?.[0]; if (f) await handleFile(f); e.target.value = ""; }}
                />

                <div
                  className="rounded-xl px-3.5 py-3 flex items-start gap-2"
                  style={{ background: "var(--kk-amber-soft)", color: "#B45309" }}
                >
                  <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-[12px] leading-relaxed">
                    Tip: if this is your first time uploading this file, try just 10 rows first to confirm the columns map correctly before uploading the rest.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 px-6 py-4">
                <button type="button" className="kk-pill kk-pill-ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button type="button" className="kk-pill kk-pill-primary" disabled style={{ opacity: 0.4 }}>
                  Analyse columns <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {/* ── Step 2: Map columns ── */}
          {step === "map" && mapping && rawData && (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div style={{ overflow: "auto", flex: 1, padding: "16px 24px" }} className="space-y-4">

                {/* ── Decisions banner (top) ── */}
                {(!mapping.contract_start || !mapping.contract_end) && (() => {
                  const item1Unresolved = !mapping.contract_start && !defaultContractStart;
                  const item2Unresolved = !mapping.contract_end && !defaultContractStart;
                  const anyUnresolved = item1Unresolved || item2Unresolved;
                  return (
                    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${anyUnresolved ? "#F59E0B" : "var(--kk-green)"}` }}>
                      {/* Item 1: no contract start */}
                      {!mapping.contract_start && (
                        <div
                          className="px-4 py-3 flex items-start gap-3"
                          style={{
                            background: defaultContractStart ? "var(--kk-green-soft)" : "#FFFBEB",
                            borderBottom: !mapping.contract_end ? `1px solid ${anyUnresolved ? "#F59E0B" : "var(--kk-green)"}` : "none",
                          }}
                        >
                          {defaultContractStart
                            ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--kk-green)" }} />
                            : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#D97706" }} />
                          }
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium" style={{ color: "var(--kk-ink)" }}>
                              {defaultContractStart
                                ? `Start date: today (${defaultContractStart}) applied to all rows`
                                : "No contract start date column found"}
                            </p>
                            <p className="text-[11px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>
                              {defaultContractStart ? "Editable per row in the next step." : "Map a start date column below, or use today as a placeholder."}
                            </p>
                          </div>
                          {!defaultContractStart && (
                            <button
                              type="button"
                              className="kk-pill kk-pill-ghost shrink-0"
                              style={{ fontSize: 11, padding: "4px 10px", height: "auto" }}
                              onClick={() => setDefaultContractStart(new Date().toISOString().slice(0, 10))}
                            >
                              Add today
                            </button>
                          )}
                        </div>
                      )}
                      {/* Item 2: no contract end → duration default */}
                      {!mapping.contract_end && (
                        <div
                          className="px-4 py-3 flex items-center gap-2 flex-wrap"
                          style={{ background: defaultContractStart ? "var(--kk-green-soft)" : "#FFFBEB", fontSize: 12, color: "var(--kk-ink)" }}
                        >
                          {defaultContractStart
                            ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "var(--kk-green)" }} />
                            : <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "#D97706" }} />
                          }
                          <span style={{ color: "var(--kk-ink-mute)" }}>No contract end date — auto-filling</span>
                          <input
                            type="number" min={1} max={60} value={defaultDuration}
                            onChange={(e) => setDefaultDuration(parseInt(e.target.value) || 12)}
                            onWheel={(e) => e.currentTarget.blur()}
                            style={{ width: 44, padding: "2px 6px", border: `1px solid ${defaultContractStart ? "var(--kk-green)" : "#F59E0B"}`, borderRadius: 6, fontSize: 12, color: "var(--kk-ink)", background: defaultContractStart ? "var(--kk-green-soft)" : "#fff", textAlign: "center" }}
                          />
                          <span style={{ color: "var(--kk-ink-mute)" }}>months from start date</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {aiState === "loading" && (
                  <p className="text-[12px] flex items-center gap-1.5" style={{ color: "var(--kk-ink-mute)" }}>
                    <Lightbulb className="w-3.5 h-3.5" /> Checking unclear columns with AI…
                  </p>
                )}
                {aiState === "done" && aiConfidence && (
                  <p className="text-[12px] flex items-center gap-1.5" style={{ color: "var(--kk-ink-mute)" }}>
                    <Lightbulb className="w-3.5 h-3.5" style={{ color: "var(--kk-blue)" }} />
                    AI suggested the remaining columns ({aiConfidence} confidence). Double-check before importing.
                  </p>
                )}

                <MappingTable
                  headers={rawData.headers}
                  rows={rawData.sampleRows}
                  mapping={mapping}
                  defaultContractStart={defaultContractStart}
                  onChange={handleMappingChange}
                />

                {mapping.address && (mapping.parseAddressForUnit || mapping.parseAddressForCondo) && (
                  <AddressExtractionPreview
                    addressHeader={mapping.address}
                    rows={rawData.sampleRows}
                    extractUnit={mapping.parseAddressForUnit}
                    extractCondo={mapping.parseAddressForCondo}
                  />
                )}
              </div>

              <div style={{ padding: "14px 24px", borderTop: "1px solid var(--kk-border)", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  className="kk-pill kk-pill-ghost"
                  onClick={() => setStep("upload")}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="kk-pill kk-pill-primary"
                  disabled={!canProceed}
                  onClick={handleApplyMapping}
                >
                  Import {rawData.allRows.length} rows
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Review grid ── */}
          {step === "review" && (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div style={{ padding: "10px 24px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0, borderBottom: "1px solid var(--kk-border)", flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "var(--kk-ink-mute)" }}>{rows.length} rows</span>
                {missingCount > 0 ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#B45309" }}>
                    <AlertCircle size={13} />
                    {missingCount} row{missingCount > 1 ? "s" : ""} missing contract end date (amber)
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#15803D" }}>
                    <CheckCircle2 size={13} />
                    All rows have an end date
                  </span>
                )}
                <span style={{ fontSize: 11, color: "var(--kk-ink-mute)", marginLeft: "auto" }}>
                  <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#FFF3CD", border: "1px solid #F59E0B", marginRight: 4 }} />
                  Missing end date
                  <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#E8F4FD", border: "1px solid #93C5FD", marginRight: 4, marginLeft: 10 }} />
                  Auto-filled
                </span>
              </div>

              <div style={{ overflow: "auto", flex: 1 }}>
                <table style={{ borderCollapse: "collapse", minWidth: totalWidth, fontSize: 12, tableLayout: "fixed" }}>
                  <thead>
                    <tr style={{ background: "var(--kk-surface)", position: "sticky", top: 0, zIndex: 2 }}>
                      <th style={{ width: 40, minWidth: 40, padding: "6px 8px", borderRight: "1px solid var(--kk-border)", borderBottom: "2px solid var(--kk-border)", textAlign: "center", color: "var(--kk-ink-mute)", fontWeight: 500, fontSize: 11 }}>#</th>
                      {COLUMNS.map((c) => (
                        <th key={c.field} style={{ width: c.width, minWidth: c.width, maxWidth: c.width, padding: "6px 8px", borderRight: "1px solid var(--kk-border)", borderBottom: "2px solid var(--kk-border)", textAlign: "left", color: c.critical ? "var(--kk-ink)" : "var(--kk-ink-mute)", fontWeight: c.critical ? 600 : 500, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.label}{c.critical && <span style={{ color: "#F59E0B", marginLeft: 2 }}>*</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr key={ri} style={{ background: ri % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)" }}>
                        <td style={{ width: 40, minWidth: 40, padding: "0 8px", borderRight: "1px solid var(--kk-border)", borderBottom: "1px solid var(--kk-border)", textAlign: "center", color: "var(--kk-ink-mute)", fontSize: 11, userSelect: "none" }}>
                          {row._rowIndex}
                        </td>
                        {COLUMNS.map((c) => (
                          <EditableCell
                            key={c.field}
                            value={row[c.field] as string | number | null}
                            field={c.field}
                            isMissing={isCriticalMissing(row, c.field)}
                            isAutoFilled={!isCriticalMissing(row, c.field) && row._autoFilled.has(c.field as string)}
                            width={c.width}
                            type={c.type}
                            onChange={(val) => updateCell(ri, c.field, val)}
                          />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ padding: "14px 24px", borderTop: "1px solid var(--kk-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, gap: 12 }}>
                <button onClick={() => setStep("map")} disabled={importing} className="kk-pill kk-pill-ghost" style={{ opacity: importing ? 0.5 : 1 }}>
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="kk-pill kk-pill-primary"
                  style={{ opacity: importing ? 0.7 : 1 }}
                >
                  {importing ? "Importing..." : `Import ${rows.length} row${rows.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {step === "done" && (
            <div style={{ padding: "24px 24px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
              <CheckCircle2 size={40} color="#22C55E" />
              <div>
                <p style={{ fontSize: 16, fontWeight: 600, color: "var(--kk-ink)", margin: "0 0 6px" }}>
                  {importedCount} contract{importedCount !== 1 ? "s" : ""} imported
                </p>
                <p style={{ fontSize: 13, color: "var(--kk-ink-mute)", margin: 0 }}>
                  They now appear on your Existing Contracts board.
                </p>
              </div>
              <button onClick={() => { setOpen(false); reset(); }} className="kk-pill kk-pill-primary" style={{ marginTop: 4 }}>
                Done
              </button>
            </div>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
}
