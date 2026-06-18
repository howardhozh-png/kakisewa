"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";

const WA_DAILY_KEY = "kk_wa_daily";
const WA_CAP_KEY   = "kk_wa_cap";
const WA_DEFAULT_CAP = 40;
const PAGE_SIZE = 20;

function getPageNumbers(page: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (page > 3) pages.push("...");
  for (let p = Math.max(2, page - 1); p <= Math.min(total - 1, page + 1); p++) pages.push(p);
  if (page < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

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
import { toE164Display } from "@/lib/phone";
import { generateOwnerIntakeLink, bulkExportOwnerLeads, bulkMarkOwnerLeadsContacted, setOwnerLeadStage, bulkSetOwnerLeadStage, updateOwnerLeadDetails, saveOwnerLeadPhotos, saveOwnerLeadAgreementUrl, removeOwnerLead, bulkDeleteOwnerLeads, renamePropertyGroupAction, restoreOwnerLeadAction, hardDeleteOwnerLeadAction, bulkHardDeleteOwnerLeadsAction, logManualContactAction } from "@/lib/actions";
import { BedroomPicker, getDocumentName } from "@/components/edit-owner-lead-dialog";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { FilterSelect } from "@/components/filter-select";
import { Loader2, X, ChevronDown, Check, Camera, ArrowRight, Download, FileSpreadsheet, FileText, MessageCircle, Pencil, Search, Phone, Trash2, RotateCcw, Upload } from "lucide-react";
import { UploadRing } from "@/components/ui/upload-ring";
import { compressImage } from "@/lib/compress-image";
import { uploadWithProgress } from "@/lib/upload-with-progress";
import { DateInput } from "@/components/ui/date-input";
import { toast } from "sonner";
import { useWhatsAppGate } from "@/hooks/use-whatsapp-gate";
import { WhatsAppGateDialog } from "@/components/whatsapp-gate-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Filter = "all" | "unsent" | "contacted" | "deleted";
type PurposeFilter = "all" | "rent" | "sell";
type SentDateFilter = { mode: "month" | "day"; value: string } | null;
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

function getProtectingList(lead: OwnerLead): string | null {
  if (lead.stage === "listed" || lead.stage === "wants_rent" || lead.stage === "replied") return "My Listing";
  if (lead.stage === "matched") return lead.has_active_tenancy ? "Existing Listing" : "My Listing (Rented)";
  return null;
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

const AVATAR_COLORS = ["#5856D6","#FF6B6B","#34AADC","#FF9500","#30B0C7","#1F8B4C","#C84B31","#7C3AED","#0071E3","#B36200"];

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getAvatarColor(name: string | null | undefined): string {
  if (!name) return "#AEAEB2";
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
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

function PurposeBadge({ purpose }: { purpose: "rent" | "sell" | "both" | null | undefined }) {
  if (!purpose) return null;
  if (purpose === "both") return (
    <>
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: "rgba(0,113,227,0.08)", color: "var(--kk-blue)" }}>Rent</span>
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: "rgba(124,58,237,0.08)", color: "#7C3AED" }}>Sell</span>
    </>
  );
  const isRent = purpose === "rent";
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap"
      style={{
        background: isRent ? "rgba(0,113,227,0.08)" : "rgba(124,58,237,0.08)",
        color: isRent ? "var(--kk-blue)" : "#7C3AED",
      }}
    >
      {isRent ? "Rent" : "Sell"}
    </span>
  );
}

function OwnerLeadWaBadge({ lead }: { lead: OwnerLead }) {
  if (!lead.wa_status) return null;
  if (lead.wa_status === "pending") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "#B45309" }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#F59E0B", display: "inline-block", flexShrink: 0 }} />
        Sent
      </span>
    );
  }
  if (lead.wa_status === "replied") {
    const snippet = lead.last_wa_reply_text
      ? lead.last_wa_reply_text.length > 30 ? lead.last_wa_reply_text.slice(0, 27) + "…" : lead.last_wa_reply_text
      : null;
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "#166534" }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22C55E", display: "inline-block", flexShrink: 0 }} />
        {snippet ?? "Replied"}
      </span>
    );
  }
  if (lead.wa_status === "no_response") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "#991B1B" }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#EF4444", display: "inline-block", flexShrink: 0 }} />
        No response
      </span>
    );
  }
  return null;
}

// ─── Lead detail popup (fully editable) ──────────────────────────────────────

function parseAgreementUrls(url: string | null): string[] {
  if (!url) return [];
  if (url.startsWith('[')) { try { return JSON.parse(url); } catch {} }
  return [url];
}
function serializeAgreementUrls(urls: string[]): string | null {
  if (urls.length === 0) return null;
  if (urls.length === 1) return urls[0];
  return JSON.stringify(urls);
}

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
    listing_purpose: lead.listing_purpose ?? null as "rent" | "sell" | "both" | null,
    expected_rent: lead.expected_rent != null ? String(lead.expected_rent) : "",
    bedrooms: lead.bedrooms != null ? String(lead.bedrooms) : "",
    bathrooms: lead.bathrooms != null ? String(lead.bathrooms) : "",
    parking: lead.parking ?? "",
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
  const [agreementUrls, setAgreementUrls] = useState<string[]>(parseAgreementUrls(lead.agreement_url ?? null));
  const [uploadingAgreement, setUploadingAgreement] = useState(false);
  const [loggingContact, setLoggingContact] = useState(false);
  const agreementInputRef = useRef<HTMLInputElement>(null);
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
    form.parking !== (lead.parking ?? "") ||
    form.notes !== (lead.notes ?? "") ||
    form.available_from !== (lead.available_from ?? "") ||
    form.listing_purpose !== (lead.listing_purpose ?? null);

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
        bedrooms: form.bedrooms !== "" ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        parking: form.parking.trim() || null,
        notes: form.notes || undefined,
        available_from: form.available_from || undefined,
        listing_purpose: form.listing_purpose ?? null,
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
    const errors = new Set<string>();
    if (!form.property_name) errors.add("property_name");
    if (!form.unit) errors.add("unit");
    if (errors.size > 0) {
      setFieldErrors(errors);
      toast.error("Fill in Property name and Unit first");
      return;
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

    const room = 10 - photos.length;
    if (room <= 0) { toast.error("Maximum 10 photos reached"); return; }

    const batch = files.slice(0, room);
    if (files.length > batch.length) {
      toast.error(`Only ${room} more photo${room === 1 ? "" : "s"} can be added (max 10)`);
    }

    setUploadProgress(0);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < batch.length; i++) {
        const compressed = await compressImage(batch[i]);
        const fd = new FormData();
        fd.append("leadId", lead.id);
        fd.append("file", compressed);
        const { ok, data } = await uploadWithProgress("/api/agent/photo", fd, (pct) => {
          setUploadProgress(Math.round((i * 100 + pct) / batch.length));
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

  async function handleAgreementUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const room = 5 - agreementUrls.length;
    const batch = files.slice(0, room);
    setUploadingAgreement(true);
    try {
      const newUrls: string[] = [];
      for (const file of batch) {
        const fd = new FormData(); fd.append("file", file);
        const res = await fetch("/api/upload/document", { method: "POST", body: fd });
        const data = await res.json() as { url?: string; error?: string };
        if (!res.ok) { toast.error(data.error ?? "Upload failed"); continue; }
        if (data.url) newUrls.push(data.url);
      }
      if (newUrls.length > 0) {
        const updated = [...agreementUrls, ...newUrls];
        setAgreementUrls(updated);
        await saveOwnerLeadAgreementUrl(lead.id, serializeAgreementUrls(updated));
        toast.success(newUrls.length === 1 ? "Document saved" : `${newUrls.length} documents saved`);
      }
    } catch { toast.error("Upload failed"); }
    finally { setUploadingAgreement(false); if (agreementInputRef.current) agreementInputRef.current.value = ""; }
  }

  async function handleRemoveAgreementFile(index: number) {
    const updated = agreementUrls.filter((_, i) => i !== index);
    setAgreementUrls(updated);
    await saveOwnerLeadAgreementUrl(lead.id, serializeAgreementUrls(updated)).catch(() => toast.error("Failed to remove"));
    toast.success("Document removed");
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
            <div className="flex items-center gap-0.5 mt-1">
              <input
                value={form.owner_phone}
                onChange={(e) => set("owner_phone", e.target.value)}
                className="text-[12px] bg-transparent outline-none border-b border-transparent focus:border-[var(--kk-line)] shrink-0"
                style={{ color: "var(--kk-ink-mute)", width: form.owner_phone ? `${form.owner_phone.length + 1}ch` : "6ch", minWidth: "6ch", maxWidth: "100%" }}
                placeholder="Phone"
              />
              {form.owner_phone && (
                <>
                  <a href={`https://wa.me/${(form.owner_phone ?? "").replace(/\D/g, "").replace(/^0/, "60")}`} target="_blank" rel="noopener" className="p-1 rounded-full shrink-0" style={{ color: "#25D366" }} aria-label="WhatsApp">
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                  </a>
                  <a href={`tel:${toE164Display(form.owner_phone)}`} className="p-1 rounded-full shrink-0" style={{ color: "var(--kk-ink-faint)" }} aria-label="Call">
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                </>
              )}
            </div>
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
          {/* Property — full width */}
          <div className="col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: fieldErrors.has("property_name") ? "#ef4444" : "var(--kk-ink-faint)" }}>Property</p>
            <input value={form.property_name} onChange={(e) => set("property_name", e.target.value)} placeholder="e.g. Agile Mont Kiara" style={{ ...FIELD_STYLE, borderColor: fieldErrors.has("property_name") ? "#ef4444" : "var(--kk-line)" }} />
          </div>
          {/* Unit | Rent side by side */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: fieldErrors.has("unit") ? "#ef4444" : "var(--kk-ink-faint)" }}>Unit</p>
            <input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="e.g. A-12-05" style={{ ...FIELD_STYLE, borderColor: fieldErrors.has("unit") ? "#ef4444" : "var(--kk-line)" }} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-faint)" }}>Expected rent (RM/mo)</p>
            <input type="number" value={form.expected_rent} onChange={(e) => set("expected_rent", e.target.value)} placeholder="e.g. 2500" style={{ ...FIELD_STYLE }} />
          </div>
          {/* Bedrooms (pill buttons) | Bathrooms */}
          <BedroomPicker value={form.bedrooms} onChange={(v) => { setForm((p) => ({ ...p, bedrooms: v })); setSaved(false); }} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-faint)" }}>Bathrooms</p>
            <input type="number" min="0" value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} placeholder="e.g. 2" style={{ ...FIELD_STYLE }} />
          </div>
          {/* Parking */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-faint)" }}>Parking</p>
            <input type="text" value={form.parking} onChange={(e) => set("parking", e.target.value)} placeholder="e.g. A142" style={{ ...FIELD_STYLE }} />
          </div>
          {/* Available from — full width */}
          <div className="col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-faint)" }}>Available from</p>
            <DateInput value={form.available_from} onChange={(v) => set("available_from", v)} style={{ ...FIELD_STYLE }} />
          </div>
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
          <div className="col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--kk-ink-faint)" }}>Purpose (tap both to select multiple)</p>
            <div className="flex gap-2">
              {(["rent", "sell"] as const).map((v) => {
                const active = form.listing_purpose === v || form.listing_purpose === "both";
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setForm((prev) => {
                        const cur = prev.listing_purpose;
                        let next: "rent" | "sell" | "both" | null;
                        if (cur === "both") next = v === "rent" ? "sell" : "rent";
                        else if (cur === v) next = null;
                        else if (cur === null) next = v;
                        else next = "both";
                        return { ...prev, listing_purpose: next };
                      });
                      setSaved(false);
                    }}
                    className="px-3 py-1 rounded-full text-[12px] font-medium transition-all"
                    style={{
                      background: active ? "var(--kk-ink)" : "var(--kk-surface-2)",
                      color: active ? "#fff" : "var(--kk-ink-mute)",
                      border: `1px solid ${active ? "var(--kk-ink)" : "var(--kk-line)"}`,
                    }}
                  >
                    {v === "rent" ? "For Rent" : "For Sale"}
                  </button>
                );
              })}
            </div>
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

        {/* Agreement */}
        <div className="px-5 pb-4" style={{ borderTop: "1px solid var(--kk-line)" }}>
          <div className="flex items-center justify-between mt-4 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--kk-ink-faint)" }}>Tenancy agreement</p>
            <span className="text-[10px]" style={{ color: "var(--kk-ink-faint)" }}>{agreementUrls.length}/5</span>
          </div>
          <div className="space-y-1">
            {agreementUrls.map((url, i) => (
              <div key={url} className="flex items-center gap-2 py-1">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--kk-green-soft)" }}>
                  <FileText className="w-3 h-3" style={{ color: "var(--kk-green)" }} />
                </div>
                <p className="flex-1 text-[12px] font-medium truncate min-w-0" style={{ color: "var(--kk-ink)" }} title={getDocumentName(url)}>{getDocumentName(url)}</p>
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", border: "1px solid var(--kk-line)" }}>View</a>
                <button type="button" onClick={() => handleRemoveAgreementFile(i)} className="p-1" style={{ color: "var(--kk-ink-faint)" }}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {agreementUrls.length < 5 && (
              <label className="flex items-center gap-1.5 py-1 cursor-pointer" style={{ color: "var(--kk-ink-mute)" }}>
                {uploadingAgreement ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span className="text-[12px]">{agreementUrls.length === 0 ? "Upload document" : "Add document"}</span>
                <input ref={agreementInputRef} type="file" className="hidden" multiple onChange={handleAgreementUpload} disabled={uploadingAgreement} />
              </label>
            )}
            <p className="text-[10px]" style={{ color: "var(--kk-ink-faint)" }}>PDF, image, or any file — max 20 MB</p>
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
              onClick={() => { onClose(); router.push(`/my-listing?highlight=${lead.id}`); }}
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

          {/* Log manual contact */}
          {!["matched", "own_stay", "archived"].includes(lead.stage) && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={loggingContact}
                onClick={async () => {
                  setLoggingContact(true);
                  await logManualContactAction(lead.id, "call");
                  router.refresh();
                  toast.success("Call logged");
                  setLoggingContact(false);
                }}
                className="flex-1 py-2 rounded-xl text-[13px] font-medium flex items-center justify-center gap-1.5 transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", border: "1px solid var(--kk-line)" }}
              >
                {loggingContact ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
                Logged a call
              </button>
              <button
                type="button"
                disabled={loggingContact}
                onClick={async () => {
                  setLoggingContact(true);
                  await logManualContactAction(lead.id, "text");
                  router.refresh();
                  toast.success("Text logged");
                  setLoggingContact(false);
                }}
                className="flex-1 py-2 rounded-xl text-[13px] font-medium flex items-center justify-center gap-1.5 transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", border: "1px solid var(--kk-line)" }}
              >
                {loggingContact ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                Logged a text
              </button>
            </div>
          )}

          {/* Delete — always shown */}
          {(() => {
            const protectingList = getProtectingList(lead);
            if (!deleteConfirm) {
              return (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  className="w-full py-2 rounded-xl text-[13px] font-medium transition-opacity hover:opacity-70"
                  style={{ background: "transparent", color: "#AEAEB2", border: "1px solid rgba(0,0,0,0.08)" }}
                >
                  Delete lead
                </button>
              );
            }
            if (protectingList) {
              return (
                <div className="flex flex-col gap-2">
                  <p className="text-center text-[12px] leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
                    This lead is currently in <strong>{protectingList}</strong> and cannot be deleted from here.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(false)}
                    className="w-full py-2 rounded-xl text-[13px] font-medium"
                    style={{ background: "transparent", color: "var(--kk-ink-mute)", border: "1px solid rgba(0,0,0,0.10)" }}
                  >
                    OK
                  </button>
                </div>
              );
            }
            return (
              <div className="flex flex-col gap-1.5">
                <p className="text-center text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>Moved to bin — auto-deleted after 7 days</p>
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
                    Move to bin
                  </button>
                </div>
              </div>
            );
          })()}
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
  }

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

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
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
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
  deletedLeads?: OwnerLead[];
}

export function OutreachTable({ leads, deletedLeads = [] }: Props) {
  const router = useRouter();
  const [waCount, incrementWaCount, waCap, updateWaCap] = useDailyWaCount();
  const [filter, setFilter] = useState<Filter>("all");
  const [purposeFilter, setPurposeFilter] = useState<PurposeFilter>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [sentDateFilter, setSentDateFilter] = useState<SentDateFilter>(null);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [bulkContacting, setBulkContacting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkHardDeleteConfirm, setBulkHardDeleteConfirm] = useState(false);
  const [bulkHardDeleting, setBulkHardDeleting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [selectedLead, setSelectedLead] = useState<OwnerLead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { gateOpen, setGateOpen, missingFields, checkAndRun } = useWhatsAppGate();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [hardDeletingId, setHardDeletingId] = useState<string | null>(null);
  const [hardDeleteConfirmId, setHardDeleteConfirmId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => { setSelectedIds(new Set()); }, [filter, purposeFilter, propertyFilter, sentDateFilter, search]);
  useEffect(() => { setPage(1); }, [filter, purposeFilter, propertyFilter, sentDateFilter, search]);

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

  // Stats row computations
  const todayIso = todayStr();
  const totalLeads = leads.filter((l) => !l.is_competitor_target).length;
  const contacted = leads.filter((l) => (l.outreach_count ?? 0) > 0).length;
  const contactedToday = leads.filter((l) => (l.last_outreach_at ?? l.intake_sent_at ?? "").slice(0, 10) === todayIso).length;
  const replied = leads.filter((l) => l.wa_status === "replied").length;
  const responseRate = contacted > 0 ? Math.round((replied / contacted) * 100) : 0;

  // Counts respect the active property filter. Exclude competitor targets so
  // the "All" badge matches exactly what the visible rows show.
  const propertyFiltered = propertyFilter === "all" ? leads : leads.filter((l) => l.property_name === propertyFilter);
  const counts = {
    all:       propertyFiltered.filter((l) => !l.is_competitor_target).length,
    unsent:    propertyFiltered.filter((l) => getStatus(l) === "unsent").length,
    contacted: propertyFiltered.filter((l) => getStatus(l) === "contacted").length,
    listed:    propertyFiltered.filter((l) => getStatus(l) === "listed").length,
    rented:    propertyFiltered.filter((l) => getStatus(l) === "rented").length,
    declined:  propertyFiltered.filter((l) => getStatus(l) === "declined").length,
  };

  const searchLower = search.trim().toLowerCase();

  const visible = filter === "deleted"
    ? deletedLeads.filter((l) => {
        if (!searchLower) return true;
        const haystack = [l.owner_name, l.owner_phone, l.unit, l.property_name]
          .map((v) => (v ?? "").toLowerCase()).join(" ");
        return haystack.includes(searchLower);
      })
    : leads
        .filter((l) => {
          if (l.is_competitor_target) return false;
          const s = getStatus(l);
          if (filter === "unsent")         { if (s !== "unsent")    return false; }
          else if (filter === "contacted") { if (s !== "contacted") return false; }
          if (purposeFilter !== "all" && l.listing_purpose !== purposeFilter && l.listing_purpose !== "both") return false;
          if (propertyFilter !== "all" && l.property_name !== propertyFilter) return false;
          if (sentDateFilter) {
            const sent = l.last_outreach_at ?? l.intake_sent_at ?? null;
            if (!sent) return false;
            const len = sentDateFilter.mode === "month" ? 7 : 10;
            if (sent.slice(0, len) !== sentDateFilter.value) return false;
          }
          if (searchLower) {
            const haystack = [l.owner_name, l.owner_phone, l.unit, l.property_name]
              .map((v) => (v ?? "").toLowerCase()).join(" ");
            if (!haystack.includes(searchLower)) return false;
          }
          return true;
        })
        .sort((a, b) => {
          const sa = getStatus(a), sb = getStatus(b);
          const order: Record<ContactStatus, number> = { unsent: 0, contacted: 1, listed: 2, rented: 3, declined: 4 };
          if (order[sa] !== order[sb]) return order[sa] - order[sb];
          // Within "contacted": sort by last sent descending (most recent first)
          if (sa === "contacted" && sb === "contacted") {
            const ta = a.intake_sent_at ?? "";
            const tb = b.intake_sent_at ?? "";
            if (ta || tb) return tb.localeCompare(ta);
          }
          return a.created_at.localeCompare(b.created_at);
        });

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const allPageSelected = paginated.length > 0 && paginated.every((l) => selectedIds.has(l.id));
  const somePageSelected = !allPageSelected && paginated.some((l) => selectedIds.has(l.id));
  const allMatchingSelected = visible.length > 0 && visible.every((l) => selectedIds.has(l.id));

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function toggleAll() {
    if (allPageSelected) {
      setSelectedIds((prev) => { const s = new Set(prev); paginated.forEach((l) => s.delete(l.id)); return s; });
    } else {
      setSelectedIds((prev) => { const s = new Set(prev); paginated.forEach((l) => s.add(l.id)); return s; });
    }
  }

  function selectAllMatching() {
    setSelectedIds(new Set(visible.map((l) => l.id)));
  }

  async function bulkMoveToDeclined() {
    await bulkSetOwnerLeadStage(Array.from(selectedIds), "archived");
    setSelectedIds(new Set());
    router.refresh();
  }

  async function handleSend(lead: OwnerLead, e: React.MouseEvent) {
    e.stopPropagation();
    if (sending) return;
    let didRun = false;
    checkAndRun(() => { didRun = true; });
    if (!didRun) return;
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

  async function handleRestore(id: string) {
    setRestoringId(id);
    try {
      await restoreOwnerLeadAction(id);
      router.refresh();
    } finally {
      setRestoringId(null);
    }
  }

  async function handleHardDelete(id: string) {
    setHardDeletingId(id);
    try {
      await hardDeleteOwnerLeadAction(id);
      setHardDeleteConfirmId(null);
      router.refresh();
    } catch {
      toast.error("Delete failed — please try again");
    } finally {
      setHardDeletingId(null);
    }
  }

  async function handleBulkHardDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkHardDeleting(true);
    try {
      await bulkHardDeleteOwnerLeadsAction(ids);
      setSelectedIds(new Set());
      setBulkHardDeleteConfirm(false);
      router.refresh();
    } catch {
      toast.error("Delete failed — please try again");
    } finally {
      setBulkHardDeleting(false);
    }
  }

  async function handleBulkDelete() {
    const selectedLeads = visible.filter((l) => selectedIds.has(l.id));
    const safeIds = selectedLeads.filter((l) => !getProtectingList(l)).map((l) => l.id);
    if (safeIds.length === 0) { setBulkDeleteConfirm(false); return; }
    setBulkDeleting(true);
    try {
      await bulkDeleteOwnerLeads(safeIds);
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
    ...(deletedLeads.length > 0 ? [{ key: "deleted" as Filter, label: `Deleted ${deletedLeads.length}` }] : []),
  ];

  return (
    <div>
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {([
          { label: "Total leads",      value: totalLeads,         sub: "Active owner contacts" },
          { label: "Contacted",        value: contacted,          sub: "Sent at least once" },
          { label: "Contacted today",  value: contactedToday,     sub: "Via WhatsApp" },
          { label: "Response rate",    value: `${responseRate}%`, sub: contacted > 0 ? "WA replies received" : "No contacts yet" },
        ] as const).map(({ label, value, sub }) => (
          <div key={label} className="kk-section p-4 flex flex-col gap-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--kk-ink-faint)" }}>{label}</p>
            <p className="text-[26px] font-bold tabular-nums leading-none" style={{ color: "var(--kk-ink)", letterSpacing: "-0.04em" }}>{value}</p>
            <p className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>{sub}</p>
          </div>
        ))}
      </div>

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

      {/* Filter row — scrollable on mobile, wraps on desktop */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-0.5 lg:flex-wrap">
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
            className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-all shrink-0"
            style={{
              background: filter === key ? "var(--kk-ink)" : "var(--kk-surface-2)",
              color: filter === key ? "#fff" : "var(--kk-ink-mute)",
              border: `1px solid ${filter === key ? "var(--kk-ink)" : "var(--kk-line)"}`,
            }}
          >
            {label}
          </button>
        ))}

        {/* Purpose filter dropdown */}
        <FilterSelect
          value={purposeFilter}
          onChange={(v) => setPurposeFilter(v as PurposeFilter)}
          options={[
            { value: "all",  label: "All purposes" },
            { value: "rent", label: "For Rent" },
            { value: "sell", label: "For Sale" },
          ]}
          minWidth={140}
        />

        {/* Last sent date filter */}
        <SentDatePickerFilter value={sentDateFilter} onChange={setSentDateFilter} />

      </div>

      {/* Daily WA counter */}
      <WaDailyCounter count={waCount} cap={waCap} onCapChange={updateWaCap} />

      {/* Table */}
      <div className="kk-section overflow-hidden p-0">
        {visible.length === 0 && !(filter === "all" && propertyFilter === "all" && !searchLower) ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <p className="text-[14px] font-medium" style={{ color: "var(--kk-ink-mute)" }}>
              {searchLower ? `No results for "${search}"` : "No owners match this filter."}
            </p>
          </div>
        ) : (
          <>
          {/* Select-all-matching banner */}
          {allPageSelected && !allMatchingSelected && visible.length > PAGE_SIZE && (
            <div style={{ padding: "8px 18px", background: "rgba(0,113,227,0.05)", borderBottom: "1px solid var(--kk-line)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "var(--kk-ink-mute)" }}>
                {selectedIds.size} owners on this page selected.
              </span>
              <button
                type="button"
                onClick={selectAllMatching}
                style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-blue)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                Select all {visible.length} matching owners
              </button>
            </div>
          )}
          {allMatchingSelected && visible.length > PAGE_SIZE && (
            <div style={{ padding: "8px 18px", background: "rgba(0,113,227,0.05)", borderBottom: "1px solid var(--kk-line)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "var(--kk-blue)", fontWeight: 500 }}>
                All {visible.length} matching owners selected.
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink-mute)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                Clear selection
              </button>
            </div>
          )}

          {/* Fixed column header — sits above the scroll container */}
          <div style={{ background: "var(--kk-surface)", borderBottom: "1px solid var(--kk-line)" }}>
            <table className="w-full" style={{ minWidth: 372, tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th className="px-2 py-2 lg:py-3 text-left" style={{ width: 30, verticalAlign: "middle" }}>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        ref={(el) => { if (el) el.indeterminate = somePageSelected; }}
                        onChange={toggleAll}
                        className="w-3.5 h-3.5 cursor-pointer block"
                      />
                    </div>
                  </th>
                  <th className="px-2 py-2 lg:py-3 text-left text-[10px] lg:text-[11px] font-semibold uppercase tracking-wide" style={{ width: 130, color: "var(--kk-accent)" }}>Owner</th>
                  <th className="px-2 py-2 lg:py-3 text-left text-[10px] lg:text-[11px] font-semibold uppercase tracking-wide" style={{ width: 118, color: "var(--kk-accent)" }}>Number</th>
                  <th className="hidden lg:table-cell px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ width: 65, color: "var(--kk-accent)" }}>Unit</th>
                  <th className="px-2 py-2 lg:py-3 text-left text-[10px] lg:text-[11px] font-semibold uppercase tracking-wide" style={{ width: 170, color: "var(--kk-accent)" }}>Property</th>
                  <th className="hidden lg:table-cell px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ width: 200, color: "var(--kk-accent)" }}>Remarks</th>
                  <th className="px-2 py-2 lg:py-3 text-left text-[10px] lg:text-[11px] font-semibold uppercase tracking-wide" style={{ width: 95, color: "var(--kk-accent)" }}>Status</th>
                  <th className="hidden lg:table-cell px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ width: 84, color: "var(--kk-accent)" }}>Last sent</th>
                  <th className="sticky right-0 lg:static px-2 py-2 lg:py-3" style={{ width: 68, background: "var(--kk-surface)" }}></th>
                </tr>
              </thead>
            </table>
          </div>
          {/* Scrollable body — scrollbar starts at first data row */}
          <div style={{ overflowX: "auto" }}>
          <table className="w-full" style={{ minWidth: 380, tableLayout: "fixed" }}>
            {/* Hidden header establishes column widths to match the fixed header above */}
            <thead aria-hidden style={{ visibility: "hidden", height: 0, lineHeight: 0 }}>
              <tr style={{ height: 0 }}>
                <th style={{ padding: 0, height: 0, width: 30 }} />
                <th style={{ padding: 0, height: 0, width: 130 }} />
                <th style={{ padding: 0, height: 0, width: 118 }} />
                <th className="hidden lg:table-cell" style={{ padding: 0, height: 0, width: 65 }} />
                <th style={{ padding: 0, height: 0, width: 170 }} />
                <th className="hidden lg:table-cell" style={{ padding: 0, height: 0, width: 200 }} />
                <th style={{ padding: 0, height: 0, width: 95 }} />
                <th className="hidden lg:table-cell" style={{ padding: 0, height: 0, width: 84 }} />
                <th style={{ padding: 0, height: 0, width: 68 }} />
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr style={{ opacity: 0.5, pointerEvents: "none" }}>
                  <td className="px-2 py-2 lg:py-3" style={{ verticalAlign: "middle" }}>
                    <input type="checkbox" disabled className="w-3.5 h-3.5 block" />
                  </td>
                  <td className="px-2 py-2 lg:py-3">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: "#AEAEB2" }}>AH</div>
                      <p className="text-[12px] font-medium truncate" style={{ color: "var(--kk-ink)" }}>Ahmad Hassan</p>
                    </div>
                  </td>
                  <td className="px-2 py-2 lg:py-3">
                    <p className="text-[11px] tabular-nums" style={{ color: "var(--kk-ink-mute)" }}>0123456789</p>
                  </td>
                  <td className="hidden lg:table-cell px-2 py-3">
                    <p className="text-[11px]" style={{ color: "var(--kk-ink)" }}>A-12-05</p>
                  </td>
                  <td className="px-2 py-2 lg:py-3">
                    <p className="text-[12px]" style={{ color: "var(--kk-ink)" }}>Agile Mont Kiara</p>
                  </td>
                  <td className="hidden lg:table-cell px-2 py-3">
                    <span className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>—</span>
                  </td>
                  <td className="px-2 py-2 lg:py-3">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-faint)", border: "1px solid var(--kk-line)" }}>Sample</span>
                  </td>
                  <td className="hidden lg:table-cell px-2 py-3">
                    <span className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>—</span>
                  </td>
                  <td className="sticky right-0 lg:static px-2 py-2 lg:py-3" style={{ background: "var(--kk-surface)" }} />
                </tr>
              ) : paginated.map((lead, i) => {
                const status = getStatus(lead);
                const isLast = i === paginated.length - 1;
                const isDeleted = filter === "deleted";
                const isHardDeleteConfirming = hardDeleteConfirmId === lead.id;
                return (
                  <tr
                    key={lead.id}
                    onClick={() => !isDeleted && setSelectedLead(lead)}
                    className={`group transition-colors ${isDeleted ? "cursor-default" : "cursor-pointer"}`}
                    style={{
                      borderBottom: isLast ? "none" : "1px solid var(--kk-line)",
                      background: selectedIds.has(lead.id) ? "rgba(0,113,227,0.04)" : undefined,
                      opacity: isDeleted ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => { if (!isDeleted) (e.currentTarget as HTMLElement).style.background = "var(--kk-surface-2)"; }}
                    onMouseLeave={(e) => { if (!isDeleted) (e.currentTarget as HTMLElement).style.background = selectedIds.has(lead.id) ? "rgba(0,113,227,0.04)" : "transparent"; }}
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
                    <td className="px-2 py-2 lg:py-3 overflow-hidden">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                          style={{ background: getAvatarColor(lead.owner_name) }}
                        >
                          {getInitials(lead.owner_name)}
                        </div>
                        <p className="text-[11px] lg:text-[12px] font-medium truncate" style={{ color: "var(--kk-ink)" }}>
                          {lead.owner_name ?? "—"}
                        </p>
                      </div>
                    </td>

                    {/* Number */}
                    <td className="px-2 py-2 lg:py-3 overflow-hidden">
                      {lead.owner_phone ? (
                        <p className="text-[10px] lg:text-[11px] truncate tabular-nums" style={{ color: "var(--kk-ink-mute)" }}>{lead.owner_phone}</p>
                      ) : (
                        <span className="text-[10px] lg:text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>—</span>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="hidden lg:table-cell px-2 py-3 overflow-hidden">
                      {lead.unit ? (
                        <p className="text-[11px] truncate" style={{ color: "var(--kk-ink)" }}>{lead.unit}</p>
                      ) : (
                        <span className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>—</span>
                      )}
                    </td>

                    {/* Property */}
                    <td className="px-2 py-2 lg:py-3 overflow-hidden">
                      {lead.property_name ? (
                        <p className="text-[11px] lg:text-[12px] truncate" style={{ color: "var(--kk-ink)" }}>{lead.property_name}</p>
                      ) : (
                        <span className="text-[11px] lg:text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>—</span>
                      )}
                    </td>

                    {/* Remarks */}
                    <td className="hidden lg:table-cell px-2 py-3 overflow-hidden" style={{ maxWidth: 180 }}>
                      {lead.notes ? (
                        <p className="text-[11px] truncate" style={{ color: "var(--kk-ink-mute)" }}>
                          {lead.notes.length > 80 ? lead.notes.slice(0, 80) + "…" : lead.notes}
                        </p>
                      ) : (
                        <span className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-2 py-2 lg:py-3">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge lead={lead} />
                        <PurposeBadge purpose={lead.listing_purpose} />
                      </div>
                    </td>

                    {/* Last sent */}
                    <td className="hidden lg:table-cell px-2 py-3">
                      <span className="text-[11px]" style={{ color: "var(--kk-ink-mute)" }}>
                        {status === "unsent" ? "—" : relativeTime(lead.intake_sent_at)}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="sticky right-0 lg:static px-2 py-2 lg:py-3" style={{ background: "var(--kk-surface)", width: isDeleted ? 180 : undefined }} onClick={(e) => e.stopPropagation()}>
                      {isDeleted ? (
                        <div className="flex items-center gap-1.5 justify-end">
                          {!isHardDeleteConfirming ? (
                            <>
                              <button
                                type="button"
                                disabled={restoringId === lead.id}
                                onClick={() => handleRestore(lead.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-70 disabled:opacity-40 whitespace-nowrap"
                                style={{ background: "rgba(0,113,227,0.10)", color: "var(--kk-blue)" }}
                              >
                                {restoringId === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                Restore
                              </button>
                              <button
                                type="button"
                                onClick={() => setHardDeleteConfirmId(lead.id)}
                                className="w-6 h-6 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
                                style={{ background: "rgba(255,59,48,0.10)", color: "#FF3B30" }}
                                title="Delete forever"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setHardDeleteConfirmId(null)}
                                className="px-2 py-1 rounded-lg text-[11px] font-medium"
                                style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", border: "1px solid var(--kk-line)" }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={hardDeletingId === lead.id}
                                onClick={() => handleHardDelete(lead.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold disabled:opacity-50 whitespace-nowrap"
                                style={{ background: "#FF3B30", color: "#fff" }}
                              >
                                {hardDeletingId === lead.id && <Loader2 className="w-3 h-3 animate-spin" />}
                                Delete forever
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          {(status === "listed" || status === "rented") ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); router.push(`/my-listing?highlight=${lead.id}`); }}
                              className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                              style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
                              title="Go to card"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={sending === lead.id}
                                onClick={(e) => handleSend(lead, e)}
                                className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-50"
                                style={{ background: "#25D366", color: "#fff" }}
                                title="Send WhatsApp"
                              >
                                {sending === lead.id
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <WhatsAppIcon className="w-3.5 h-3.5" />
                                }
                              </button>
                              {lead.owner_phone && (
                                <a
                                  href={`tel:${toE164Display(lead.owner_phone)}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                                  style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
                                  title="Call"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          {/* Pagination footer */}
          <div style={{ padding: "12px 18px", borderTop: "1px solid var(--kk-line)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--kk-ink-mute)", flexShrink: 0 }}>
              {visible.length === 0
                ? "No owners"
                : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, visible.length)} of ${visible.length} owner${visible.length !== 1 ? "s" : ""}${visible.length < totalLeads ? ` (filtered from ${totalLeads})` : ""}`
              }
            </span>
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => p - 1)}
                  style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--kk-line)", background: "var(--kk-surface)", fontSize: 13, cursor: currentPage === 1 ? "default" : "pointer", color: currentPage === 1 ? "var(--kk-ink-faint)" : "var(--kk-ink)", display: "flex", alignItems: "center", justifyContent: "center" }}
                >‹</button>
                {getPageNumbers(currentPage, totalPages).map((p, i) =>
                  p === "..." ? (
                    <span key={`dots-${i}`} style={{ width: 30, textAlign: "center", fontSize: 13, color: "var(--kk-ink-faint)" }}>…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--kk-line)", fontSize: 13, fontWeight: p === currentPage ? 700 : 500, cursor: "pointer", background: p === currentPage ? "var(--kk-ink)" : "var(--kk-surface)", color: p === currentPage ? "#fff" : "var(--kk-ink)", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >{p}</button>
                  )
                )}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--kk-line)", background: "var(--kk-surface)", fontSize: 13, cursor: currentPage === totalPages ? "default" : "pointer", color: currentPage === totalPages ? "var(--kk-ink-faint)" : "var(--kk-ink)", display: "flex", alignItems: "center", justifyContent: "center" }}
                >›</button>
              </div>
            )}
          </div>
          </>
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
          {filter === "deleted" ? (
            <button
              type="button"
              onClick={() => setBulkHardDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-80"
              style={{ background: "rgba(255,59,48,0.25)", color: "#FF6B6B" }}
            >
              <Trash2 className="w-3 h-3" />
              Delete permanently
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setBulkDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-80"
              style={{ background: "rgba(255,59,48,0.25)", color: "#FF6B6B" }}
            >
              Delete
            </button>
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

      {/* Bulk delete confirmation dialog */}
      {(() => {
        const selectedLeads = visible.filter((l) => selectedIds.has(l.id));
        const safeLeads = selectedLeads.filter((l) => !getProtectingList(l));
        const protectedLeads = selectedLeads.filter((l) => getProtectingList(l));
        const protectedLists = [...new Set(protectedLeads.map((l) => getProtectingList(l) as string))];
        return (
          <Dialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
            <DialogContent showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>Delete leads</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                {protectedLeads.length > 0 && (
                  <div className="rounded-xl px-4 py-3" style={{ background: "rgba(255,59,48,0.08)" }}>
                    <p className="text-[13px] font-semibold mb-1" style={{ color: "#FF3B30" }}>
                      {protectedLeads.length} lead{protectedLeads.length !== 1 ? "s" : ""} cannot be deleted
                    </p>
                    <p className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>
                      {protectedLeads.length === 1
                        ? `This lead is currently in ${protectedLists.join(" and ")} and will be kept.`
                        : `These leads are in ${protectedLists.join(" and ")} and will be kept.`}
                    </p>
                  </div>
                )}
                {safeLeads.length > 0 ? (
                  <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
                    {safeLeads.length} lead{safeLeads.length !== 1 ? "s" : ""} will be moved to the bin and auto-deleted after 7 days.
                  </p>
                ) : (
                  <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
                    All selected leads are protected and cannot be deleted.
                  </p>
                )}
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setBulkDeleteConfirm(false)}
                  className="px-4 py-2 rounded-xl text-[13px] font-medium transition-opacity hover:opacity-70"
                  style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
                >
                  Cancel
                </button>
                {safeLeads.length > 0 && (
                  <button
                    type="button"
                    disabled={bulkDeleting}
                    onClick={handleBulkDelete}
                    className="px-4 py-2 rounded-xl text-[13px] font-semibold disabled:opacity-50 flex items-center gap-1.5"
                    style={{ background: "#FF3B30", color: "#fff" }}
                  >
                    {bulkDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Delete {safeLeads.length} lead{safeLeads.length !== 1 ? "s" : ""}
                  </button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Bulk permanent delete confirmation */}
      <Dialog open={bulkHardDeleteConfirm} onOpenChange={setBulkHardDeleteConfirm}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete permanently?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
              {selectedIds.size} lead{selectedIds.size !== 1 ? "s" : ""} will be permanently deleted. This cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setBulkHardDeleteConfirm(false)}
              className="px-4 py-2 rounded-xl text-[13px] font-medium transition-opacity hover:opacity-70"
              style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={bulkHardDeleting}
              onClick={handleBulkHardDelete}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: "#FF3B30", color: "#fff" }}
            >
              {bulkHardDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Delete forever
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      <WhatsAppGateDialog open={gateOpen} onOpenChange={setGateOpen} missingFields={missingFields} />
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

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function SentDatePickerFilter({ value, onChange }: { value: SentDateFilter; onChange: (v: SentDateFilter) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"month" | "day">("month");
  const now = new Date();
  const [navYear, setNavYear] = useState(now.getFullYear());
  const [navMonth, setNavMonth] = useState(now.getMonth() + 1);

  const label = value
    ? value.mode === "month"
      ? `${MONTHS_SHORT[Number(value.value.slice(5, 7)) - 1]} ${value.value.slice(0, 4)}`
      : new Date(value.value + "T00:00:00").toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })
    : "Last sent";

  const daysInMonth = new Date(navYear, navMonth, 0).getDate();
  const firstDayOfWeek = new Date(navYear, navMonth - 1, 1).getDay();

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: active ? 600 : 400,
    background: active ? "var(--kk-ink)" : "transparent", color: active ? "#fff" : "var(--kk-ink)",
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="shrink-0"
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "6px 12px", borderRadius: 9999, fontSize: 13, fontWeight: 500,
            border: `1px solid ${value ? "var(--kk-ink)" : "var(--kk-line)"}`,
            background: value ? "var(--kk-ink)" : "var(--kk-surface-2)",
            color: value ? "#fff" : "var(--kk-ink-mute)", cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          {label}
          {value && (
            <span
              onClick={(e) => { e.stopPropagation(); onChange(null); setOpen(false); }}
              style={{ marginLeft: 2, fontSize: 14, lineHeight: 1, opacity: 0.7 }}
            >×</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="p-3 w-[220px]"
        style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", borderRadius: 14, boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 4, marginBottom: 12, background: "var(--kk-surface-2)", borderRadius: 8, padding: 3 }}>
          {(["month", "day"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              style={{ flex: 1, padding: "4px 0", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                background: mode === m ? "var(--kk-surface)" : "transparent",
                color: mode === m ? "var(--kk-ink)" : "var(--kk-ink-mute)",
                boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.10)" : "none" }}>
              {m === "month" ? "By month" : "By day"}
            </button>
          ))}
        </div>

        {/* Year nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <button type="button" onClick={() => setNavYear(y => y - 1)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--kk-ink)", padding: "0 6px" }}>‹</button>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--kk-ink)" }}>{navYear}</span>
          <button type="button" onClick={() => setNavYear(y => y + 1)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--kk-ink)", padding: "0 6px" }}>›</button>
        </div>

        {mode === "month" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
            {MONTHS_SHORT.map((name, i) => {
              const mv = `${navYear}-${String(i + 1).padStart(2, "0")}`;
              const sel = value?.mode === "month" && value.value === mv;
              return (
                <button key={i} type="button" onClick={() => { onChange({ mode: "month", value: mv }); setOpen(false); }}
                  style={pillStyle(sel)}>{name}</button>
              );
            })}
          </div>
        ) : (
          <>
            {/* Month nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <button type="button" onClick={() => { if (navMonth === 1) { setNavMonth(12); setNavYear(y => y - 1); } else setNavMonth(m => m - 1); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--kk-ink)", padding: "0 4px" }}>‹</button>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--kk-ink)" }}>{MONTHS_SHORT[navMonth - 1]}</span>
              <button type="button" onClick={() => { if (navMonth === 12) { setNavMonth(1); setNavYear(y => y + 1); } else setNavMonth(m => m + 1); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--kk-ink)", padding: "0 4px" }}>›</button>
            </div>
            {/* Day grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {["S","M","T","W","T","F","S"].map((d, i) => (
                <span key={i} style={{ textAlign: "center", fontSize: 9, fontWeight: 600, color: "var(--kk-ink-faint)", paddingBottom: 2 }}>{d}</span>
              ))}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <span key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const dv = `${navYear}-${String(navMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const sel = value?.mode === "day" && value.value === dv;
                return (
                  <button key={day} type="button" onClick={() => { onChange({ mode: "day", value: dv }); setOpen(false); }}
                    style={{ padding: "3px 0", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 11, fontWeight: sel ? 700 : 400,
                      background: sel ? "var(--kk-ink)" : "transparent", color: sel ? "#fff" : "var(--kk-ink)", textAlign: "center" }}>
                    {day}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {value && (
          <button type="button" onClick={() => { onChange(null); setOpen(false); }}
            style={{ marginTop: 10, width: "100%", padding: "6px 0", borderRadius: 8, border: "1px solid var(--kk-line)",
              background: "none", fontSize: 12, color: "var(--kk-ink-mute)", cursor: "pointer" }}>
            Clear filter
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function PropertyPopover({
  value,
  onChange,
  stats,
}: {
  value: string;
  onChange: (v: string) => void;
  stats: PropertyStats;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dropRect, setDropRect] = useState<{ top: number; left: number } | null>(null);
  const [renamingProp, setRenamingProp] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamePending, startRenameTransition] = useTransition();
  const btnRef = useRef<HTMLButtonElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onMouse); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function handleOpen() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropRect({ top: r.bottom + 6, left: r.left });
    }
    setOpen((v) => !v);
  }

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
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
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

      {open && dropRect && (
        <div
          ref={ref}
          style={{
            position: "fixed",
            top: dropRect.top,
            left: Math.min(dropRect.left, window.innerWidth - 340),
            zIndex: 9999,
            background: "var(--kk-surface)",
            border: "1px solid var(--kk-line)",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
            width: Math.min(520, window.innerWidth - 24),
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
                  onClick={() => { if (renamingProp !== p) pick(p); }}
                  style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--kk-line)" : "none", cursor: renamingProp === p ? "default" : "pointer", background: value === p ? "rgba(0,113,227,0.06)" : undefined }}
                  onMouseEnter={(e) => { if (renamingProp !== p) (e.currentTarget as HTMLElement).style.background = "var(--kk-surface-2)"; }}
                  onMouseLeave={(e) => { if (renamingProp !== p) (e.currentTarget as HTMLElement).style.background = value === p ? "rgba(0,113,227,0.06)" : "transparent"; }}
                >
                  <td className="px-4 py-1.5 text-[13px] font-medium" style={{ color: "var(--kk-ink)", maxWidth: 220 }}>
                    {renamingProp === p ? (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              startRenameTransition(async () => {
                                const res = await renamePropertyGroupAction(p, renameValue);
                                if (res.ok) { toast.success("Property renamed"); if (value === p) onChange(renameValue.trim()); router.refresh(); setRenamingProp(null); }
                                else toast.error(res.message ?? "Could not rename");
                              });
                            }
                            if (e.key === "Escape") setRenamingProp(null);
                          }}
                          className="flex-1 px-2 py-1 rounded-lg text-[13px] outline-none min-w-0"
                          style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-theme-dark)", color: "var(--kk-ink)", width: 140 }}
                          disabled={renamePending}
                          autoFocus
                        />
                        <button type="button" disabled={renamePending} onClick={(e) => { e.stopPropagation(); startRenameTransition(async () => { const res = await renamePropertyGroupAction(p, renameValue); if (res.ok) { toast.success("Property renamed"); if (value === p) onChange(renameValue.trim()); router.refresh(); setRenamingProp(null); } else toast.error(res.message ?? "Could not rename"); }); }}
                          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                          style={{ background: "var(--kk-ink)", color: "#fff" }}>
                          {renamePending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setRenamingProp(null); }}
                          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                          style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group/row" style={{ overflow: "hidden" }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setRenamingProp(p); setRenameValue(p); setTimeout(() => renameInputRef.current?.select(), 50); }}
                          className="w-5 h-5 rounded flex items-center justify-center shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity"
                          style={{ color: "var(--kk-ink-faint)" }}>
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
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
