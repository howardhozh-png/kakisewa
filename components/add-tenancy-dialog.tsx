"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import { usePostHog } from "posthog-js/react";
import { track } from "@/lib/analytics";
import { Camera, FileText, X, Loader2 } from "lucide-react";
import { normalizePhone } from "@/lib/phone";
import { MoneyInput } from "@/components/ui/money-input";
import { DateInput } from "@/components/ui/date-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlanCapDialog } from "@/components/plan-cap-dialog";
import { BedroomPicker } from "@/components/edit-owner-lead-dialog";
import { addTenancy } from "@/lib/actions";
import type { OwnerLead } from "@/lib/types";
import { toast } from "sonner";

const PHOTO_MAX = 10;

type CapBlock = { currentPlan: string; currentCount: number; currentCap: number; upgradeToId: string; upgradeCap: number | null; nearestExpiryDays: number | null };

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--kk-ink-faint)", letterSpacing: "0.1em" }}>{children}</p>;
}
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--kk-ink-soft)" }}>{children}{required && <span style={{ color: "var(--kk-red)" }}> *</span>}</label>;
}
function TextInput({ value, onChange, onBlur, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; onBlur?: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined} placeholder={placeholder}
      className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
      style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }} />
  );
}

export function AddTenancyDialog({ ownerLeads }: { ownerLeads: OwnerLead[] }) {
  const ph = usePostHog();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [capBlock, setCapBlock] = useState<CapBlock | null>(null);

  // Property
  const [propertyName, setPropertyName] = useState("");
  const [unit, setUnit] = useState("");
  const [showSugg, setShowSugg] = useState(false);

  // Property details
  const [amount, setAmount] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [parking, setParking] = useState("");
  const [notes, setNotes] = useState("");

  // Contract
  const [contractStart, setContractStart] = useState("");
  const [durationMonths, setDurationMonths] = useState("");

  // Owner
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");

  // Tenant
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");

  // Media
  const [photoFiles, setPhotoFiles] = useState<Array<{ file: File; preview: string }>>([]);
  const [agreementFiles, setAgreementFiles] = useState<Array<{ file: File; name: string }>>([]);
  const photoRef = useRef<HTMLInputElement>(null);
  const agreementRef = useRef<HTMLInputElement>(null);

  const contractEnd = (() => {
    if (!contractStart || !durationMonths) return "";
    const [y, m, d] = contractStart.split("-").map(Number);
    const months = parseInt(durationMonths, 10);
    if (!months) return "";
    let end: Date;
    if (d === 1) {
      // Starts on 1st: last day of the Nth month (e.g. June 1 + 12m = May 31 next year)
      end = new Date(y, m - 1 + months, 0);
    } else {
      // Starts mid-month: anniversary date minus 1 day (e.g. June 17 + 12m = June 16 next year)
      const anniversary = new Date(y, m - 1 + months, d);
      end = new Date(anniversary.getTime() - 86400000);
    }
    return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  })();

  const suggestions = useMemo(() => {
    const q = propertyName.trim().toLowerCase();
    const seen = new Set<string>();
    const base = q ? ownerLeads.filter((ol) => (ol.property_name ?? "").toLowerCase().includes(q)) : ownerLeads;
    return base.filter((ol) => {
      const key = (ol.property_name ?? "").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  }, [propertyName, ownerLeads]);

  function selectExisting(ol: OwnerLead) {
    setPropertyName(ol.property_name ?? "");
    setShowSugg(false);
  }

  function addPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPhotoFiles((prev) => [...prev, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))].slice(0, PHOTO_MAX));
    if (photoRef.current) photoRef.current.value = "";
  }
  function removePhoto(i: number) {
    setPhotoFiles((prev) => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, idx) => idx !== i); });
  }

  function reset() {
    setPropertyName(""); setUnit("");
    setAmount(""); setBedrooms(""); setBathrooms(""); setParking(""); setNotes("");
    setOwnerName(""); setOwnerPhone("");
    setContractStart(""); setDurationMonths("");
    photoFiles.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotoFiles([]); setAgreementFiles([]);
    setTenantName(""); setTenantPhone("");
    setShowSugg(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!propertyName.trim())  { toast.error("Property name is required"); return; }
    if (!ownerName.trim())     { toast.error("Owner name is required"); return; }
    if (!ownerPhone.trim())    { toast.error("Owner phone is required"); return; }
    if (!amount)               { toast.error("Monthly rent is required"); return; }
    if (!contractStart)        { toast.error("Contract start date is required"); return; }
    if (!durationMonths)       { toast.error("Duration is required"); return; }

    setUploading(true);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("owner_lead_id", "");
        fd.set("property_name", propertyName.trim());
        fd.set("property_unit", unit.trim());
        fd.set("owner_name", ownerName.trim());
        fd.set("owner_phone", normalizePhone(ownerPhone.trim()));
        fd.set("amount", amount);
        fd.set("due_day", "1");
        fd.set("contract_start", contractStart);
        fd.set("contract_duration_months", durationMonths);
        fd.set("tenant_name", tenantName.trim());
        fd.set("tenant_phone", normalizePhone(tenantPhone.trim()));
        if (bedrooms !== "") fd.set("bedrooms", bedrooms);
        if (bathrooms !== "") fd.set("bathrooms", bathrooms);
        if (parking.trim()) fd.set("parking", parking.trim());
        if (notes.trim()) fd.set("notes", notes.trim());

        // Upload photos
        for (let i = 0; i < photoFiles.length; i++) {
          const uploadFd = new FormData();
          uploadFd.append("file", photoFiles[i].file);
          const r = await fetch("/api/upload/document", { method: "POST", body: uploadFd });
          const d = await r.json() as { url?: string };
          if (d.url) fd.set(`photo_url_${i}`, d.url);
        }

        // Upload agreement files (up to 3), serialize as JSON
        if (agreementFiles.length > 0) {
          const aUrls: string[] = [];
          for (const { file } of agreementFiles) {
            const uploadFd = new FormData();
            uploadFd.append("file", file);
            const r = await fetch("/api/upload/document", { method: "POST", body: uploadFd });
            const d = await r.json() as { url?: string };
            if (d.url) aUrls.push(d.url);
          }
          const serialized = serializeAgreementUrls(aUrls);
          if (serialized) fd.set("agreement_url", serialized);
        }

        const res = await addTenancy(fd);
        if (!res.ok && res.reason === "plan_cap_reached") {
          setOpen(false);
          setCapBlock({ currentPlan: res.current_plan ?? "silver", currentCount: res.current_count ?? 0, currentCap: res.current_cap ?? 20, upgradeToId: res.upgrade_to ?? "gold", upgradeCap: res.upgrade_cap ?? null, nearestExpiryDays: res.nearest_expiry_days ?? null });
        } else if (res.ok) {
          track(ph, "card_added", { type: "tenancy" });
          reset(); setOpen(false); toast.success("Tenancy added.");
        } else {
          toast.error("Something went wrong. Please try again.");
        }
      } finally {
        setUploading(false);
      }
    });
  }

  const busy = pending || uploading;

  return (
    <>
      <PlanCapDialog
        open={!!capBlock}
        currentPlan={capBlock?.currentPlan ?? "silver"}
        currentCount={capBlock?.currentCount ?? 0}
        currentCap={capBlock?.currentCap ?? 20}
        upgradeToId={capBlock?.upgradeToId ?? "gold"}
        upgradeCap={capBlock?.upgradeCap ?? null}
        nearestExpiryDays={capBlock?.nearestExpiryDays ?? null}
        onClose={() => setCapBlock(null)}
      />
      <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); setOpen(o); }}>
        <DialogTrigger
          render={
            <button className="kk-pill kk-pill-white" style={{ background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.12)", border: "1px solid rgba(0,0,0,0.08)" }}>
              Add tenancy
            </button>
          }
        />
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto" style={{ background: "var(--kk-surface)" }}>
          <DialogHeader>
            <DialogTitle className="serif text-[20px] tracking-tight" style={{ color: "var(--kk-ink)" }}>Add tenancy</DialogTitle>
            <p className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>Track an existing rented property</p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-2">

            {/* Property name */}
            <div>
              <SectionLabel>Property</SectionLabel>
              <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowSugg(false); }}>
                <FieldLabel required>Property name</FieldLabel>
                <TextInput value={propertyName}
                  onChange={(v) => { setPropertyName(v); setShowSugg(true); }}
                  placeholder="e.g. Residensi Mutiara" />
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
              <div><FieldLabel>Unit</FieldLabel><TextInput value={unit} onChange={setUnit} placeholder="e.g. A-12 or No. 7" /></div>
              <div>
                <FieldLabel required>Monthly rent (RM)</FieldLabel>
                <MoneyInput value={amount} onChange={setAmount} placeholder="e.g. 1,500"
                  className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                  style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }} />
              </div>
            </div>

            {/* Bedrooms + Bathrooms */}
            <div className="grid grid-cols-2 gap-3">
              <BedroomPicker value={bedrooms} onChange={setBedrooms} />
              <div>
                <FieldLabel>Bathrooms</FieldLabel>
                <TextInput type="number" value={bathrooms} onChange={(v) => setBathrooms(String(Math.max(0, Number(v))))} placeholder="e.g. 2" />
              </div>
            </div>

            {/* Parking */}
            <div className="grid grid-cols-2 gap-3">
              <div><FieldLabel>Parking</FieldLabel><TextInput value={parking} onChange={setParking} placeholder="e.g. A142" /></div>
            </div>

            {/* Contract */}
            <div>
              <SectionLabel>Contract</SectionLabel>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel required>Start date</FieldLabel>
                    <DateInput value={contractStart} onChange={setContractStart} name="contract_start"
                      className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                      style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }} />
                  </div>
                  <div>
                    <FieldLabel required>Duration (months)</FieldLabel>
                    <TextInput value={durationMonths} onChange={setDurationMonths} placeholder="e.g. 12" type="number" />
                  </div>
                </div>
                {contractEnd && (
                  <p className="text-[12px] px-3 py-2 rounded-xl" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>
                    Ends <span className="font-semibold" style={{ color: "var(--kk-ink)" }}>
                      {new Date(contractEnd + "T00:00:00").toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <FieldLabel>Notes</FieldLabel>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything else worth noting…"
                className="w-full text-[13px] px-3 py-2 rounded-xl outline-none"
                style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)", minHeight: 72 }} />
            </div>

            {/* Owner */}
            <div>
              <SectionLabel>Owner</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <div><FieldLabel required>Owner name</FieldLabel><TextInput value={ownerName} onChange={setOwnerName} placeholder="e.g. Encik Ahmad" /></div>
                <div>
                  <FieldLabel required>Phone</FieldLabel>
                  <TextInput type="tel" value={ownerPhone} onChange={setOwnerPhone} onBlur={(v) => setOwnerPhone(normalizePhone(v))} placeholder="601XXXXXXXX" />
                  <p className="text-[11px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>For overseas numbers, include the country code, e.g. +44 7911 123456</p>
                </div>
              </div>
            </div>

            {/* Tenant */}
            <div>
              <SectionLabel>Tenant</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <div><FieldLabel>Tenant name</FieldLabel><TextInput value={tenantName} onChange={setTenantName} placeholder="e.g. Siti Rahayu" /></div>
                <div>
                  <FieldLabel>WhatsApp number</FieldLabel>
                  <TextInput type="tel" value={tenantPhone} onChange={setTenantPhone} onBlur={(v) => setTenantPhone(normalizePhone(v))} placeholder="601XXXXXXXX" />
                  <p className="text-[11px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>For overseas numbers, include the country code, e.g. +44 7911 123456</p>
                </div>
              </div>
            </div>

            {/* Photos */}
            <div>
              <SectionLabel>Property photos <span className="normal-case font-normal">(optional)</span></SectionLabel>
              <div className="flex flex-wrap gap-2">
                {photoFiles.map(({ preview }, i) => (
                  <div key={preview} className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0" style={{ border: "1px solid var(--kk-line)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removePhoto(i)} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {photoFiles.length < PHOTO_MAX && (
                  <button type="button" onClick={() => photoRef.current?.click()}
                    className="w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 shrink-0 hover:opacity-70"
                    style={{ border: "1.5px dashed var(--kk-line)", color: "var(--kk-ink-mute)" }}>
                    <Camera className="w-4 h-4" /><span className="text-[10px] font-medium">Add</span>
                  </button>
                )}
                <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={addPhoto} />
              </div>
            </div>

            {/* Agreement — up to 3 files */}
            <div>
              <SectionLabel>Tenancy agreement <span className="normal-case font-normal">(optional, max 3 files)</span></SectionLabel>
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
                  {agreementFiles.length < 3 && (
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
              <input ref={agreementRef} type="file" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setAgreementFiles((prev) => [...prev, { file: f, name: f.name }].slice(0, 3)); if (agreementRef.current) agreementRef.current.value = ""; }} />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" className="kk-pill kk-pill-ghost flex-1" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
              <button type="submit" disabled={busy} className="kk-pill kk-pill-primary flex-1 flex items-center justify-center gap-1.5">
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {uploading ? "Uploading…" : pending ? "Saving…" : "Save tenancy"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
