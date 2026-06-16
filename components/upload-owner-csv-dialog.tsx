"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { importParsedOwnerLeads, type ImportResult } from "@/lib/actions";
import {
  detectColumns, refreshMappingFlags, parseOwnerAddress, parseSpreadsheetRows,
  type ColumnMapping,
} from "@/lib/csv-import";
import { Upload, FileText, AlertCircle, CheckCircle2, X, Download, ArrowRight, ChevronLeft, Lightbulb } from "lucide-react";
import { UploadRing } from "@/components/ui/upload-ring";
import { toast } from "sonner";

type Step = "pick" | "map" | "result";

const FIELD_LABELS: Record<string, string> = {
  owner_name:    "Owner name",
  owner_phone:   "Phone number",
  address:       "Address",
  property_name: "Property / condo name",
  unit:          "Unit number",
  expected_rent: "Expected rent (RM)",
  bedrooms:      "Bedrooms",
  bathrooms:     "Bathrooms",
  notes:         "Notes",
};

const REQUIRED_FIELDS = ["owner_name", "owner_phone"] as const;
const DISPLAY_FIELDS = [
  "owner_name", "owner_phone", "address",
  "property_name", "unit", "expected_rent", "bedrooms", "bathrooms", "notes",
] as const;

interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
  total: number;
}

export function UploadOwnerCsvDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function reset() {
    setFile(null);
    setParsedData(null);
    setMapping(null);
    setResult(null);
    setStep("pick");
  }

  function handleAnalyse() {
    if (!file) return;
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      let headers: string[];
      let rows: Record<string, string>[];

      if (isExcel) {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
        ({ headers, rows } = parseSpreadsheetRows(rawRows));
      } else {
        const parsed = Papa.parse<Record<string, string>>(e.target?.result as string, {
          header: true,
          skipEmptyLines: true,
        });
        headers = parsed.meta.fields ?? [];
        rows = parsed.data;
      }

      const detected = detectColumns(headers, rows);

      // Merge saved column preferences: if a saved mapping's value exists in
      // the current file's headers, prefer it over the auto-detected value.
      try {
        const saved = JSON.parse(localStorage.getItem("kk-csv-mapping") ?? "{}") as Partial<ColumnMapping>;
        const merged = { ...detected };
        for (const [k, v] of Object.entries(saved)) {
          if (typeof v === "string" && headers.includes(v)) {
            (merged as Record<string, unknown>)[k] = v;
          }
        }
        setParsedData({ headers, rows, total: rows.length });
        setMapping(refreshMappingFlags(merged));
      } catch {
        setParsedData({ headers, rows, total: rows.length });
        setMapping(detected);
      }
      setStep("map");
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  }

  function handleMappingChange(field: keyof ColumnMapping, value: string) {
    if (!mapping) return;
    const updated = { ...mapping, [field]: value === "__none__" ? null : value };
    const refreshed = refreshMappingFlags(updated);
    setMapping(refreshed);
    // Persist non-null string mappings so the next import starts with these columns
    try {
      const toSave: Partial<ColumnMapping> = {};
      for (const [k, v] of Object.entries(refreshed)) {
        if (typeof v === "string") (toSave as Record<string, unknown>)[k] = v;
      }
      localStorage.setItem("kk-csv-mapping", JSON.stringify(toSave));
    } catch { /* ignore */ }
  }

  async function handleImport() {
    if (!parsedData || !mapping) return;
    setImportProgress(0);

    // Animate progress while server processes — ticks up fast then slows near 90%
    const ticker = setInterval(() => {
      setImportProgress((p) => {
        if (p === null || p >= 90) return p;
        return p + (p < 50 ? 9 : p < 75 ? 5 : 1);
      });
    }, 120);

    try {
      const res = await importParsedOwnerLeads(parsedData.rows, mapping);
      clearInterval(ticker);
      setImportProgress(100);
      await new Promise((r) => setTimeout(r, 280));
      setImportProgress(null);
      setResult(res);
      setStep("result");
      if (res.ok) { toast.success(res.message); router.refresh(); }
      else toast.error(res.message);
    } catch {
      clearInterval(ticker);
      setImportProgress(null);
      toast.error("Import failed. Please try again.");
    }
  }

  function downloadSample() {
    const csv = `name,phone,property,unit,expected_rent,bedrooms,bathrooms,notes
Ali bin Hassan,0123456789,Residensi Mutiara,A-12,1800,3,2,Wants to rent
Tan Mei Ling,+60127778888,Sri Damansara,B-03,2200,2,2,
Raj Kumar,60181112222,,,1500,2,1,Walk-in lead
`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kakisewa-owner-list-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const canImport = mapping &&
    REQUIRED_FIELDS.every((f) => mapping[f] !== null);

  return (
    <>
      <button
        id="tour-btn-upload-csv"
        type="button"
        className="kk-pill kk-pill-white"
        style={{ background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.12)", border: "1px solid rgba(0,0,0,0.08)" }}
        onClick={() => setOpen(true)}
      >
        <Upload className="w-3.5 h-3.5" /> Upload file
      </button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) reset();
          setOpen(o);
        }}
      >
        <DialogContent showCloseButton={false} className="bg-card border-border max-w-xl overflow-hidden">
          <div className="space-y-5 overflow-hidden w-full">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                {step === "map" && (
                  <button
                    type="button"
                    onClick={() => setStep("pick")}
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <div>
                  <p className="kk-overline mb-1">Bulk import</p>
                  <h2 className="text-[18px] font-semibold leading-tight" style={{ color: "var(--kk-ink)", letterSpacing: "-0.014em" }}>
                    {step === "pick" && "Upload owner list"}
                    {step === "map"  && "Confirm column mapping"}
                    {step === "result" && "Import complete"}
                  </h2>
                  {step === "pick" && (
                    <p className="text-[13px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>
                      CSV with at minimum a name and phone column.
                    </p>
                  )}
                  {step === "map" && parsedData && (
                    <p className="text-[13px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>
                      {parsedData.total} rows detected · confirm how kakisewa reads each column
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

            {/* ── Step 1: Pick file ── */}
            {step === "pick" && (
              <>
                <button
                  type="button"
                  onClick={downloadSample}
                  className="flex items-center gap-1.5 text-[12px] font-medium hover:underline"
                  style={{ color: "var(--kk-blue)" }}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download sample CSV
                </button>

                <div
                  onClick={() => inputRef.current?.click()}
                  className="rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors select-none"
                  style={{
                    border: `1.5px dashed ${file ? "var(--kk-blue)" : "var(--kk-line-strong)"}`,
                    background: file ? "var(--kk-blue-soft)" : "var(--kk-surface-2)",
                  }}
                >
                  {file ? (
                    <>
                      <FileText className="w-7 h-7" style={{ color: "var(--kk-blue)" }} />
                      <div className="text-center">
                        <p className="text-[13px] font-medium" style={{ color: "var(--kk-ink)" }}>{file.name}</p>
                        <p className="text-[11px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>
                          {(file.size / 1024).toFixed(1)} KB · click to replace
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6" style={{ color: "var(--kk-ink-mute)" }} />
                      <div className="text-center">
                        <p className="text-[13px] font-medium" style={{ color: "var(--kk-ink)" }}>
                          Click to pick a CSV file
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>
                          .csv, .xlsx, or .xls from Excel / Google Sheets
                        </p>
                      </div>
                    </>
                  )}
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>

                <div
                  className="rounded-xl px-3.5 py-3 flex items-start gap-2"
                  style={{ background: "var(--kk-amber-soft)", color: "#B45309" }}
                >
                  <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-[12px] leading-relaxed">
                    Tip: if this is your first time uploading this file, try just 10 rows first to confirm the columns map correctly before uploading the rest.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" className="kk-pill kk-pill-ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="kk-pill kk-pill-primary"
                    disabled={!file}
                    onClick={handleAnalyse}
                  >
                    Analyse columns <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}

            {/* ── Step 2: Confirm mapping ── */}
            {step === "map" && mapping && parsedData && (
              <>
                <MappingTable
                  headers={parsedData.headers}
                  rows={parsedData.rows}
                  mapping={mapping}
                  onChange={handleMappingChange}
                />

                {/* Address extraction preview */}
                {mapping.address && (mapping.parseAddressForUnit || mapping.parseAddressForCondo) && (
                  <AddressExtractionPreview
                    addressHeader={mapping.address}
                    rows={parsedData.rows}
                    extractUnit={mapping.parseAddressForUnit}
                    extractCondo={mapping.parseAddressForCondo}
                  />
                )}

                {!canImport && (
                  <p className="text-[12px]" style={{ color: "var(--kk-red)" }}>
                    Owner name and phone number must be mapped before importing.
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" className="kk-pill kk-pill-ghost" onClick={() => setStep("pick")}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="kk-pill kk-pill-primary relative overflow-hidden"
                    disabled={!canImport || importProgress !== null}
                    onClick={handleImport}
                    style={{ minWidth: 148 }}
                  >
                    {importProgress !== null ? (
                      <>
                        <UploadRing progress={importProgress} size={15} color="#fff" />
                        Importing…
                        {/* Thin fill bar along the button bottom */}
                        <span
                          style={{
                            position: "absolute", bottom: 0, left: 0, height: 2,
                            width: `${importProgress}%`,
                            background: "rgba(255,255,255,0.45)",
                            borderRadius: 99,
                            transition: "width 0.12s ease",
                          }}
                        />
                      </>
                    ) : (
                      <>Import {parsedData.total} rows</>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* ── Step 3: Result ── */}
            {step === "result" && result && (
              <div className="space-y-4">
                <div
                  className="rounded-2xl p-4 flex items-start gap-3"
                  style={{
                    background: result.imported > 0 ? "var(--kk-green-soft)" : "var(--kk-red-soft)",
                  }}
                >
                  {result.imported > 0 ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "var(--kk-green)" }} />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0" style={{ color: "var(--kk-red)" }} />
                  )}
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold" style={{ color: "var(--kk-ink)" }}>
                      {result.message}
                    </p>
                    <p className="text-[12px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>
                      Total rows scanned: {result.total} · Imported: {result.imported} · Skipped: {result.skipped}
                    </p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="rounded-2xl p-4 max-h-[200px] overflow-y-auto" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
                    <p className="kk-overline mb-3">Skipped rows ({result.errors.length})</p>
                    <ul className="space-y-2">
                      {result.errors.slice(0, 20).map((e) => (
                        <li key={e.rowNumber} className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>
                          <span className="font-mono">Row {e.rowNumber}:</span> {e.errors.join(", ")}
                          {e.owner_name && <span className="ml-1" style={{ color: "var(--kk-ink-faint)" }}>({e.owner_name})</span>}
                        </li>
                      ))}
                      {result.errors.length > 20 && (
                        <li className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
                          …and {result.errors.length - 20} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" className="kk-pill kk-pill-ghost" onClick={reset}>
                    Upload another
                  </button>
                  <button type="button" className="kk-pill kk-pill-primary" onClick={() => setOpen(false)}>
                    Done
                  </button>
                </div>
              </div>
            )}

          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Mapping table ────────────────────────────────────────────────────────────

function MappingTable({
  headers,
  rows,
  mapping,
  onChange,
}: {
  headers: string[];
  rows: Record<string, string>[];
  mapping: ColumnMapping;
  onChange: (field: keyof ColumnMapping, value: string) => void;
}) {
  const sample = rows.slice(0, 3);

  const fieldsToShow = DISPLAY_FIELDS.filter((f) => {
    if (REQUIRED_FIELDS.includes(f as typeof REQUIRED_FIELDS[number])) return true;
    if (mapping[f as keyof ColumnMapping]) return true;
    if (f === "address") return headers.length > 0;
    return false;
  });

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
      {fieldsToShow.map((field, i) => {
        const isLast = i === fieldsToShow.length - 1;
        const mappedHeader = mapping[field as keyof ColumnMapping] as string | null;
        const isRequired = REQUIRED_FIELDS.includes(field as typeof REQUIRED_FIELDS[number]);
        const showAsterisk = isRequired || field === "address";
        const isMissing = isRequired && !mappedHeader;

        const sampleValues = mappedHeader
          ? sample.map((r) => (r[mappedHeader] ?? "").trim()).filter(Boolean)
          : [];

        const isFromAddress =
          (field === "unit" && mapping.parseAddressForUnit) ||
          (field === "property_name" && mapping.parseAddressForCondo);

        return (
          <div
            key={field}
            className="px-4 py-3 flex items-start gap-3 overflow-hidden"
            style={{
              borderBottom: isLast ? "none" : "1px solid var(--kk-line)",
              background: isMissing ? "var(--kk-red-soft)" : "transparent",
            }}
          >
            {/* Field label */}
            <div className="w-[120px] shrink-0 pt-0.5">
              <p className="text-[12px] font-semibold" style={{ color: isMissing ? "var(--kk-red)" : "var(--kk-ink)" }}>
                {FIELD_LABELS[field]}
                {showAsterisk && <span style={{ color: "var(--kk-red)" }}> *</span>}
              </p>
            </div>

            {/* Column picker */}
            <div className="flex-1 min-w-0">
              {isFromAddress ? (
                <span className="text-[12px] italic" style={{ color: "var(--kk-ink-mute)" }}>
                  extracted from address
                </span>
              ) : (
                <select
                  value={mappedHeader ?? "__none__"}
                  onChange={(e) => onChange(field as keyof ColumnMapping, e.target.value)}
                  className="w-full text-[12px] rounded-lg px-2 py-1.5 outline-none"
                  style={{
                    background: "var(--kk-surface-2)",
                    border: `1px solid ${isMissing ? "var(--kk-red)" : "var(--kk-line)"}`,
                    color: "var(--kk-ink)",
                  }}
                >
                  <option value="__none__">(not in file)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              )}

              {/* Sample values */}
              {sampleValues.length > 0 && (
                <p
                  className="text-[11px] mt-1 truncate overflow-hidden"
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
  const samples = rows
    .slice(0, 3)
    .map((r) => (r[addressHeader] ?? "").trim())
    .filter(Boolean);

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
            <p className="font-mono truncate w-full" style={{ color: "var(--kk-ink-faint)", fontSize: "11px" }} title={raw}>{raw}</p>
            <div className="flex flex-wrap gap-3 pl-1">
              {extractUnit && (
                <span style={{ color: "var(--kk-ink)" }}>
                  Unit: <strong>{unit ?? "—"}</strong>
                </span>
              )}
              {extractCondo && (
                <span style={{ color: "var(--kk-ink)" }}>
                  Property: <strong>{propertyName ?? "—"}</strong>
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
