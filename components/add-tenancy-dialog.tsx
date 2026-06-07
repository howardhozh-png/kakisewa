"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import { PlanCapDialog } from "@/components/plan-cap-dialog";
import { Plus, Building2, Phone, Camera, FileText, X, Loader2 } from "lucide-react";
import { MoneyInput } from "@/components/ui/money-input";
import { DateInput } from "@/components/ui/date-input";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addTenancy } from "@/lib/actions";
import { Property } from "@/lib/types";
import { toast } from "sonner";

const todayISO = () => new Date().toISOString().split("T")[0];

export function AddTenancyDialog({ properties }: { properties: Property[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [capBlock, setCapBlock] = useState<{ currentPlan: string; currentCount: number; currentCap: number; upgradeToId: string; upgradeCap: number | null; nearestExpiryDays: number | null } | null>(null);

  // Property autocomplete
  const [propertyName, setPropertyName] = useState("");
  const [propertyId, setPropertyId]     = useState("");
  const [unit, setUnit]                 = useState("");
  const [ownerName, setOwnerName]       = useState("");
  const [ownerPhone, setOwnerPhone]     = useState("");
  const [amount, setAmount]             = useState("");
  const [showSugg, setShowSugg]         = useState(false);
  const [contractStart, setContractStart] = useState("");

  // Photo + agreement state
  const [photoFiles, setPhotoFiles] = useState<Array<{ file: File; preview: string }>>([]);
  const [agreementFile, setAgreementFile] = useState<{ file: File; name: string } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const agreementInputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const q = propertyName.trim().toLowerCase();
    const seen = new Set<string>();
    const base = q ? properties.filter((p) => p.name.toLowerCase().includes(q)) : properties;
    return base.filter((p) => {
      const key = p.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  }, [propertyName, properties]);

  const hasExactMatch = properties.some(
    (p) => p.name.toLowerCase() === propertyName.trim().toLowerCase()
  );

  function selectExisting(p: Property) {
    setPropertyId(p.id);
    setPropertyName(p.name);
    setShowSugg(false);
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const previews = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotoFiles((prev) => [...prev, ...previews].slice(0, 4));
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function removePhoto(i: number) {
    setPhotoFiles((prev) => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, idx) => idx !== i);
    });
  }

  function handleAgreementSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setAgreementFile({ file, name: file.name });
    if (agreementInputRef.current) agreementInputRef.current.value = "";
  }

  function reset() {
    setPropertyName(""); setPropertyId(""); setUnit("");
    setOwnerName(""); setOwnerPhone(""); setAmount("");
    setContractStart(""); setShowSugg(false);
    photoFiles.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotoFiles([]); setAgreementFile(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!propertyName.trim()) return;
    const fd = new FormData(e.currentTarget);
    fd.set("property_id", propertyId);
    fd.set("property_name", propertyName.trim());
    fd.set("property_unit", unit);
    fd.set("owner_name", ownerName);
    fd.set("owner_phone", ownerPhone);
    fd.set("amount", amount);
    fd.set("due_day", "1");

    setUploading(true);
    startTransition(async () => {
      try {
        // Upload photos
        for (let i = 0; i < photoFiles.length; i++) {
          const uploadFd = new FormData();
          uploadFd.append("file", photoFiles[i].file);
          const r = await fetch("/api/upload/document", { method: "POST", body: uploadFd });
          const data = await r.json() as { url?: string };
          if (data.url) fd.set(`photo_url_${i}`, data.url);
        }
        // Upload agreement
        if (agreementFile) {
          const uploadFd = new FormData();
          uploadFd.append("file", agreementFile.file);
          const r = await fetch("/api/upload/document", { method: "POST", body: uploadFd });
          const data = await r.json() as { url?: string };
          if (data.url) fd.set("agreement_url", data.url);
        }
      } finally {
        setUploading(false);
      }

      const res = await addTenancy(fd);
      if (!res.ok && res.reason === "plan_cap_reached") {
        setOpen(false);
        setCapBlock({ currentPlan: res.current_plan ?? "silver", currentCount: res.current_count ?? 0, currentCap: res.current_cap ?? 20, upgradeToId: res.upgrade_to ?? "gold", upgradeCap: res.upgrade_cap ?? null, nearestExpiryDays: res.nearest_expiry_days ?? null });
      } else {
        reset();
        setOpen(false);
        toast.success("Tenancy added.");
      }
    });
  }

  const isBusy = pending || uploading;

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
          <button
            className="kk-pill"
            style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", color: "var(--kk-ink-mute)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          >
            <Plus className="w-3.5 h-3.5" /> Add tenancy
          </button>
        }
      />
      <DialogContent className="bg-card border-border max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold tracking-tight">Add new tenancy</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-6">

          {/* ──────── Property ──────── */}
          <fieldset className="space-y-3">
            <p className="kk-overline">Property</p>

            <div
              className="relative space-y-1.5"
              onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowSugg(false); }}
            >
              <FieldLabel required>Property name</FieldLabel>
              <Input
                value={propertyName}
                onChange={(e) => { setPropertyName(e.target.value); setPropertyId(""); setShowSugg(true); }}
                onFocus={() => setShowSugg(true)}
                placeholder="e.g. Residensi Mutiara"
                autoComplete="off"
                required
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
              {propertyId
                ? <p className="text-[11px]" style={{ color: "var(--kk-green)" }}>Existing property</p>
                : propertyName.trim()
                  ? <p className="text-[11px]" style={{ color: "var(--kk-blue)" }}>New property will be created</p>
                  : null
              }
              {showSugg && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden"
                  style={{ zIndex: 9999, background: "var(--kk-surface)", border: "1px solid var(--kk-line)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 240, overflowY: "auto" }}
                >
                  {suggestions.map((p) => (
                    <button
                      key={p.id} type="button" tabIndex={0}
                      onMouseDown={(e) => { e.preventDefault(); selectExisting(p); }}
                      className="w-full text-left px-4 py-2.5 transition-opacity hover:opacity-70"
                    >
                      <p className="text-[13px] font-medium" style={{ color: "var(--kk-ink)" }}>{p.name}</p>
                    </button>
                  ))}
                  {propertyName.trim() && !hasExactMatch && (
                    <button
                      type="button" tabIndex={0}
                      onMouseDown={(e) => { e.preventDefault(); setPropertyId(""); setShowSugg(false); }}
                      className="w-full text-left px-4 py-2.5 text-[13px]"
                      style={{ color: "var(--kk-blue)", borderTop: suggestions.length ? "1px solid var(--kk-line)" : "none" }}
                    >
                      + Create &ldquo;{propertyName.trim()}&rdquo; as new property
                    </button>
                  )}
                </div>
              )}
            </div>

            <ControlledField label="Unit" value={unit} onChange={setUnit} placeholder="e.g. A-12 or No. 7" hint="Optional" />
          </fieldset>

          {/* ──────── Owner ──────── */}
          <fieldset className="space-y-3">
            <p className="kk-overline">Owner</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <FieldLabel icon={<Building2 className="w-3 h-3" />}>Owner name</FieldLabel>
                <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Hafiz Rahman"
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel icon={<Phone className="w-3 h-3" />}>Owner phone</FieldLabel>
                <Input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value.replace(/[^\d+\s-]/g, ""))}
                  placeholder="e.g. 60123456789"
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
              </div>
            </div>
          </fieldset>

          {/* ──────── Contract ──────── */}
          <fieldset className="space-y-3">
            <p className="kk-overline">Contract</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <FieldLabel required>Monthly rent (RM)</FieldLabel>
                <MoneyInput
                  value={amount}
                  onChange={setAmount}
                  placeholder="e.g. 1,500"
                  required
                  className="h-9 w-full min-w-0 rounded-3xl border px-3 py-1 text-base outline-none md:text-sm bg-secondary border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel required>Contract start</FieldLabel>
                <DateInput
                  value={contractStart}
                  onChange={setContractStart}
                  name="contract_start"
                  required
                  className="h-9 w-full min-w-0 rounded-3xl border px-3 py-1 text-base outline-none md:text-sm bg-secondary border-border text-foreground"
                />
              </div>
            </div>
            <FormField label="Duration (months)" name="contract_duration_months" placeholder="e.g. 12" type="number" required />
          </fieldset>

          {/* ──────── Photos ──────── */}
          <fieldset className="space-y-3">
            <p className="kk-overline">Photos <span className="normal-case font-normal" style={{ color: "var(--kk-ink-faint)" }}>(optional)</span></p>
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
              {photoFiles.length < 4 && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 shrink-0 transition-opacity hover:opacity-70"
                  style={{ border: "1.5px dashed var(--kk-line)", color: "var(--kk-ink-mute)" }}
                >
                  <Camera className="w-4 h-4" />
                  <span className="text-[10px] font-medium">Add</span>
                </button>
              )}
              <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
            </div>
          </fieldset>

          {/* ──────── Tenancy Agreement ──────── */}
          <fieldset className="space-y-3">
            <p className="kk-overline">Tenancy agreement <span className="normal-case font-normal" style={{ color: "var(--kk-ink-faint)" }}>(optional)</span></p>
            {agreementFile ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
                <FileText className="w-4 h-4 shrink-0" style={{ color: "var(--kk-ink-mute)" }} />
                <span className="text-[12px] truncate flex-1" style={{ color: "var(--kk-ink-soft)" }}>{agreementFile.name}</span>
                <button type="button" onClick={() => setAgreementFile(null)} className="shrink-0">
                  <X className="w-3.5 h-3.5" style={{ color: "var(--kk-ink-mute)" }} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => agreementInputRef.current?.click()}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] transition-opacity hover:opacity-70"
                style={{ border: "1.5px dashed var(--kk-line)", color: "var(--kk-ink-mute)", background: "transparent" }}
              >
                <FileText className="w-4 h-4" /> Upload PDF or image
              </button>
            )}
            <input ref={agreementInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleAgreementSelect} />
          </fieldset>

          {/* ──────── Tenant ──────── */}
          <fieldset className="space-y-3">
            <p className="kk-overline">Tenant</p>
            <FormField label="Tenant name" name="tenant_name" placeholder="e.g. Siti Rahayu" required />
            <div className="space-y-1">
              <FormField label="WhatsApp number" name="tenant_phone" placeholder="e.g. 60123456789" required />
              <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>Include country code for WhatsApp templates.</p>
            </div>
          </fieldset>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="kk-pill kk-pill-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={isBusy || !propertyName.trim()} className="kk-pill kk-pill-primary flex items-center gap-1.5">
              {isBusy && <Loader2 className="w-3 h-3 animate-spin" />}
              {uploading ? "Uploading…" : pending ? "Saving…" : "Save tenancy"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────────

function FieldLabel({ children, required, icon }: { children: React.ReactNode; required?: boolean; icon?: React.ReactNode }) {
  return (
    <Label className="text-[12px] font-medium flex items-center gap-1" style={{ color: "var(--kk-ink-soft)" }}>
      {icon}{children}
      {required && <span style={{ color: "var(--kk-red)", lineHeight: 1 }}>*</span>}
    </Label>
  );
}

function ControlledField({ label, value, onChange, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
      {hint && <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>{hint}</p>}
    </div>
  );
}

function FormField({ label, name, placeholder, required, type = "text", hint, defaultValue }: {
  label: string; name: string; placeholder?: string; required?: boolean;
  type?: string; hint?: string; defaultValue?: string;
}) {
  return (
    <div className="space-y-1">
      <FieldLabel required={required}>{label}</FieldLabel>
      <Input id={name} name={name} type={type} placeholder={placeholder} required={required} defaultValue={defaultValue} className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
      {hint && <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>{hint}</p>}
    </div>
  );
}
