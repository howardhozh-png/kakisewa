"use client";

import { useState, useTransition, useRef, useMemo, useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { track } from "@/lib/analytics";
import { Camera, FileText, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DateInput } from "@/components/ui/date-input";
import { addOwnerLeadAction, saveOwnerLeadPhotos, saveOwnerLeadAgreementUrl, checkTargetCapAction } from "@/lib/actions";
import { CAP_WARN_THRESHOLD } from "@/lib/cap-constants";
import { BedroomPicker } from "@/components/edit-owner-lead-dialog";
import { PlanCapDialog } from "@/components/plan-cap-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { normalizePhone, phoneError } from "@/lib/phone";
import type { OwnerLead } from "@/lib/types";

const PHOTO_MAX = 10;

function computeEnd(start: string, months: number): string {
  if (!start || !months) return "";
  const [y, m, day] = start.split("-").map(Number);
  if (!y || !m || !day) return "";
  if (day === 1) {
    const e = new Date(y, m - 1 + months + 1, 0);
    return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
  }
  const ann = new Date(y, m - 1 + months, day);
  const e = new Date(ann.getTime() - 86400000);
  return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
}

function computeDuration(start: string, end: string): number {
  if (!start || !end) return 12;
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / (30.4375 * 86400000)));
}

function serializeAgreementUrls(urls: string[]): string | null {
  if (urls.length === 0) return null;
  if (urls.length === 1) return urls[0];
  return JSON.stringify(urls);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerLeads?: OwnerLead[];
}

export function AddCompetitorDialog({ open, onOpenChange, ownerLeads = [] }: Props) {
  const router = useRouter();
  const ph = usePostHog();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [capBlock, setCapBlock] = useState<{ currentPlan: string; currentCount: number; currentCap: number; upgradeToId?: string; upgradeCap: number | null } | null>(null);
  const [form, setForm] = useState({
    property_name: "", unit: "", owner_name: "", owner_phone: "",
    expected_rent: "", bedrooms: "", bathrooms: "", parking: "", notes: "",
    rented_on: "",
    duration: "",
  });
  const [phoneErr, setPhoneErr] = useState<string | null>(null);
  const [showSugg, setShowSugg] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<Array<{ file: File; preview: string }>>([]);
  const [agreementFiles, setAgreementFiles] = useState<Array<{ file: File; name: string }>>([]);
  const photoRef = useRef<HTMLInputElement>(null);
  const agreementRef = useRef<HTMLInputElement>(null);

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleStartChange(iso: string) {
    set("rented_on", iso);
    if (endDate && iso && form.duration) setEndDate(computeEnd(iso, parseInt(form.duration, 10)));
  }

  function handleDurationChange(val: string) {
    set("duration", val);
    if (endDate && form.rented_on && val) setEndDate(computeEnd(form.rented_on, parseInt(val, 10)));
  }

  function handleEndDateChange(iso: string) {
    setEndDate(iso);
    if (form.rented_on && iso) set("duration", String(computeDuration(form.rented_on, iso)));
  }

  const suggestions = useMemo(() => {
    const q = form.property_name.trim().toLowerCase();
    const seen = new Set<string>();
    const base = q ? ownerLeads.filter((ol) => (ol.property_name ?? "").toLowerCase().includes(q)) : ownerLeads;
    return base.filter((ol) => {
      const key = (ol.property_name ?? "").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  }, [form.property_name, ownerLeads]);

  function selectExisting(ol: OwnerLead) {
    set("property_name", ol.property_name ?? "");
    setShowSugg(false);
  }

  function handlePhoneBlur() {
    const normalized = normalizePhone(form.owner_phone);
    if (form.owner_phone) set("owner_phone", normalized);
    setPhoneErr(phoneError(normalized));
  }

  function addPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPhotoFiles((prev) => [...prev, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))].slice(0, PHOTO_MAX));
    if (photoRef.current) photoRef.current.value = "";
  }
  function removePhoto(i: number) {
    setPhotoFiles((prev) => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, idx) => idx !== i); });
  }

  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!open) {
      setForm({ property_name: "", unit: "", owner_name: "", owner_phone: "", expected_rent: "", bedrooms: "", bathrooms: "", parking: "", notes: "", rented_on: "", duration: "" });
      setEndDate("");
      setPhoneErr(null);
      setShowSugg(false);
      setPhotoFiles([]);
      setAgreementFiles([]);
    }
  }, [open]);

  function handleSubmit() {
    if (!form.property_name.trim()) { toast.error("Property name required"); return; }
    if (!form.rented_on) { toast.error("Start date required"); return; }
    if (!endDate) { toast.error("End date required"); return; }
    const pErr = phoneError(normalizePhone(form.owner_phone));
    if (pErr) { setPhoneErr(pErr); toast.error(pErr); return; }

    setUploading(true);
    startTransition(async () => {
      try {
        // Check target cap before creating anything
        const capCheck = await checkTargetCapAction();
        if (!capCheck.allowed) {
          setCapBlock({ currentPlan: capCheck.current_plan, currentCount: capCheck.current_count, currentCap: capCheck.current_cap, upgradeToId: capCheck.upgrade_to ?? undefined, upgradeCap: capCheck.upgrade_cap });
          setUploading(false);
          return;
        }

        const res = await addOwnerLeadAction({
          owner_name: form.owner_name || "Unknown",
          owner_phone: form.owner_phone || "0",
          property_name: form.property_name.trim(),
          unit: form.unit || null,
          expected_rent: form.expected_rent ? parseFloat(form.expected_rent) : null,
          bedrooms: form.bedrooms !== "" ? parseInt(form.bedrooms, 10) : null,
          bathrooms: form.bathrooms ? parseInt(form.bathrooms, 10) : null,
          parking: form.parking.trim() || null,
          notes: form.notes.trim() || null,
          stage: "imported",
        });
        if (!res.ok || !res.id) { toast.error("Could not save"); return; }

        const { markCompetitorRentedAction } = await import("@/lib/actions");
        await markCompetitorRentedAction(res.id, form.rented_on, parseInt(form.duration, 10) || computeDuration(form.rented_on, endDate), endDate);

        // Upload photos
        if (photoFiles.length > 0) {
          const urls: string[] = [];
          for (const { file } of photoFiles) {
            const fd = new FormData(); fd.append("leadId", res.id); fd.append("file", file);
            const r = await fetch("/api/agent/photo", { method: "POST", body: fd });
            const d = await r.json() as { ok?: boolean; url?: string };
            if (d.ok && d.url) urls.push(d.url);
          }
          if (urls.length > 0) await saveOwnerLeadPhotos(res.id, urls);
        }

        // Upload agreement files
        if (agreementFiles.length > 0) {
          const aUrls: string[] = [];
          for (const { file } of agreementFiles) {
            const fd = new FormData(); fd.append("file", file);
            const r = await fetch("/api/upload/document", { method: "POST", body: fd });
            const d = await r.json() as { url?: string };
            if (d.url) aUrls.push(d.url);
          }
          const serialized = serializeAgreementUrls(aUrls);
          if (serialized) await saveOwnerLeadAgreementUrl(res.id, serialized);
        }

        const slotsLeft = capCheck.remaining - 1;
        if (slotsLeft <= CAP_WARN_THRESHOLD) {
          track(ph, "card_added", { type: "listing" });
          toast.warning(`Target unit added. Only ${slotsLeft} Lost Listing slot${slotsLeft === 1 ? "" : "s"} remaining.`);
        } else {
          track(ph, "card_added", { type: "listing" });
          toast.success("Target unit added");
        }
        photoFiles.forEach((p) => URL.revokeObjectURL(p.preview));
        onOpenChange(false); // triggers useEffect reset
        router.refresh();
      } finally {
        setUploading(false);
      }
    });
  }

  const busy = pending || uploading;

  const field = "w-full text-[14px] px-3 py-2 rounded-xl outline-none";
  const fs = { background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" };

  return (
    <>
      <PlanCapDialog
        open={!!capBlock}
        pipeline="target"
        currentPlan={capBlock?.currentPlan ?? "silver"}
        currentCount={capBlock?.currentCount ?? 0}
        currentCap={capBlock?.currentCap ?? 10}
        upgradeToId={capBlock?.upgradeToId ?? "gold"}
        upgradeCap={capBlock?.upgradeCap ?? null}
        nearestExpiryDays={null}
        onClose={() => setCapBlock(null)}
      />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="bg-card border-border max-w-sm p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="overflow-y-auto p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="kk-overline mb-1">Add target unit</p>
              <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
                Track a competitor unit. We'll remind you 60 days before their tenancy ends.
              </p>
            </div>
            <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:opacity-70 shrink-0 mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Property name */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Property name<span style={{ color: "var(--kk-red)" }}> *</span></label>
            <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowSugg(false); }}>
              <input
                value={form.property_name}
                onChange={e => { set("property_name", e.target.value); setShowSugg(true); }}
                onFocus={() => setShowSugg(true)}
                placeholder="e.g. Residensi Mutiara"
                className={field}
                style={fs}
              />
              {showSugg && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden"
                  style={{ zIndex: 9999, background: "var(--kk-surface)", border: "1px solid var(--kk-line)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 240, overflowY: "auto" }}>
                  {suggestions.map((ol) => (
                    <button key={ol.id} type="button" onMouseDown={(e) => { e.preventDefault(); selectExisting(ol); }}
                      className="w-full text-left px-4 py-2.5 hover:opacity-70">
                      <p className="text-[13px] font-medium" style={{ color: "var(--kk-ink)" }}>{ol.property_name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Unit + Rent */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Unit</label>
              <input value={form.unit} onChange={e => set("unit", e.target.value)} placeholder="e.g. A-12" className={field} style={fs} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Rent (RM/mo)</label>
              <input type="number" value={form.expected_rent} onChange={e => set("expected_rent", e.target.value)} onWheel={e => e.currentTarget.blur()} placeholder="e.g. 1800" className={field} style={fs} />
            </div>
          </div>

          {/* Bedrooms + Bathrooms */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <BedroomPicker value={form.bedrooms} onChange={(v) => set("bedrooms", v)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Bathrooms</label>
              <input type="number" value={form.bathrooms} min="0" onChange={e => set("bathrooms", String(Math.max(0, Number(e.target.value))))} onWheel={e => e.currentTarget.blur()} placeholder="2" className={field} style={fs} />
            </div>
          </div>

          {/* Parking */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Parking</label>
              <input type="text" value={form.parking} onChange={e => set("parking", e.target.value)} placeholder="e.g. A142" className={field} style={fs} />
            </div>
          </div>

          {/* Owner */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Owner name</label>
              <input value={form.owner_name} onChange={e => set("owner_name", e.target.value)} placeholder="Optional" className={field} style={fs} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Owner phone</label>
              <input
                value={form.owner_phone}
                onChange={e => { set("owner_phone", e.target.value); setPhoneErr(null); }}
                onBlur={handlePhoneBlur}
                placeholder="601x…"
                className={field}
                style={{ ...fs, border: phoneErr ? "1px solid var(--kk-red)" : fs.border }}
              />
              {phoneErr ? (
                <p className="text-[11px]" style={{ color: "var(--kk-red)" }}>{phoneErr}</p>
              ) : (
                <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>For overseas numbers, include the country code, e.g. +44 7911 123456</p>
              )}
            </div>
          </div>

          {/* Contract dates — all three linked */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Rented on<span style={{ color: "var(--kk-red)" }}> *</span></label>
              <DateInput value={form.rented_on} onChange={handleStartChange} className={field} style={fs} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Duration (months)</label>
              <input type="number" value={form.duration} min="1" max="120" onChange={e => handleDurationChange(e.target.value)} onWheel={e => e.currentTarget.blur()} className={field} style={fs} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>End date<span style={{ color: "var(--kk-red)" }}> *</span></label>
            <DateInput value={endDate} onChange={handleEndDateChange} className={field} style={fs} />
            <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>You'll be reminded 60 days before. Changing this updates duration.</p>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              placeholder="Anything worth noting…"
              className="w-full text-[13px] px-3 py-2 rounded-xl outline-none"
              style={{ ...fs, minHeight: 64 }} />
          </div>

          {/* Photos */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--kk-ink-faint)" }}>Property photos <span className="normal-case font-normal">(optional)</span></p>
            <div className="flex flex-wrap gap-2">
              {photoFiles.map(({ preview }, i) => (
                <div key={preview} className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0" style={{ border: "1px solid var(--kk-line)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(i)} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {photoFiles.length < PHOTO_MAX && (
                <button type="button" onClick={() => photoRef.current?.click()}
                  className="w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 shrink-0 hover:opacity-70"
                  style={{ border: "1.5px dashed var(--kk-line)", color: "var(--kk-ink-mute)" }}>
                  <Camera className="w-4 h-4" /><span className="text-[10px] font-medium">Add</span>
                </button>
              )}
              <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={addPhoto} />
            </div>
          </div>

          {/* Agreement — up to 3 files */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--kk-ink-faint)" }}>Tenancy agreement <span className="normal-case font-normal">(optional, max 3)</span></p>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
              <div className="px-3 py-2 space-y-1">
                {agreementFiles.map((af, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--kk-green-soft)" }}>
                      <FileText className="w-3.5 h-3.5" style={{ color: "var(--kk-green)" }} />
                    </div>
                    <span className="flex-1 text-[12px] truncate min-w-0" style={{ color: "var(--kk-ink-soft)" }}>{af.name}</span>
                    <button type="button" onClick={() => setAgreementFiles((prev) => prev.filter((_, idx) => idx !== i))} className="p-1">
                      <X className="w-3.5 h-3.5" style={{ color: "var(--kk-ink-mute)" }} />
                    </button>
                  </div>
                ))}
                {agreementFiles.length < 5 && (
                  <div className="py-2 flex flex-col items-center gap-1">
                    <button type="button" onClick={() => agreementRef.current?.click()}
                      className="flex items-center gap-2 text-[13px] hover:opacity-70"
                      style={{ color: "var(--kk-ink-mute)" }}>
                      <FileText className="w-4 h-4" />
                      {agreementFiles.length === 0 ? "Upload document" : "Add document"}
                    </button>
                    <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>PDF, image, or any file — max 20 MB</p>
                  </div>
                )}
              </div>
            </div>
            <input ref={agreementRef} type="file" className="hidden" multiple
              onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length) setAgreementFiles((prev) => [...prev, ...files.map((f) => ({ file: f, name: f.name }))].slice(0, 5)); if (agreementRef.current) agreementRef.current.value = ""; }} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => onOpenChange(false)} className="kk-pill kk-pill-ghost flex-1">Cancel</button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy || !form.property_name.trim() || !form.rented_on || !endDate}
              className="kk-pill flex-1 font-semibold flex items-center justify-center gap-1.5"
              style={{ background: "var(--kk-ink)", color: "#fff", opacity: busy || !form.property_name.trim() ? 0.5 : 1 }}
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {uploading ? "Uploading…" : pending ? "Adding…" : "Add target"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
