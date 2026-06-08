"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import { Camera, FileText, X, Loader2 } from "lucide-react";
import { MoneyInput } from "@/components/ui/money-input";
import { DateInput } from "@/components/ui/date-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlanCapDialog } from "@/components/plan-cap-dialog";
import { addTenancy } from "@/lib/actions";
import type { OwnerLead } from "@/lib/types";
import { toast } from "sonner";

const PHOTO_MAX = 10;

type CapBlock = { currentPlan: string; currentCount: number; currentCap: number; upgradeToId: string; upgradeCap: number | null; nearestExpiryDays: number | null };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--kk-ink-faint)", letterSpacing: "0.1em" }}>{children}</p>;
}
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--kk-ink-soft)" }}>{children}{required && <span style={{ color: "var(--kk-red)" }}> *</span>}</label>;
}
function TextInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
      style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }} />
  );
}

export function AddTenancyDialog({ ownerLeads }: { ownerLeads: OwnerLead[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [capBlock, setCapBlock] = useState<CapBlock | null>(null);

  // Property
  const [propertyName, setPropertyName] = useState("");
  const [ownerLeadId, setOwnerLeadId] = useState("");
  const [unit, setUnit] = useState("");
  const [showSugg, setShowSugg] = useState(false);

  // Owner
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");

  // Contract
  const [amount, setAmount] = useState("");
  const [contractStart, setContractStart] = useState("");
  const [durationMonths, setDurationMonths] = useState("");

  // Media
  const [photoFiles, setPhotoFiles] = useState<Array<{ file: File; preview: string }>>([]);
  const [agreementFile, setAgreementFile] = useState<{ file: File; name: string } | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const agreementRef = useRef<HTMLInputElement>(null);

  // Tenant
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");

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
    setOwnerLeadId(ol.id);
    setPropertyName(ol.property_name ?? "");
    if (ol.owner_name) setOwnerName(ol.owner_name);
    if (ol.owner_phone) setOwnerPhone(ol.owner_phone);
    if (ol.unit) setUnit(ol.unit);
    if (ol.expected_rent != null) setAmount(String(ol.expected_rent));
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
    setPropertyName(""); setOwnerLeadId(""); setUnit("");
    setOwnerName(""); setOwnerPhone("");
    setAmount(""); setContractStart(""); setDurationMonths("");
    photoFiles.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotoFiles([]); setAgreementFile(null);
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
    if (!tenantName.trim())    { toast.error("Tenant name is required"); return; }
    if (!tenantPhone.trim())   { toast.error("Tenant phone is required"); return; }

    setUploading(true);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("owner_lead_id", ownerLeadId);
        fd.set("property_name", propertyName.trim());
        fd.set("property_unit", unit.trim());
        fd.set("owner_name", ownerName.trim());
        fd.set("owner_phone", ownerPhone.trim());
        fd.set("amount", amount);
        fd.set("due_day", "1");
        fd.set("contract_start", contractStart);
        fd.set("contract_duration_months", durationMonths);
        fd.set("tenant_name", tenantName.trim());
        fd.set("tenant_phone", tenantPhone.trim());

        // Upload photos
        for (let i = 0; i < photoFiles.length; i++) {
          const uploadFd = new FormData();
          uploadFd.append("file", photoFiles[i].file);
          const r = await fetch("/api/upload/document", { method: "POST", body: uploadFd });
          const d = await r.json() as { url?: string };
          if (d.url) fd.set(`photo_url_${i}`, d.url);
        }

        // Upload agreement
        if (agreementFile) {
          const uploadFd = new FormData();
          uploadFd.append("file", agreementFile.file);
          const r = await fetch("/api/upload/document", { method: "POST", body: uploadFd });
          const d = await r.json() as { url?: string };
          if (d.url) fd.set("agreement_url", d.url);
        }

        const res = await addTenancy(fd);
        if (!res.ok && res.reason === "plan_cap_reached") {
          setOpen(false);
          setCapBlock({ currentPlan: res.current_plan ?? "silver", currentCount: res.current_count ?? 0, currentCap: res.current_cap ?? 20, upgradeToId: res.upgrade_to ?? "gold", upgradeCap: res.upgrade_cap ?? null, nearestExpiryDays: res.nearest_expiry_days ?? null });
        } else if (res.ok) {
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
            <button className="kk-pill kk-pill-white">
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

            {/* Property */}
            <div>
              <SectionLabel>Property</SectionLabel>
              <div className="space-y-3">
                <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowSugg(false); }}>
                  <FieldLabel required>Property name</FieldLabel>
                  <TextInput value={propertyName}
                    onChange={(v) => { setPropertyName(v); setOwnerLeadId(""); setShowSugg(true); }}
                    placeholder="e.g. Residensi Mutiara" />
                  {ownerLeadId
                    ? <p className="text-[11px] mt-1" style={{ color: "var(--kk-green-ink)" }}>Linked to existing property — details pre-filled</p>
                    : propertyName.trim()
                      ? <p className="text-[11px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>New property</p>
                      : null}
                  {showSugg && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden"
                      style={{ zIndex: 9999, background: "var(--kk-surface)", border: "1px solid var(--kk-line)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 240, overflowY: "auto" }}>
                      {suggestions.map((ol) => (
                        <button key={ol.id} type="button" onMouseDown={(e) => { e.preventDefault(); selectExisting(ol); }}
                          className="w-full text-left px-4 py-2.5 hover:opacity-70">
                          <p className="text-[13px] font-medium" style={{ color: "var(--kk-ink)" }}>{ol.property_name}</p>
                          {ol.owner_name && <p className="text-[11px]" style={{ color: "var(--kk-ink-mute)" }}>{ol.owner_name}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div><FieldLabel>Unit</FieldLabel><TextInput value={unit} onChange={setUnit} placeholder="e.g. A-12 or No. 7" /></div>
              </div>
            </div>

            {/* Owner */}
            <div>
              <SectionLabel>Owner</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <div><FieldLabel required>Owner name</FieldLabel><TextInput value={ownerName} onChange={setOwnerName} placeholder="e.g. Encik Ahmad" /></div>
                <div><FieldLabel required>Phone</FieldLabel><TextInput type="tel" value={ownerPhone} onChange={setOwnerPhone} placeholder="601XXXXXXXX" /></div>
              </div>
            </div>

            {/* Contract */}
            <div>
              <SectionLabel>Contract</SectionLabel>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel required>Monthly rent (RM)</FieldLabel>
                    <MoneyInput value={amount} onChange={setAmount} placeholder="e.g. 1,500"
                      className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                      style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }} />
                  </div>
                  <div>
                    <FieldLabel required>Contract start</FieldLabel>
                    <DateInput value={contractStart} onChange={setContractStart} name="contract_start"
                      className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                      style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }} />
                  </div>
                </div>
                <div>
                  <FieldLabel required>Duration (months)</FieldLabel>
                  <TextInput value={durationMonths} onChange={setDurationMonths} placeholder="e.g. 12" type="number" />
                </div>
              </div>
            </div>

            {/* Photos */}
            <div>
              <SectionLabel>Photos <span className="normal-case font-normal">(optional)</span></SectionLabel>
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

            {/* Agreement */}
            <div>
              <SectionLabel>Tenancy agreement <span className="normal-case font-normal">(optional)</span></SectionLabel>
              {agreementFile ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
                  <FileText className="w-4 h-4 shrink-0" style={{ color: "var(--kk-ink-mute)" }} />
                  <span className="text-[12px] truncate flex-1" style={{ color: "var(--kk-ink-soft)" }}>{agreementFile.name}</span>
                  <button type="button" onClick={() => setAgreementFile(null)}><X className="w-3.5 h-3.5" style={{ color: "var(--kk-ink-mute)" }} /></button>
                </div>
              ) : (
                <button type="button" onClick={() => agreementRef.current?.click()}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] hover:opacity-70"
                  style={{ border: "1.5px dashed var(--kk-line)", color: "var(--kk-ink-mute)" }}>
                  <FileText className="w-4 h-4" /> Upload PDF or image
                </button>
              )}
              <input ref={agreementRef} type="file" accept="image/*,application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setAgreementFile({ file: f, name: f.name }); if (agreementRef.current) agreementRef.current.value = ""; }} />
            </div>

            {/* Tenant */}
            <div>
              <SectionLabel>Tenant</SectionLabel>
              <div className="space-y-3">
                <div><FieldLabel required>Tenant name</FieldLabel><TextInput value={tenantName} onChange={setTenantName} placeholder="e.g. Siti Rahayu" /></div>
                <div>
                  <FieldLabel required>WhatsApp number</FieldLabel>
                  <TextInput type="tel" value={tenantPhone} onChange={setTenantPhone} placeholder="e.g. 601XXXXXXXX" />
                  <p className="text-[11px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>Include country code for WhatsApp templates.</p>
                </div>
              </div>
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
