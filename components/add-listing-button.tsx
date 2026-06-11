"use client";

import { useState, useTransition, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText as ListingIcon, Loader2, Camera, FileText, X } from "lucide-react";
import { MoneyInput } from "@/components/ui/money-input";
import { DateInput } from "@/components/ui/date-input";
import { addOwnerLeadAction, saveOwnerLeadPhotos, saveOwnerLeadAgreementUrl } from "@/lib/actions";
import { normalizePhone, phoneError } from "@/lib/phone";
import { BedroomPicker } from "@/components/edit-owner-lead-dialog";
import { toast } from "sonner";
import type { OwnerLead } from "@/lib/types";

const PHOTO_MAX = 10;

interface Props { ownerLeads?: OwnerLead[] }

interface Form {
  property_name: string;
  unit: string;
  owner_name: string;
  owner_phone: string;
  listing_purpose: "rent" | "sell" | "both" | null;
  expected_rent: string;
  available_from: string;
  bedrooms: string;
  bathrooms: string;
  parking: string;
}

const EMPTY: Form = {
  property_name: "", unit: "", owner_name: "", owner_phone: "",
  listing_purpose: null, expected_rent: "", available_from: "",
  bedrooms: "", bathrooms: "", parking: "",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--kk-ink-faint)", letterSpacing: "0.1em" }}>{children}</p>;
}
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--kk-ink-soft)" }}>{children}{required && <span style={{ color: "var(--kk-red)" }}> *</span>}</label>;
}
function TextInput({ value, onChange, onBlur, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; onBlur?: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} onBlur={(e) => onBlur?.(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
      style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }} />
  );
}

export function AddListingButton({ ownerLeads = [] }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [photoFiles, setPhotoFiles] = useState<Array<{ file: File; preview: string }>>([]);
  const [agreementFile, setAgreementFile] = useState<{ file: File; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [showSugg, setShowSugg] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const agreementRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape" && open && !pending && !uploading) setOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, uploading]);

  const propertySuggestions = useMemo(() => {
    const q = form.property_name.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set<string>();
    return ownerLeads
      .filter((ol) => (ol.property_name ?? "").toLowerCase().includes(q))
      .filter((ol) => { const k = (ol.property_name ?? "").toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 6);
  }, [form.property_name, ownerLeads]);

  function addPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPhotoFiles((prev) => [...prev, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))].slice(0, PHOTO_MAX));
    if (photoRef.current) photoRef.current.value = "";
  }
  function removePhoto(i: number) {
    setPhotoFiles((prev) => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, idx) => idx !== i); });
  }

  function reset() {
    setForm(EMPTY); setShowSugg(false);
    photoFiles.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotoFiles([]); setAgreementFile(null);
  }

  function handleSave() {
    if (!form.property_name.trim()) { toast.error("Property name is required"); return; }
    if (!form.owner_name.trim())    { toast.error("Owner name is required"); return; }
    if (!form.owner_phone.trim())   { toast.error("Phone number is required"); return; }
    if (phoneError(form.owner_phone)) { toast.error(phoneError(form.owner_phone)!); return; }
    if (!form.listing_purpose)      { toast.error("Select Rent or Sell"); return; }
    if (!form.expected_rent)        { toast.error("Price is required"); return; }

    startTransition(async () => {
      const res = await addOwnerLeadAction({
        property_name: form.property_name.trim(),
        unit: form.unit.trim() || null,
        owner_name: form.owner_name.trim(),
        owner_phone: form.owner_phone.trim(),
        listing_purpose: form.listing_purpose,
        expected_rent: parseFloat(form.expected_rent) || null,
        available_from: form.available_from || null,
        bedrooms: form.bedrooms !== "" ? parseInt(form.bedrooms, 10) : null,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms, 10) : null,
        parking: form.parking ? parseInt(form.parking, 10) : null,
        stage: "listed",
      });

      if (!res.ok) { toast.error(res.message ?? "Could not save listing"); return; }

      if (res.id && (photoFiles.length > 0 || agreementFile)) {
        setUploading(true);
        try {
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
          if (agreementFile) {
            const fd = new FormData(); fd.append("file", agreementFile.file);
            const r = await fetch("/api/upload/document", { method: "POST", body: fd });
            const d = await r.json() as { url?: string };
            if (d.url) await saveOwnerLeadAgreementUrl(res.id, d.url);
          }
        } finally { setUploading(false); }
      }

      toast.success("Listing added");
      setOpen(false); reset();
      router.push(`/my-listing?highlight=${res.id}`);
    });
  }

  const busy = pending || uploading;

  return (
    <>
      <button
        type="button"
        onClick={() => { reset(); setOpen(true); }}
        className="kk-pill kk-pill-white flex items-center gap-2 px-4 py-2"
        style={{ fontSize: "13px", fontWeight: 500, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.12)", border: "1px solid rgba(0,0,0,0.08)" }}
      >
        <ListingIcon className="w-4 h-4" />
        Add listing
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => { if (!busy) setOpen(false); }}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />
          <div className="relative z-10 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 overflow-y-auto max-h-[90dvh]"
            style={{ background: "var(--kk-surface)" }} onClick={(e) => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="serif text-[20px] tracking-tight" style={{ color: "var(--kk-ink)" }}>Add listing</h2>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>Listing of properties pending to rent</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-soft)" }}>✕</button>
            </div>

            <div className="space-y-5">

              {/* Property */}
              <div>
                <SectionLabel>Property</SectionLabel>
                <div className="space-y-3">
                  <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowSugg(false); }}>
                    <FieldLabel required>Property name</FieldLabel>
                    <TextInput value={form.property_name}
                      onChange={(v) => { setForm((f) => ({ ...f, property_name: v })); setShowSugg(true); }}
                      placeholder="e.g. Residensi Mutiara" />
                    {showSugg && propertySuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden"
                        style={{ zIndex: 9999, background: "var(--kk-surface)", border: "1px solid var(--kk-line)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 200, overflowY: "auto" }}>
                        {propertySuggestions.map((ol) => (
                          <button key={ol.id} type="button" onMouseDown={(e) => { e.preventDefault(); setForm((f) => ({ ...f, property_name: ol.property_name ?? "" })); setShowSugg(false); }}
                            className="w-full text-left px-4 py-2.5 hover:opacity-70">
                            <p className="text-[13px] font-medium" style={{ color: "var(--kk-ink)" }}>{ol.property_name}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div><FieldLabel>Unit</FieldLabel><TextInput value={form.unit} onChange={(v) => setForm((f) => ({ ...f, unit: v }))} placeholder="e.g. A-12 or No. 7" /></div>
                </div>
              </div>

              {/* Owner */}
              <div>
                <SectionLabel>Owner</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <div><FieldLabel required>Owner name</FieldLabel><TextInput value={form.owner_name} onChange={(v) => setForm((f) => ({ ...f, owner_name: v }))} placeholder="e.g. Encik Ahmad" /></div>
                  <div>
                    <FieldLabel required>Phone</FieldLabel>
                    <TextInput type="tel" value={form.owner_phone}
                      onChange={(v) => setForm((f) => ({ ...f, owner_phone: v }))}
                      onBlur={(v) => setForm((f) => ({ ...f, owner_phone: normalizePhone(v) }))}
                      placeholder="e.g. 0123456789" />
                    {phoneError(form.owner_phone) && <p className="text-[11px] mt-1" style={{ color: "#FF3B30" }}>{phoneError(form.owner_phone)}</p>}
                  </div>
                </div>
              </div>

              {/* Listing details */}
              <div>
                <SectionLabel>Listing</SectionLabel>
                <div className="space-y-3">
                  <div>
                    <FieldLabel required>Rent or sell?</FieldLabel>
                    <div className="flex gap-2">
                      {(["rent", "sell"] as const).map((v) => {
                        const active = form.listing_purpose === v || form.listing_purpose === "both";
                        return (
                          <button key={v} type="button"
                            onClick={() => setForm((f) => {
                              const cur = f.listing_purpose;
                              if (cur === "both") return { ...f, listing_purpose: v === "rent" ? "sell" : "rent" };
                              if (cur === v) return { ...f, listing_purpose: null };
                              if (cur === null) return { ...f, listing_purpose: v };
                              return { ...f, listing_purpose: "both" };
                            })}
                            className="px-4 py-1.5 rounded-full text-[13px] font-medium transition-all"
                            style={{
                              background: active ? "var(--kk-ink)" : "var(--kk-surface-2)",
                              color: active ? "#fff" : "var(--kk-ink-mute)",
                              border: `1px solid ${active ? "var(--kk-ink)" : "var(--kk-line)"}`,
                            }}>
                            {v === "rent" ? "For Rent" : "For Sale"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel required>Price (RM)</FieldLabel>
                      <MoneyInput value={form.expected_rent} onChange={(raw) => setForm((f) => ({ ...f, expected_rent: raw }))}
                        placeholder="e.g. 2,500"
                        className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                        style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }} />
                    </div>
                    <div>
                      <FieldLabel>Available from</FieldLabel>
                      <div className="flex items-center gap-1.5">
                        <DateInput value={form.available_from} onChange={(iso) => setForm((f) => ({ ...f, available_from: iso }))}
                          className="flex-1 px-3 py-2 rounded-xl text-[13px] outline-none"
                          style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }} />
                        <button type="button" onClick={() => setForm((f) => ({ ...f, available_from: new Date().toISOString().split("T")[0] }))}
                          className="shrink-0 text-[11px] px-2 py-1.5 rounded-lg"
                          style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", border: "1px solid var(--kk-line)" }}>
                          Now
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <BedroomPicker value={form.bedrooms} onChange={(v) => setForm((f) => ({ ...f, bedrooms: v }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <FieldLabel>Bathrooms</FieldLabel>
                      <TextInput type="number" value={form.bathrooms} onChange={(v) => setForm((f) => ({ ...f, bathrooms: String(Math.max(0, Number(v))) }))} placeholder="e.g. 2" />
                    </div>
                    <div>
                      <FieldLabel>Parking</FieldLabel>
                      <TextInput type="number" value={form.parking} onChange={(v) => setForm((f) => ({ ...f, parking: String(Math.max(0, Number(v))) }))} placeholder="e.g. 1" />
                    </div>
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
                <SectionLabel>Agreement <span className="normal-case font-normal">(optional)</span></SectionLabel>
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

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} disabled={busy}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-medium hover:opacity-70"
                  style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>Cancel</button>
                <button type="button" onClick={handleSave} disabled={busy}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2"
                  style={{ background: "var(--kk-ink)", color: "#fff" }}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {uploading ? "Uploading…" : "Save listing"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
