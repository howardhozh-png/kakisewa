"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const WA_DAILY_KEY = "kk_wa_daily";
const WA_CAP_KEY   = "kk_wa_cap";
const WA_DEFAULT_CAP = 40;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function useDailyWaCount(): [number, () => void, number, (n: number) => void] {
  const [count, setCount] = useState(0);
  const [cap, setCap] = useState(WA_DEFAULT_CAP);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WA_DAILY_KEY);
      if (raw) {
        const { date, count: n } = JSON.parse(raw);
        if (date === todayStr()) setCount(n);
      }
      const savedCap = localStorage.getItem(WA_CAP_KEY);
      if (savedCap) setCap(parseInt(savedCap, 10) || WA_DEFAULT_CAP);
    } catch {}
  }, []);

  const increment = useCallback(() => {
    setCount((prev) => {
      const next = prev + 1;
      try { localStorage.setItem(WA_DAILY_KEY, JSON.stringify({ date: todayStr(), count: next })); } catch {}
      return next;
    });
  }, []);

  const updateCap = useCallback((n: number) => {
    setCap(n);
    try { localStorage.setItem(WA_CAP_KEY, String(n)); } catch {}
  }, []);

  return [count, increment, cap, updateCap];
}
import { OwnerLead } from "@/lib/types";
import { generateOwnerIntakeLink, bulkExportOwnerLeads, bulkMarkOwnerLeadsContacted, setOwnerLeadStage, bulkSetOwnerLeadStage, updateOwnerLeadDetails, saveOwnerLeadPhotos, removeOwnerLead, bulkDeleteOwnerLeads } from "@/lib/actions";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { Loader2, X, ChevronDown, Check, Camera, ArrowRight, Download, FileSpreadsheet, FileText, MessageCircle, Pencil, Search } from "lucide-react";
import { UploadRing } from "@/components/ui/upload-ring";
import { compressImage } from "@/lib/compress-image";
import { uploadWithProgress } from "@/lib/upload-with-progress";
import { DateInput } from "@/components/ui/date-input";
import { toast } from "sonner";

type Filter = "all" | "unsent" | "contacted" | "listed" | "rented" | "declined";
type ContactStatus = "listed" | "rented" | "contacted" | "unsent" | "declined";

function getStatus(lead: OwnerLead): ContactStatus {
  if (lead.stage === "matched") return "rented";
  if (lead.stage === "own_stay" || lead.stage === "archived") return "declined";
  if (
    lead.stage === "listed" ||
    lead.stage === "replied" || lead.stage === "wants_rent" ||
    lead.intake_completed_at
  ) return "listed";
  if ((lead.outreach_count ?? 0) > 0) return "contacted";
  return "unsent";
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const wks = Math.floor(days / 7);
  if (wks < 5) return `${wks}wk ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function sentBg(n: number) {
  if (n >= 3) return { bg: "#FEE2E2", color: "#991B1B" };
  if (n === 2) return { bg: "#FFEDD5", color: "#9A3412" };
  return { bg: "#FEF3C7", color: "#92400E" };
}

function StatusBadge({ lead }: { lead: OwnerLead }) {
  const status = getStatus(lead);
  const count = lead.outreach_count ?? 0;

  let bg: string, color: string, label: string;
  if (status === "rented") {
    bg = "rgba(52,199,89,0.12)"; color = "#1F8B4C"; label = "Rented";
  } else if (status === "declined") {
    bg = "rgba(0,0,0,0.06)"; color = "var(--kk-ink-mute)"; label = lead.stage === "own_stay" ? "Own stay" : "Archived";
  } else if (status === "listed") {
    bg = "rgba(0,113,227,0.10)"; color = "var(--kk-blue)"; label = "Listed";
  } else if (status === "contacted") {
    const s = sentBg(count);
    bg = s.bg; color = s.color;
    label = count === 1 ? "Sent × 1" : count === 2 ? "Sent × 2" : `Sent × ${count}`;
  } else {
    bg = "rgba(0,0,0,0.05)"; color = "var(--kk-ink-mute)"; label = "Uncontacted";
  }

  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  );
}

// ─── Lead detail popup (fully editable) ──────────────────────────────────────

const FIELD_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--kk-surface-2)",
  border: "1px solid var(--kk-line)",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 13,
  color: "var(--kk-ink)",
  outline: "none",
};

function LeadPopup({
  lead,
  onClose,
  onSaved,
  onMoveToListed,
  onDelete,
}: {
  lead: OwnerLead;
  onClose: () => void;
  onSaved: (id: string, updates: Partial<OwnerLead>) => void;
  onMoveToListed: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [form, setForm] = useState({
    owner_name: lead.owner_name ?? "",
    owner_phone: lead.owner_phone ?? "",
    property_name: lead.property_name ?? "",
    unit: lead.unit ?? "",
    expected_rent: lead.expected_rent != null ? String(lead.expected_rent) : "",
    bedrooms: lead.bedrooms != null ? String(lead.bedrooms) : "",
    bathrooms: lead.bathrooms != null ? String(lead.bathrooms) : "",
    notes: lead.notes ?? "",
    available_from: lead.available_from ?? "",
  });
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [moving, setMoving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photos, setPhotos] = useState<string[]>(lead.photo_urls ?? []);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const status = getStatus(lead);

  const dirty =
    form.owner_name !== (lead.owner_name ?? "") ||
    form.owner_phone !== (lead.owner_phone ?? "") ||
    form.property_name !== (lead.property_name ?? "") ||
    form.unit !== (lead.unit ?? "") ||
    form.expected_rent !== (lead.expected_rent != null ? String(lead.expected_rent) : "") ||
    form.bedrooms !== (lead.bedrooms != null ? String(lead.bedrooms) : "") ||
    form.bathrooms !== (lead.bathrooms != null ? String(lead.bathrooms) : "") ||
    form.notes !== (lead.notes ?? "") ||
    form.available_from !== (lead.available_from ?? "");

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    setFieldErrors((prev) => { const s = new Set(prev); s.delete(field); return s; });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updates: Partial<OwnerLead> = {
        owner_name: form.owner_name || undefined,
        owner_phone: form.owner_phone || undefined,
        property_name: form.property_name || undefined,
        unit: form.unit || undefined,
        expected_rent: form.expected_rent ? Number(form.expected_rent) : undefined,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        notes: form.notes || undefined,
        available_from: form.available_from || undefined,
      };
      await updateOwnerLeadDetails(lead.id, updates);
      onSaved(lead.id, updates);
      setSaved(true);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleMoveToListed() {
    if (status === "contacted") {
      const errors = new Set<string>();
      if (!form.expected_rent) errors.add("expected_rent");
      if (!form.bedrooms) errors.add("bedrooms");
      if (!form.bathrooms) errors.add("bathrooms");
      if (errors.size > 0) {
        setFieldErrors(errors);
        toast.error("Fill in Rent, Bedrooms, and Bathrooms first");
        return;
      }
    }
    setMoving(true);
    try {
      await onMoveToListed(lead.id);
      onClose();
    } finally {
      setMoving(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadProgress(0);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i]);
        const fd = new FormData();
        fd.append("leadId", lead.id);
        fd.append("file", compressed);
        const { ok, data } = await uploadWithProgress("/api/agent/photo", fd, (pct) => {
          setUploadProgress(Math.round((i * 100 + pct) / files.length));
        });
        if (ok && data.url) newUrls.push(data.url as string);
      }
      if (newUrls.length > 0) {
        const updated = [...photos, ...newUrls];
        setPhotos(updated);
        await saveOwnerLeadPhotos(lead.id, updated);
        onSaved(lead.id, { photo_urls: updated });
      }
    } catch {
      toast.error("Photo upload failed");
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemovePhoto(url: string) {
    const updated = photos.filter((u) => u !== url);
    setPhotos(updated);
    onSaved(lead.id, { photo_urls: updated });
    await saveOwnerLeadPhotos(lead.id, updated).catch(() => toast.error("Failed to remove photo"));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)" }} />

      <div
        className="relative w-full sm:max-w-lg mx-auto rounded-t-2xl sm:rounded-2xl overflow-hidden overflow-y-auto"
        style={{ background: "var(--kk-surface)", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--kk-line)" }}>
          <div className="flex-1 min-w-0 mr-3">
            <div className="flex items-center gap-1.5">
              <input
                ref={nameInputRef}
                value={form.owner_name}
                onChange={(e) => set("owner_name", e.target.value)}
                className="text-[16px] font-semibold flex-1 min-w-0 bg-transparent outline-none border-b border-transparent focus:border-[var(--kk-line)]"
                style={{ color: "var(--kk-ink)" }}
                placeholder="Owner name"
              />
              <button
                type="button"
                onClick={() => nameInputRef.current?.focus()}
                className="shrink-0 p-1 rounded-full transition-opacity hover:opacity-60"
                style={{ color: "var(--kk-ink-faint)" }}
                aria-label="Edit owner name and phone"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              value={form.owner_phone}
              onChange={(e) => set("owner_phone", e.target.value)}
              className="text-[12px] w-full bg-transparent outline-none border-b border-transparent focus:border-[var(--kk-line)] mt-1"
              style={{ color: "var(--kk-ink-mute)" }}
              placeholder="Phone"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge lead={lead} />
            <button type="button" onClick={onClose} className="rounded-full p-1 transition-opacity hover:opacity-60" style={{ color: "var(--kk-ink-mute)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Editable fields */}
        <div className="px-5 py-4 grid grid-cols-2 gap-x-4 gap-y-3">
          {[
            { label: "Property", field: "property_name" as const, colSpan: 2, placeholder: "e.g. Agile Mont Kiara" },
            { label: "Unit", field: "unit" as const, placeholder: "e.g. A-12-05" },
            { label: "Rent (RM)", field: "expected_rent" as const, type: "number", placeholder: "e.g. 2500", req: true },
            { label: "Bedrooms", field: "bedrooms" as const, type: "number", placeholder: "e.g. 3", req: true },
            { label: "Bathrooms", field: "bathrooms" as const, type: "number", placeholder: "e.g. 2", req: true },
            { label: "Available from", field: "available_from" as const, type: "date", placeholder: "" },
          ].map(({ label, field, type, colSpan, placeholder, req }) => (
            <div key={field} className={colSpan === 2 ? "col-span-2" : ""}>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: fieldErrors.has(field) ? "#ef4444" : "var(--kk-ink-faint)" }}>
                {label}{req && status === "contacted" && <span style={{ color: "#ef4444" }}> *</span>}
              </p>
              {type === "date"
                ? <DateInput value={form[field]} onChange={(v) => set(field, v)} style={{ ...FIELD_STYLE, borderColor: fieldErrors.has(field) ? "#ef4444" : "var(--kk-line)" }} />
                : <input type={type ?? "text"} value={form[field]} onChange={(e) => set(field, e.target.value)} style={{ ...FIELD_STYLE, borderColor: fieldErrors.has(field) ? "#ef4444" : "var(--kk-line)" }} placeholder={placeholder} />
              }
            </div>
          ))}
          <div className="col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-faint)" }}>Notes</p>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              style={{ ...FIELD_STYLE, resize: "none" }}
              placeholder="e.g. No pets, working professional preferred"
            />
          </div>

          {/* Read-only info */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--kk-ink-faint)" }}>Last sent</p>
            <p className="text-[13px]" style={{ color: "var(--kk-ink)", textTransform: "none" }}>{relativeTime(lead.intake_sent_at)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--kk-ink-faint)" }}>Form completed</p>
            <p className="text-[13px]" style={{ color: "var(--kk-ink)", textTransform: "none" }}>
              {lead.intake_completed_at ? relativeTime(lead.intake_completed_at) : "not yet"}
            </p>
          </div>
        </div>

        {/* Photos */}
        <div className="px-5 pb-4" style={{ borderTop: "1px solid var(--kk-line)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide mt-4 mb-2" style={{ color: "var(--kk-ink-faint)" }}>Photos</p>
          <div className="flex flex-wrap gap-2">
            {photos.map((url) => (
              <div key={url} className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0" style={{ border: "1px solid var(--kk-line)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(url)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.55)" }}
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {uploadProgress !== null ? (
              <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0" style={{ border: "1.5px solid var(--kk-line)" }}>
                <UploadRing progress={uploadProgress} size={36} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 shrink-0 transition-opacity hover:opacity-70"
                style={{ border: "1.5px dashed var(--kk-line)", color: "var(--kk-ink-mute)" }}
              >
                <Camera className="w-4 h-4" />
                <span className="text-[10px] font-medium">Add</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          {dirty && (
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="w-full py-2.5 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--kk-ink)", color: "#fff" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
              {saving ? "Saving…" : "Save changes"}
            </button>
          )}
          {status === "listed" ? (
            <button
              type="button"
              onClick={() => { onClose(); router.push(`/new-owners?tab=pipeline&highlight=${lead.id}`); }}
              className="w-full py-3 rounded-xl text-[14px] font-semibold transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: "var(--kk-blue)", color: "#fff" }}
            >
              Go to card
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : !["matched", "own_stay", "archived"].includes(lead.stage) ? (
            <button
              type="button"
              disabled={moving}
              onClick={handleMoveToListed}
              className="w-full py-3 rounded-xl text-[14px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "var(--kk-blue)", color: "#fff" }}
            >
              {moving && <Loader2 className="w-4 h-4 animate-spin" />}
              Move to Listed
            </button>
          ) : null}

          {/* Delete — always shown */}
          {!deleteConfirm ? (
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="w-full py-2 rounded-xl text-[13px] font-medium transition-opacity hover:opacity-70"
              style={{ background: "transparent", color: "#AEAEB2", border: "1px solid rgba(0,0,0,0.08)" }}
            >
              Delete lead
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2 rounded-xl text-[13px] font-medium"
                style={{ background: "transparent", color: "var(--kk-ink-mute)", border: "1px solid rgba(0,0,0,0.10)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  await onDelete(lead.id);
                  onClose();
                }}
                className="flex-1 py-2 rounded-xl text-[13px] font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: "#FF3B30", color: "#fff" }}
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Daily WA counter widget ──────────────────────────────────────────────────

function WaDailyCounter({ count, cap, onCapChange }: { count: number; cap: number; onCapChange: (n: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(cap));
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(String(cap));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commitEdit() {
    const n = parseInt(draft, 10);
    if (n > 0) onCapChange(n);
    else setDraft(String(cap));
    setEditing(false);
  }

  const pct = Math.min((count / cap) * 100, 100);
  const remaining = Math.max(cap - count, 0);
  const warn = cap > 1 ? Math.round(cap * 0.75) : cap;

  const { color, bg, statusLabel } =
    count >= cap
      ? { color: "#DC2626", bg: "rgba(220,38,38,0.08)", statusLabel: "Daily cap reached" }
      : count >= warn
      ? { color: "#D97706", bg: "rgba(217,119,6,0.08)", statusLabel: "Slow down" }
      : { color: "#1F8B4C", bg: "rgba(52,199,89,0.07)", statusLabel: "Safe" };

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-4"
      style={{ background: bg, border: `1px solid ${color}22` }}
    >
      <WhatsAppIcon className="w-4 h-4 shrink-0" style={{ color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[12px] font-semibold" style={{ color }}>
            {count} sent today
          </span>
          <span className="text-[11px] font-medium" style={{ color: count >= cap ? color : "var(--kk-ink-faint)" }}>
            {count >= cap ? statusLabel : count >= warn ? `${remaining} remaining · ${statusLabel}` : `${remaining} remaining`}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>

      {/* Editable cap */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>Daily cap:</span>
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            min={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
            className="text-[12px] font-semibold text-center outline-none rounded-md px-1"
            style={{ width: 46, background: "#fff", border: "1px solid rgba(0,0,0,0.12)", color: "var(--kk-ink)", boxShadow: "0 1px 4px rgba(0,0,0,0.10)" }}
          />
        ) : (
          <button
            onClick={startEdit}
            className="text-[12px] font-semibold px-2.5 py-0.5 rounded-md transition-opacity hover:opacity-70"
            style={{ background: "#fff", color: "var(--kk-ink)", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 4px rgba(0,0,0,0.10)" }}
          >
            {cap}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  leads: OwnerLead[];
}

export function OutreachTable({ leads }: Props) {
  const router = useRouter();
  const [waCount, incrementWaCount, waCap, updateWaCap] = useDailyWaCount();
  const [filter, setFilter] = useState<Filter>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [bulkContacting, setBulkContacting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [selectedLead, setSelectedLead] = useState<OwnerLead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => { setSelectedIds(new Set()); }, [filter, propertyFilter, search]);

  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [exportOpen]);

  async function bulkMarkContacted() {
    setBulkContacting(true);
    try {
      await bulkMarkOwnerLeadsContacted(Array.from(selectedIds));
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setBulkContacting(false);
    }
  }

  // Unique property names for the filter dropdown
  const propertyNames = Array.from(
    new Set(leads.map((l) => l.property_name).filter(Boolean) as string[])
  ).sort();

  // Per-property stat table for the popover (sorted by unsent desc = newest imports first)
  const propertyStats = Object.fromEntries(
    propertyNames.map((p) => {
      const pl = leads.filter((l) => l.property_name === p);
      return [p, {
        unsent:    pl.filter((l) => getStatus(l) === "unsent").length,
        contacted: pl.filter((l) => getStatus(l) === "contacted").length,
        listed:    pl.filter((l) => getStatus(l) === "listed").length,
        rented:    pl.filter((l) => getStatus(l) === "rented").length,
        declined:  pl.filter((l) => getStatus(l) === "declined").length,
      }];
    })
  );

  // Counts respect the active property filter
  const propertyFiltered = propertyFilter === "all" ? leads : leads.filter((l) => l.property_name === propertyFilter);
  const counts = {
    all:       propertyFiltered.length,
    unsent:    propertyFiltered.filter((l) => getStatus(l) === "unsent").length,
    contacted: propertyFiltered.filter((l) => getStatus(l) === "contacted").length,
    listed:    propertyFiltered.filter((l) => getStatus(l) === "listed").length,
    rented:    propertyFiltered.filter((l) => getStatus(l) === "rented").length,
    declined:  propertyFiltered.filter((l) => getStatus(l) === "declined").length,
  };

  const searchLower = search.trim().toLowerCase();

  const visible = leads
    .filter((l) => {
      const s = getStatus(l);
      if (filter === "unsent")    { if (s !== "unsent")    return false; }
      else if (filter === "contacted") { if (s !== "contacted") return false; }
      else if (filter === "listed")    { if (s !== "listed")    return false; }
      else if (filter === "rented")    { if (s !== "rented")    return false; }
      else if (filter === "declined")  { if (s !== "declined")  return false; }
      if (propertyFilter !== "all" && l.property_name !== propertyFilter) return false;
      if (searchLower) {
        const haystack = [l.owner_name, l.owner_phone, l.unit, l.property_name]
          .map((v) => (v ?? "").toLowerCase())
          .join(" ");
        if (!haystack.includes(searchLower)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const sa = getStatus(a), sb = getStatus(b);
      const order: Record<ContactStatus, number> = { unsent: 0, contacted: 1, listed: 2, rented: 3, declined: 4 };
      if (order[sa] !== order[sb]) return order[sa] - order[sb];
      return a.created_at.localeCompare(b.created_at);
    });

  const allSelected = visible.length > 0 && visible.every((l) => selectedIds.has(l.id));
  const someSelected = !allSelected && visible.some((l) => selectedIds.has(l.id));

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds((prev) => { const s = new Set(prev); visible.forEach((l) => s.delete(l.id)); return s; });
    } else {
      setSelectedIds((prev) => { const s = new Set(prev); visible.forEach((l) => s.add(l.id)); return s; });
    }
  }

  async function bulkMoveToDeclined() {
    await bulkSetOwnerLeadStage(Array.from(selectedIds), "archived");
    setSelectedIds(new Set());
    router.refresh();
  }

  async function handleSend(lead: OwnerLead, e: React.MouseEvent) {
    e.stopPropagation();
    if (sending) return;
    setSending(lead.id);
    // Open window immediately during user gesture — mobile browsers block window.open after await
    const tab = window.open("", "_blank");
    try {
      const res = await generateOwnerIntakeLink(lead.id);
      if (!res.ok) {
        tab?.close();
        toast.error(res.message);
        return;
      }
      if (tab) {
        tab.location.href = res.waUrl;
      } else {
        // Popup was blocked — fall back to same-tab navigation (opens WhatsApp on mobile)
        window.location.href = res.waUrl;
      }
      incrementWaCount();
      router.refresh();
    } catch {
      tab?.close();
      toast.error("Failed to generate link");
    } finally {
      setSending(null);
    }
  }

  async function handleMoveToListed(id: string) {
    await setOwnerLeadStage(id, "listed");
    router.refresh();
  }

  function handleSaved(id: string, updates: Partial<OwnerLead>) {
    // Optimistically update selectedLead so the popup stays in sync
    setSelectedLead((prev) => prev && prev.id === id ? { ...prev, ...updates } : prev);
    router.refresh();
  }

  async function handleDelete(id: string) {
    await removeOwnerLead(id);
    router.refresh();
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      await bulkDeleteOwnerLeads(Array.from(selectedIds));
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
      router.refresh();
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleExport(format: "xlsx" | "csv") {
    setExportOpen(false);
    setExporting(true);
    try {
      const ids = selectedIds.size > 0 ? Array.from(selectedIds) : visible.map((l) => l.id);
      const res = await bulkExportOwnerLeads(ids);
      if (!res.ok) { toast.error("Export failed"); return; }
      const { rows, template } = res;

      if (format === "xlsx") {
        const XLSX = await import("xlsx");
        const wb = XLSX.utils.book_new();

        const wsData = [
          ["Name", "Number", "Property", "Unit", "Rent (RM)", "Form Link"],
          ...rows.map((r) => [r.name, r.number, r.property, r.unit, r.rent, r.link]),
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        rows.forEach((_, i) => {
          const cell = ws[`B${i + 2}`];
          if (cell) { cell.t = "s"; cell.z = "@"; }
        });
        ws["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 54 }];
        XLSX.utils.book_append_sheet(wb, ws, "Owners");

        const wsTpl = XLSX.utils.aoa_to_sheet([
          ["Paste this template into your WA Sender:"],
          [""],
          [template],
          [""],
          ["Variables: {{Property}} → Property column, {{Link}} → Form Link column"],
        ]);
        wsTpl["!cols"] = [{ wch: 80 }];
        XLSX.utils.book_append_sheet(wb, wsTpl, "WA Template");

        XLSX.writeFile(wb, `kakisewa-owners-${Date.now()}.xlsx`);
      } else {
        const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
        const lines = [
          ["Name", "Number", "Property", "Unit", "Rent (RM)", "Form Link"].map(esc).join(","),
          ...rows.map((r) => [r.name, r.number, r.property, r.unit, r.rent, r.link].map(esc).join(",")),
        ];
        const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `kakisewa-owners-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success(`${rows.length} owners exported`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all",       label: `All ${counts.all}` },
    { key: "unsent",    label: `Uncontacted ${counts.unsent}` },
    { key: "contacted", label: `Contacted ${counts.contacted}` },
    { key: "listed",    label: `Listed ${counts.listed}` },
    { key: "rented",    label: `Rented ${counts.rented}` },
    { key: "declined",  label: `Declined ${counts.declined}` },
  ];

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-4">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "var(--kk-ink-faint)" }}
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, number, unit, property…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[14px] outline-none"
          style={{
            background: "var(--kk-surface-2)",
            border: "1px solid var(--kk-line)",
            color: "var(--kk-ink)",
          }}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 transition-opacity hover:opacity-60"
            style={{ color: "var(--kk-ink-faint)" }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {/* Property filter — popover table */}
        {propertyNames.length > 0 && (
          <PropertyPopover
            value={propertyFilter}
            onChange={(v) => { setPropertyFilter(v); setFilter("all"); }}
            stats={propertyStats}
          />
        )}

        {/* Status filter pills */}
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-all"
            style={{
              background: filter === key ? "var(--kk-ink)" : "var(--kk-surface-2)",
              color: filter === key ? "#fff" : "var(--kk-ink-mute)",
              border: `1px solid ${filter === key ? "var(--kk-ink)" : "var(--kk-line)"}`,
            }}
          >
            {label}
          </button>
        ))}

      </div>

      {/* Daily WA counter */}
      <WaDailyCounter count={waCount} cap={waCap} onCapChange={updateWaCap} />

      {/* Table */}
      <div className="kk-section overflow-hidden p-0 kk-scroll-fade">
        {visible.length === 0 && !(filter === "all" && propertyFilter === "all" && !searchLower) ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <p className="text-[14px] font-medium" style={{ color: "var(--kk-ink-mute)" }}>
              {searchLower ? `No results for "${search}"` : "No owners match this filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 380 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--kk-line)" }}>
                {/* checkbox */}
                <th className="px-2 py-2 lg:py-3 text-left" style={{ width: 30, verticalAlign: "middle" }}>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleAll}
                      className="w-3.5 h-3.5 cursor-pointer block"
                    />
                  </div>
                </th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-[11px] font-semibold uppercase tracking-wide" style={{ width: 96, color: "var(--kk-accent)" }}>Owner</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-[11px] font-semibold uppercase tracking-wide" style={{ width: 78, color: "var(--kk-accent)" }}>Number</th>
                <th className="hidden lg:table-cell px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ width: 72, color: "var(--kk-accent)" }}>Unit</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-[11px] font-semibold uppercase tracking-wide" style={{ width: 94, color: "var(--kk-accent)" }}>Property</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-[10px] lg:text-[11px] font-semibold uppercase tracking-wide" style={{ width: 82, color: "var(--kk-accent)" }}>Status</th>
                <th className="hidden lg:table-cell px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ width: 80, color: "var(--kk-accent)" }}>Last sent</th>
                <th className="sticky right-0 lg:static px-2 lg:px-4 py-2 lg:py-3" style={{ width: 48, background: "var(--kk-surface)" }}></th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr style={{ opacity: 0.5, pointerEvents: "none" }}>
                  <td className="px-2 lg:px-3 py-2 lg:py-3" style={{ verticalAlign: "middle" }}>
                    <input type="checkbox" disabled className="w-3.5 h-3.5 block" />
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3">
                    <p className="text-[13px] font-medium" style={{ color: "var(--kk-ink)" }}>Ahmad Hassan</p>
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3">
                    <p className="text-[12px] tabular-nums" style={{ color: "var(--kk-ink-mute)" }}>0123456789</p>
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3">
                    <p className="text-[13px]" style={{ color: "var(--kk-ink)" }}>A-12-05</p>
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3">
                    <p className="text-[13px]" style={{ color: "var(--kk-ink)" }}>Agile Mont Kiara</p>
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-faint)", border: "1px solid var(--kk-line)" }}>Sample</span>
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3">
                    <span className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>—</span>
                  </td>
                  <td className="sticky right-0 lg:static px-2 lg:px-4 py-2 lg:py-3" style={{ background: "var(--kk-surface)" }} />
                </tr>
              ) : visible.map((lead, i) => {
                const status = getStatus(lead);
                const isLast = i === visible.length - 1;
                return (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="group cursor-pointer transition-colors"
                    style={{
                      borderBottom: isLast ? "none" : "1px solid var(--kk-line)",
                      background: selectedIds.has(lead.id) ? "rgba(0,113,227,0.04)" : undefined,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--kk-surface-2)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = selectedIds.has(lead.id) ? "rgba(0,113,227,0.04)" : "transparent"; }}
                  >
                    {/* Checkbox */}
                    <td className="px-2 lg:px-3 py-2 lg:py-3" style={{ verticalAlign: "middle" }} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => {}}
                          onClick={(e) => toggleSelect(lead.id, e)}
                          className="w-3.5 h-3.5 cursor-pointer block"
                        />
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="px-2 lg:px-4 py-2 lg:py-3 overflow-hidden">
                      <p className="text-[11px] lg:text-[13px] font-medium truncate" style={{ color: "var(--kk-ink)" }}>
                        {lead.owner_name ?? "—"}
                      </p>
                    </td>

                    {/* Number */}
                    <td className="px-2 lg:px-4 py-2 lg:py-3 overflow-hidden">
                      {lead.owner_phone ? (
                        <p className="text-[10px] lg:text-[12px] truncate tabular-nums" style={{ color: "var(--kk-ink-mute)" }}>{lead.owner_phone}</p>
                      ) : (
                        <span className="text-[10px] lg:text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>—</span>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="hidden lg:table-cell px-4 py-3 overflow-hidden">
                      {lead.unit ? (
                        <p className="text-[13px] truncate" style={{ color: "var(--kk-ink)" }}>{lead.unit}</p>
                      ) : (
                        <span className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>—</span>
                      )}
                    </td>

                    {/* Property */}
                    <td className="px-2 lg:px-4 py-2 lg:py-3 overflow-hidden">
                      {lead.property_name ? (
                        <p className="text-[11px] lg:text-[13px] truncate" style={{ color: "var(--kk-ink)" }}>{lead.property_name}</p>
                      ) : (
                        <span className="text-[11px] lg:text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-2 lg:px-4 py-2 lg:py-3">
                      <StatusBadge lead={lead} />
                    </td>

                    {/* Last sent */}
                    <td className="hidden lg:table-cell px-4 py-3">
                      <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>
                        {status === "unsent" ? "—" : relativeTime(lead.intake_sent_at)}
                      </span>
                    </td>

                    {/* Action — sticky on mobile so button is always visible */}
                    <td className="sticky right-0 lg:static px-2 lg:px-4 py-2 lg:py-3 text-right" style={{ background: "var(--kk-surface)" }} onClick={(e) => e.stopPropagation()}>
                      {(status === "listed" || status === "rented") ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); router.push(`/new-owners?tab=pipeline&highlight=${lead.id}`); }}
                          className="inline-flex items-center gap-1 lg:gap-1.5 px-2 lg:px-3 py-1.5 rounded-full text-[11px] lg:text-[12px] font-semibold transition-opacity hover:opacity-80"
                          style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
                        >
                          <span className="hidden lg:inline">Go to card</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={sending === lead.id}
                          onClick={(e) => handleSend(lead, e)}
                          className="inline-flex items-center gap-1 lg:gap-1.5 px-2 lg:px-3 py-1.5 rounded-full text-[11px] lg:text-[12px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                          style={{ background: "#25D366", color: "#fff" }}
                        >
                          {sending === lead.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <WhatsAppIcon className="w-3 h-3" />
                          )}
                          <span className="hidden lg:inline">Send form</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl"
          style={{ background: "var(--kk-ink)", color: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.28)" }}
        >
          <span className="text-[13px] font-medium tabular-nums mr-1 shrink-0">{selectedIds.size} selected</span>

          {/* Mark as Contacted */}
          <button
            type="button"
            disabled={bulkContacting}
            onClick={bulkMarkContacted}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
          >
            {bulkContacting ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
            Mark Contacted
          </button>

          {/* Move to Declined */}
          <button
            type="button"
            onClick={bulkMoveToDeclined}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
          >
            Move to Declined
          </button>

          {/* Export */}
          <div ref={exportRef} className="relative">
            <button
              type="button"
              disabled={exporting}
              onClick={() => setExportOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
            >
              {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              Export
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            {exportOpen && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  right: 0,
                  zIndex: 200,
                  background: "var(--kk-surface)",
                  border: "1px solid var(--kk-line)",
                  borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                  minWidth: 210,
                  overflow: "hidden",
                }}
              >
                {([
                  { format: "xlsx" as const, Icon: FileSpreadsheet, label: "Excel (.xlsx)", sub: "2 sheets — owners + template" },
                  { format: "csv" as const, Icon: FileText, label: "CSV (.csv)", sub: "Compatible with Google Sheets" },
                ] as const).map(({ format, Icon, label, sub }) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => handleExport(format)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left"
                    style={{ borderBottom: format === "xlsx" ? "1px solid var(--kk-line)" : "none" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--kk-surface-2)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--kk-accent)" }} />
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: "var(--kk-ink)" }}>{label}</p>
                      <p className="text-[11px]" style={{ color: "var(--kk-ink-mute)" }}>{sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Delete selected */}
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)", margin: "0 2px" }} />
          {!bulkDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setBulkDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-80"
              style={{ background: "rgba(255,59,48,0.25)", color: "#FF6B6B" }}
            >
              Delete
            </button>
          ) : (
            <>
              <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.7)" }}>
                Delete {selectedIds.size} leads?
              </span>
              <button
                type="button"
                onClick={() => setBulkDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold disabled:opacity-50"
                style={{ background: "#FF3B30", color: "#fff" }}
              >
                {bulkDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                Confirm delete
              </button>
            </>
          )}

          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)", margin: "0 2px" }} />
          <button
            type="button"
            onClick={() => { setSelectedIds(new Set()); setBulkDeleteConfirm(false); }}
            className="p-1.5 rounded-lg transition-opacity hover:opacity-60"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Lead detail popup */}
      {selectedLead && (
        <LeadPopup
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onSaved={handleSaved}
          onMoveToListed={handleMoveToListed}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

// ─── Property filter popover ──────────────────────────────────────────────────

type PropertyStats = Record<string, { unsent: number; contacted: number; listed: number; rented: number; declined: number }>;

const STAT_COLS: { key: keyof PropertyStats[string]; label: string }[] = [
  { key: "unsent",    label: "Uncontacted" },
  { key: "contacted", label: "Contacted" },
  { key: "listed",    label: "Listed"    },
  { key: "rented",    label: "Rented"    },
  { key: "declined",  label: "Declined"  },
];

function PropertyPopover({
  value,
  onChange,
  stats,
}: {
  value: string;
  onChange: (v: string) => void;
  stats: PropertyStats;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onMouse); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const rows = Object.entries(stats).sort((a, b) => {
    if (b[1].unsent !== a[1].unsent) return b[1].unsent - a[1].unsent;
    const totA = Object.values(a[1]).reduce((s, n) => s + n, 0);
    const totB = Object.values(b[1]).reduce((s, n) => s + n, 0);
    return totB - totA;
  });

  const totals = STAT_COLS.reduce((acc, c) => {
    acc[c.key] = rows.reduce((s, [, st]) => s + st[c.key], 0);
    return acc;
  }, {} as PropertyStats[string]);

  function pick(v: string) { onChange(v); setOpen(false); }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-full text-[13px] font-medium"
        style={{
          background: value !== "all" ? "var(--kk-ink)" : "var(--kk-surface-2)",
          color: value !== "all" ? "#fff" : "var(--kk-ink-mute)",
          border: `1px solid ${value !== "all" ? "var(--kk-ink)" : "var(--kk-line)"}`,
          minWidth: 160,
        }}
      >
        <span className="flex-1 text-left truncate">{value === "all" ? "All properties" : value}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 200,
            background: "var(--kk-surface)",
            border: "1px solid var(--kk-line)",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
            minWidth: 520,
            maxHeight: 420,
            overflowY: "auto",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr style={{ background: "var(--kk-surface-2)", borderBottom: "1px solid var(--kk-line)" }}>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--kk-ink-mute)" }}>
                  Property
                </th>
                {STAT_COLS.map((c) => (
                  <th key={c.key} className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--kk-ink-mute)" }}>
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--kk-ink-mute)" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr
                onClick={() => pick("all")}
                style={{ borderBottom: "1px solid var(--kk-line)", cursor: "pointer", background: value === "all" ? "rgba(0,113,227,0.06)" : undefined }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--kk-surface-2)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = value === "all" ? "rgba(0,113,227,0.06)" : "transparent"; }}
              >
                <td className="px-4 py-2.5 text-[13px] font-semibold" style={{ color: "var(--kk-ink)" }}>All properties</td>
                {STAT_COLS.map((c) => (
                  <td key={c.key} className="px-3 py-2.5 text-right text-[12px] tabular-nums font-semibold" style={{ color: totals[c.key] > 0 ? "var(--kk-ink)" : "var(--kk-line-strong)" }}>
                    {totals[c.key] > 0 ? totals[c.key] : "—"}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right text-[12px] tabular-nums font-semibold" style={{ color: "var(--kk-ink)" }}>
                  {STAT_COLS.reduce((sum, c) => sum + totals[c.key], 0)}
                </td>
              </tr>
              {rows.map(([p, s], i) => (
                <tr
                  key={p}
                  onClick={() => pick(p)}
                  style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--kk-line)" : "none", cursor: "pointer", background: value === p ? "rgba(0,113,227,0.06)" : undefined }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--kk-surface-2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = value === p ? "rgba(0,113,227,0.06)" : "transparent"; }}
                >
                  <td className="px-4 py-2.5 text-[13px] font-medium" style={{ color: "var(--kk-ink)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p}</td>
                  {STAT_COLS.map((c) => (
                    <td key={c.key} className="px-3 py-2.5 text-right text-[12px] tabular-nums font-semibold" style={{ color: s[c.key] > 0 ? "var(--kk-ink)" : "var(--kk-line-strong)" }}>
                      {s[c.key] > 0 ? s[c.key] : "—"}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right text-[12px] tabular-nums font-semibold" style={{ color: "var(--kk-ink)" }}>
                    {STAT_COLS.reduce((sum, c) => sum + s[c.key], 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
