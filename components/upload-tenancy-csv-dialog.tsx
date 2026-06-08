"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, X, AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  parseTenancyFile,
  isCriticalMissing,
  rowHasCriticalErrors,
  addMonths,
  type TenancyImportRow,
  CRITICAL_FIELDS,
} from "@/lib/tenancy-csv-import";

// ─── Column display config ────────────────────────────────────────────────────

interface ColDef {
  field: keyof TenancyImportRow;
  label: string;
  width: number;
  type: "text" | "number" | "date";
  critical: boolean;
}

const COLUMNS: ColDef[] = [
  { field: "property_name",           label: "Property",      width: 160, type: "text",   critical: true },
  { field: "unit",                    label: "Unit",          width: 90,  type: "text",   critical: true },
  { field: "owner_name",              label: "Owner Name",    width: 140, type: "text",   critical: true },
  { field: "owner_phone",             label: "Owner Phone",   width: 130, type: "text",   critical: true },
  { field: "tenant_name",             label: "Tenant Name",   width: 140, type: "text",   critical: false },
  { field: "tenant_phone",            label: "Tenant Phone",  width: 130, type: "text",   critical: false },
  { field: "amount",                  label: "Rent (RM)",     width: 100, type: "number", critical: true },
  { field: "contract_start",          label: "Start Date",    width: 115, type: "date",   critical: true },
  { field: "contract_end",            label: "End Date",      width: 115, type: "date",   critical: false },
  { field: "contract_duration_months",label: "Duration (mo)", width: 105, type: "number", critical: false },
  { field: "due_day",                 label: "Due Day",       width: 80,  type: "number", critical: false },
];

// ─── Cell editor ─────────────────────────────────────────────────────────────

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
    <td
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        padding: 0,
        borderRight: "1px solid #E5E7EB",
        borderBottom: "1px solid #E5E7EB",
        background: bg,
        position: "relative",
      }}
    >
      {isMissing && (
        <span style={{
          position: "absolute",
          top: 2,
          left: 2,
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "#F59E0B",
          zIndex: 1,
          pointerEvents: "none",
        }} />
      )}
      <input
        type={type === "date" ? "text" : type}
        value={displayVal}
        placeholder={type === "date" ? "YYYY-MM-DD" : ""}
        onChange={(e) => onChange(e.target.value)}
        data-field={field}
        style={{
          width: "100%",
          height: "100%",
          padding: "4px 6px 4px 10px",
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 12,
          color: "var(--kk-ink)",
          fontFamily: "inherit",
        }}
      />
    </td>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Step = "upload" | "review" | "done";

interface Props {
  trigger?: React.ReactNode;
  onImported?: () => void;
}

export function UploadTenancyCsvDialog({ trigger, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<TenancyImportRow[]>([]);
  const [defaultDuration, setDefaultDuration] = useState(12);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setRows([]);
    setImporting(false);
    setDefaultDuration(12);
    setDragOver(false);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const result = await parseTenancyFile(file, defaultDuration);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.rows.length === 0) {
      toast.error("No data rows found in the file.");
      return;
    }
    setRows(result.rows);
    setStep("review");
  }, [defaultDuration]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) await handleFile(file);
  }, [handleFile]);

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

      // Remove auto-filled marker when user manually edits
      autoFilled.delete(field as string);
      row._autoFilled = autoFilled;

      // Auto-derive contract_end if start + duration are both set
      if ((field === "contract_start" || field === "contract_duration_months") && row.contract_start) {
        const dur = row.contract_duration_months ?? defaultDuration;
        if (dur && !autoFilled.has("contract_end")) {
          // only recompute if contract_end was auto-filled, not user-set
        }
        if (field === "contract_start" && row.contract_duration_months) {
          row.contract_end = addMonths(rawVal, row.contract_duration_months);
          autoFilled.add("contract_end");
          row._autoFilled = autoFilled;
        }
      }

      next[rowIdx] = row;
      return next;
    });
  }

  async function handleImport() {
    const errorCount = rows.filter(rowHasCriticalErrors).length;
    if (errorCount > 0) {
      toast.error(`${errorCount} row${errorCount > 1 ? "s are" : " is"} still missing critical fields (highlighted in amber).`);
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
        throw new Error(err.error ?? "Import failed");
      }

      const data = await res.json() as { imported: number };
      setImportedCount(data.imported);
      setStep("done");
      onImported?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const missingCount = rows.filter(rowHasCriticalErrors).length;
  const totalWidth = COLUMNS.reduce((s, c) => s + c.width, 0) + 50; // +50 for row number col

  return (
    <>
      <span onClick={() => { reset(); setOpen(true); }} style={{ cursor: "pointer", display: "inline-flex" }}>
        {trigger ?? (
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--kk-border)",
              background: "var(--kk-surface)",
              color: "var(--kk-ink)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <Upload size={14} />
            Import CSV / Excel
          </button>
        )}
      </span>

      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); setOpen(v); }}>
        <DialogContent
          style={{
            maxWidth: step === "review" ? "min(98vw, 1100px)" : 480,
            width: "100%",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            padding: 0,
          }}
        >
          {/* Header */}
          <DialogHeader style={{ padding: "20px 24px 0", flexShrink: 0 }}>
            <DialogTitle style={{ fontSize: 17, fontWeight: 600, color: "var(--kk-ink)" }}>
              {step === "upload" && "Import Existing Contracts"}
              {step === "review" && `Review ${rows.length} rows`}
              {step === "done" && "Import Complete"}
            </DialogTitle>
          </DialogHeader>

          {/* ── Step 1: Upload ── */}
          {step === "upload" && (
            <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 13, color: "var(--kk-ink-mute)", margin: 0, lineHeight: 1.5 }}>
                Upload a CSV or Excel file with your existing tenancies. We will auto-detect columns and highlight any missing critical fields for you to fill in.
              </p>

              {/* Default duration */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: "var(--kk-ink)", whiteSpace: "nowrap" }}>
                  Default contract duration
                </span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(parseInt(e.target.value) || 12)}
                  style={{
                    width: 64,
                    padding: "5px 8px",
                    border: "1px solid var(--kk-border)",
                    borderRadius: 6,
                    fontSize: 13,
                    color: "var(--kk-ink)",
                    background: "var(--kk-surface)",
                    textAlign: "center",
                  }}
                />
                <span style={{ fontSize: 13, color: "var(--kk-ink-mute)" }}>months</span>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? "var(--kk-theme-dark)" : "var(--kk-border)"}`,
                  borderRadius: 12,
                  padding: "36px 24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  background: dragOver ? "rgba(0,0,0,0.03)" : "transparent",
                  transition: "border-color 150ms, background 150ms",
                }}
              >
                <FileSpreadsheet size={32} color="var(--kk-ink-mute)" />
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--kk-ink)" }}>
                  Click to upload or drag a file here
                </span>
                <span style={{ fontSize: 12, color: "var(--kk-ink-mute)" }}>
                  CSV, XLS, or XLSX — max 5 000 rows
                </span>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) await handleFile(f);
                  e.target.value = "";
                }}
              />

              {/* Column guide */}
              <div style={{
                background: "var(--kk-surface)",
                border: "1px solid var(--kk-border)",
                borderRadius: 8,
                padding: "10px 14px",
              }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--kk-ink)", margin: "0 0 6px" }}>
                  Critical columns (amber if missing)
                </p>
                <p style={{ fontSize: 11, color: "var(--kk-ink-mute)", margin: 0, lineHeight: 1.6 }}>
                  property_name, unit, owner_name, owner_phone, contract_start, amount (rental)
                </p>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--kk-ink)", margin: "8px 0 4px" }}>
                  Optional columns
                </p>
                <p style={{ fontSize: 11, color: "var(--kk-ink-mute)", margin: 0, lineHeight: 1.6 }}>
                  contract_end, contract_duration_months, tenant_name, tenant_phone, due_day
                </p>
              </div>
            </div>
          )}

          {/* ── Step 2: Review grid ── */}
          {step === "review" && (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              {/* Status bar */}
              <div style={{
                padding: "10px 24px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexShrink: 0,
                borderBottom: "1px solid var(--kk-border)",
                flexWrap: "wrap",
              }}>
                <span style={{ fontSize: 13, color: "var(--kk-ink-mute)" }}>
                  {rows.length} rows detected
                </span>
                {missingCount > 0 ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#B45309" }}>
                    <AlertCircle size={13} />
                    {missingCount} row{missingCount > 1 ? "s have" : " has"} amber cells — fill them in before importing
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#15803D" }}>
                    <CheckCircle2 size={13} />
                    All critical fields filled
                  </span>
                )}
                <span style={{ fontSize: 11, color: "var(--kk-ink-mute)", marginLeft: "auto" }}>
                  <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#FFF3CD", border: "1px solid #F59E0B", marginRight: 4 }} />
                  Missing critical field
                  <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#E8F4FD", border: "1px solid #93C5FD", marginRight: 4, marginLeft: 10 }} />
                  Auto-filled
                </span>
              </div>

              {/* Scrollable grid */}
              <div style={{ overflow: "auto", flex: 1 }}>
                <table
                  style={{
                    borderCollapse: "collapse",
                    minWidth: totalWidth,
                    fontSize: 12,
                    tableLayout: "fixed",
                  }}
                >
                  <thead>
                    <tr style={{ background: "var(--kk-surface)", position: "sticky", top: 0, zIndex: 2 }}>
                      <th style={{
                        width: 40,
                        minWidth: 40,
                        padding: "6px 8px",
                        borderRight: "1px solid var(--kk-border)",
                        borderBottom: "2px solid var(--kk-border)",
                        textAlign: "center",
                        color: "var(--kk-ink-mute)",
                        fontWeight: 500,
                        fontSize: 11,
                      }}>
                        #
                      </th>
                      {COLUMNS.map((c) => (
                        <th
                          key={c.field}
                          style={{
                            width: c.width,
                            minWidth: c.width,
                            maxWidth: c.width,
                            padding: "6px 8px",
                            borderRight: "1px solid var(--kk-border)",
                            borderBottom: "2px solid var(--kk-border)",
                            textAlign: "left",
                            color: c.critical ? "var(--kk-ink)" : "var(--kk-ink-mute)",
                            fontWeight: c.critical ? 600 : 500,
                            fontSize: 11,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {c.label}
                          {c.critical && (
                            <span style={{ color: "#F59E0B", marginLeft: 2 }}>*</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr
                        key={ri}
                        style={{ background: ri % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)" }}
                      >
                        <td style={{
                          width: 40,
                          minWidth: 40,
                          padding: "0 8px",
                          borderRight: "1px solid var(--kk-border)",
                          borderBottom: "1px solid var(--kk-border)",
                          textAlign: "center",
                          color: "var(--kk-ink-mute)",
                          fontSize: 11,
                          userSelect: "none",
                        }}>
                          {row._rowIndex}
                        </td>
                        {COLUMNS.map((c) => {
                          const rawVal = row[c.field];
                          const missing = isCriticalMissing(row, c.field);
                          const autoFilled = row._autoFilled.has(c.field as string);
                          return (
                            <EditableCell
                              key={c.field}
                              value={rawVal as string | number | null}
                              field={c.field}
                              isMissing={missing}
                              isAutoFilled={!missing && autoFilled}
                              width={c.width}
                              type={c.type}
                              onChange={(val) => updateCell(ri, c.field, val)}
                            />
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div style={{
                padding: "14px 24px",
                borderTop: "1px solid var(--kk-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
                gap: 12,
              }}>
                <button
                  onClick={() => { setStep("upload"); setRows([]); }}
                  disabled={importing}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--kk-border)",
                    background: "var(--kk-surface)",
                    color: "var(--kk-ink)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    opacity: importing ? 0.5 : 1,
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  style={{
                    padding: "8px 20px",
                    borderRadius: 8,
                    border: "none",
                    background: missingCount > 0 ? "#9CA3AF" : "var(--kk-theme-dark)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: importing ? "not-allowed" : "pointer",
                    opacity: importing ? 0.7 : 1,
                  }}
                >
                  {importing ? "Importing..." : `Import ${rows.length} row${rows.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Done ── */}
          {step === "done" && (
            <div style={{
              padding: "24px 24px 28px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              textAlign: "center",
            }}>
              <CheckCircle2 size={40} color="#22C55E" />
              <div>
                <p style={{ fontSize: 16, fontWeight: 600, color: "var(--kk-ink)", margin: "0 0 6px" }}>
                  {importedCount} contract{importedCount !== 1 ? "s" : ""} imported
                </p>
                <p style={{ fontSize: 13, color: "var(--kk-ink-mute)", margin: 0 }}>
                  They now appear on your Existing Contracts board.
                </p>
              </div>
              <button
                onClick={() => { setOpen(false); reset(); }}
                style={{
                  padding: "9px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--kk-theme-dark)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginTop: 4,
                }}
              >
                Done
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
