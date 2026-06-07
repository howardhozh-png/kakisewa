"use client";

import { useState, useTransition, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, ChevronDown, MessageCircle, PenLine, Camera, X, FileText } from "lucide-react";
import { MoneyInput } from "@/components/ui/money-input";
import { DateInput } from "@/components/ui/date-input";
import { addOwnerLeadAction, generateOwnerIntakeLink, saveOwnerLeadPhotos, saveOwnerLeadAgreementUrl } from "@/lib/actions";
import { toast } from "sonner";
import { useWhatsAppGate } from "@/hooks/use-whatsapp-gate";
import { WhatsAppGateDialog } from "@/components/whatsapp-gate-dialog";
import { OwnerLead } from "@/lib/types";

interface FormData {
  property_name: string;
  unit: string;
  owner_name: string;
  owner_phone: string;
  expected_rent: string;
  available_from: string;
  sendWhatsApp: boolean;
  listing_purpose: "rent" | "sell" | null;
}

const EMPTY_FORM: FormData = {
  property_name: "",
  unit: "",
  owner_name: "",
  owner_phone: "",
  expected_rent: "",
  available_from: "",
  sendWhatsApp: false,
  listing_purpose: null,
};

interface WaForm { owner_name: string; owner_phone: string; property_name: string; listing_purpose: "rent" | "sell" | null; }
const EMPTY_WA: WaForm = { owner_name: "", owner_phone: "", property_name: "", listing_purpose: null };

export function NewListingButton({ ownerLeads = [] }: { ownerLeads?: OwnerLead[] }) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [waDialogOpen, setWaDialogOpen] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [waForm, setWaForm] = useState<WaForm>(EMPTY_WA);
  const [photoFiles, setPhotoFiles] = useState<Array<{ file: File; preview: string }>>([]);
  const [agreementFile, setAgreementFile] = useState<{ file: File; name: string } | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [pending, startTransition] = useTransition();
  const { gateOpen, setGateOpen, missingFields, checkAndRun } = useWhatsAppGate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const agreementInputRef = useRef<HTMLInputElement>(null);

  // Property name autocomplete
  const [showPropertySugg, setShowPropertySugg] = useState(false);
  const [existingLeadSelected, setExistingLeadSelected] = useState(false);

  const propertySuggestions = useMemo(() => {
    const q = form.property_name.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set<string>();
    return ownerLeads
      .filter((ol) => (ol.property_name ?? "").toLowerCase().includes(q))
      .filter((ol) => { const k = (ol.property_name ?? "").toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 6);
  }, [form.property_name, ownerLeads]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function openDialog() {
    setDropdownOpen(false);
    setForm(EMPTY_FORM);
    setPhotoFiles([]);
    setAgreementFile(null);
    setExistingLeadSelected(false);
    setDialogOpen(true);
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const previews = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotoFiles((prev) => [...prev, ...previews]);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function removePhoto(index: number) {
    setPhotoFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function openWaDialog() {
    setDropdownOpen(false);
    setWaForm(EMPTY_WA);
    setWaDialogOpen(true);
  }

  function handleWaSend() {
    if (!waForm.owner_name.trim()) { toast.error("Owner name is required"); return; }
    if (!waForm.owner_phone.trim()) { toast.error("Phone number is required"); return; }
    let didRun = false;
    checkAndRun(() => { didRun = true; });
    if (!didRun) return;
    startTransition(async () => {
      const res = await addOwnerLeadAction({
        owner_name: waForm.owner_name.trim(),
        owner_phone: waForm.owner_phone.trim(),
        property_name: waForm.property_name.trim() || null,
        unit: null, expected_rent: null, bedrooms: null, bathrooms: null, notes: null,
        listing_purpose: waForm.listing_purpose,
      });
      if (!res.ok) { toast.error(res.message ?? "Could not create listing"); return; }
      if (res.id) {
        const linkRes = await generateOwnerIntakeLink(res.id);
        if (linkRes.ok) {
          window.open(linkRes.waUrl, "_blank", "noopener,noreferrer");
          toast.success("Lead added. WhatsApp opened.");
        } else {
          toast.success("Lead added (could not open WhatsApp)");
        }
      }
      setWaDialogOpen(false);
      router.refresh();
    });
  }

  function handleSave() {
    if (!form.property_name.trim()) { toast.error("Property name is required"); return; }
    if (!form.owner_name.trim())    { toast.error("Owner name is required"); return; }
    if (!form.owner_phone.trim())   { toast.error("Phone number is required"); return; }

    startTransition(async () => {
      const res = await addOwnerLeadAction({
        property_name: form.property_name.trim() || null,
        unit: form.unit.trim() || null,
        owner_name: form.owner_name.trim(),
        owner_phone: form.owner_phone.trim(),
        expected_rent: form.expected_rent ? parseFloat(form.expected_rent) : null,
        available_from: form.available_from || null,
        listing_purpose: form.listing_purpose,
      });

      if (!res.ok) {
        toast.error(res.message ?? "Could not create listing");
        return;
      }

      if (res.id && (photoFiles.length > 0 || agreementFile)) {
        setUploadingPhotos(true);
        try {
          if (photoFiles.length > 0) {
            const urls: string[] = [];
            for (const { file } of photoFiles) {
              const fd = new FormData();
              fd.append("leadId", res.id);
              fd.append("file", file);
              const r = await fetch("/api/agent/photo", { method: "POST", body: fd });
              const data = await r.json() as { ok?: boolean; url?: string };
              if (data.ok && data.url) urls.push(data.url);
            }
            if (urls.length > 0) await saveOwnerLeadPhotos(res.id, urls);
          }
          if (agreementFile) {
            const fd = new FormData();
            fd.append("file", agreementFile.file);
            const r = await fetch("/api/upload/document", { method: "POST", body: fd });
            const data = await r.json() as { url?: string };
            if (data.url) await saveOwnerLeadAgreementUrl(res.id, data.url);
          }
        } catch {
          toast.error("Files could not be saved");
        } finally {
          setUploadingPhotos(false);
        }
      }

      if (form.sendWhatsApp && res.id) {
        const linkRes = await generateOwnerIntakeLink(res.id);
        if (linkRes.ok) {
          window.open(linkRes.waUrl, "_blank", "noopener,noreferrer");
          toast.success("Listing added. WhatsApp intake link opened.");
        } else {
          toast.success("Listing added (could not generate WhatsApp link)");
        }
      } else {
        toast.success("Listing added");
      }

      setDialogOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          className="kk-pill flex items-center gap-2 px-4 py-2"
          style={{
            fontSize: "13px",
            fontWeight: 500,
            background: "var(--kk-surface)",
            border: "1px solid var(--kk-line)",
            color: "var(--kk-ink-mute)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <Building2 className="w-4 h-4" />
          Add listing
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 top-full mt-1 z-20 rounded-xl overflow-hidden"
            style={{
              background: "var(--kk-surface)",
              border: "1px solid var(--kk-line)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              minWidth: 200,
            }}
          >
            <button
              className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] font-medium hover:opacity-80 transition-opacity"
              style={{ color: "var(--kk-ink)" }}
              onClick={openWaDialog}
            >
              <MessageCircle className="w-4 h-4 shrink-0" style={{ color: "var(--kk-green)" }} />
              Via WhatsApp
            </button>
            <div style={{ height: 1, background: "var(--kk-line)" }} />
            <button
              className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] font-medium hover:opacity-80 transition-opacity"
              style={{ color: "var(--kk-ink)" }}
              onClick={openDialog}
            >
              <PenLine className="w-4 h-4 shrink-0" style={{ color: "var(--kk-ink-mute)" }} />
              Add manually
            </button>
          </div>
        )}
      </div>

      {/* WhatsApp quick-add dialog */}
      {waDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => { if (!pending) setWaDialogOpen(false); }}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />
          <div className="relative z-10 w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6" style={{ background: "var(--kk-surface)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="serif text-[18px] tracking-tight" style={{ color: "var(--kk-ink)" }}>Send via WhatsApp</h2>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>We'll open WhatsApp with the intake link pre-filled</p>
              </div>
              <button onClick={() => setWaDialogOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-soft)" }}>✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-mute)" }}>Owner name <span style={{ color: "var(--kk-red)" }}>*</span></label>
                <input type="text" value={waForm.owner_name} onChange={(e) => setWaForm((f) => ({ ...f, owner_name: e.target.value }))} placeholder="e.g. Encik Ahmad" className="w-full px-3 py-2 rounded-xl text-[13px] outline-none" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-mute)" }}>Phone number <span style={{ color: "var(--kk-red)" }}>*</span></label>
                <input type="tel" value={waForm.owner_phone} onChange={(e) => setWaForm((f) => ({ ...f, owner_phone: e.target.value }))} placeholder="e.g. 601XXXXXXXX" className="w-full px-3 py-2 rounded-xl text-[13px] outline-none" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-mute)" }}>Property name</label>
                <input type="text" value={waForm.property_name} onChange={(e) => setWaForm((f) => ({ ...f, property_name: e.target.value }))} placeholder="e.g. Residensi Mutiara" className="w-full px-3 py-2 rounded-xl text-[13px] outline-none" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--kk-ink-mute)" }}>Rent or sell?</label>
                <div className="flex gap-2">
                  {(["rent", "sell"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setWaForm((f) => ({ ...f, listing_purpose: f.listing_purpose === v ? null : v }))}
                      className="px-4 py-1.5 rounded-full text-[13px] font-medium capitalize transition-all"
                      style={{
                        background: waForm.listing_purpose === v ? "var(--kk-ink)" : "var(--kk-surface-2)",
                        color: waForm.listing_purpose === v ? "#fff" : "var(--kk-ink-mute)",
                        border: `1px solid ${waForm.listing_purpose === v ? "var(--kk-ink)" : "var(--kk-line)"}`,
                      }}
                    >
                      {v === "rent" ? "For Rent" : "For Sale"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setWaDialogOpen(false)} disabled={pending} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>Cancel</button>
                <button type="button" onClick={handleWaSend} disabled={pending} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2" style={{ background: "var(--kk-green)", color: "#fff" }}>
                  {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                  Open WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual add dialog */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => { if (!pending) setDialogOpen(false); }}
        >
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />
          <div
            className="relative z-10 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 overflow-y-auto max-h-[90dvh]"
            style={{ background: "var(--kk-surface)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="serif text-[20px] tracking-tight" style={{ color: "var(--kk-ink)" }}>
                Add property listing
              </h2>
              <button
                onClick={() => setDialogOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm hover:opacity-70 transition-opacity"
                style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-soft)" }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">

              {/* Property */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--kk-ink-faint)", letterSpacing: "0.1em" }}>Property</p>
                <div className="space-y-3">
                  <div
                    className="relative"
                    onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowPropertySugg(false); }}
                  >
                    <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--kk-ink-soft)" }}>
                      Property name <span style={{ color: "var(--kk-red)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={form.property_name}
                      onChange={(e) => { setForm((f) => ({ ...f, property_name: e.target.value })); setExistingLeadSelected(false); setShowPropertySugg(true); }}
                      onFocus={() => setShowPropertySugg(true)}
                      placeholder="e.g. Residensi Mutiara"
                      autoComplete="off"
                      className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                      style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                    />
                    {existingLeadSelected && (
                      <p className="text-[11px] mt-1" style={{ color: "var(--kk-orange, #f59e0b)" }}>Already in your pipeline — saving will create a new entry</p>
                    )}
                    {showPropertySugg && propertySuggestions.length > 0 && (
                      <div
                        className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden"
                        style={{ zIndex: 9999, background: "var(--kk-surface)", border: "1px solid var(--kk-line)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 200, overflowY: "auto" }}
                      >
                        {propertySuggestions.map((ol) => (
                          <button
                            key={ol.id}
                            type="button"
                            tabIndex={0}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setForm((f) => ({ ...f, property_name: ol.property_name ?? "", owner_name: ol.owner_name ?? f.owner_name, owner_phone: ol.owner_phone ?? f.owner_phone }));
                              setExistingLeadSelected(true);
                              setShowPropertySugg(false);
                            }}
                            className="w-full text-left px-4 py-2.5 transition-opacity hover:opacity-70"
                          >
                            <p className="text-[13px] font-medium" style={{ color: "var(--kk-ink)" }}>{ol.property_name}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--kk-ink-soft)" }}>Unit number</label>
                    <input
                      type="text"
                      value={form.unit}
                      onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                      placeholder="e.g. A-12 or No. 7"
                      className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                      style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Owner */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--kk-ink-faint)", letterSpacing: "0.1em" }}>Owner</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--kk-ink-soft)" }}>
                      Owner name <span style={{ color: "var(--kk-red)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={form.owner_name}
                      onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))}
                      placeholder="e.g. Encik Ahmad"
                      className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                      style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--kk-ink-soft)" }}>
                      Owner phone <span style={{ color: "var(--kk-red)" }}>*</span>
                    </label>
                    <input
                      type="tel"
                      value={form.owner_phone}
                      onChange={(e) => setForm((f) => ({ ...f, owner_phone: e.target.value }))}
                      placeholder="e.g. 601XXXXXXXX"
                      className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                      style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Contract */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--kk-ink-faint)", letterSpacing: "0.1em" }}>Contract</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--kk-ink-soft)" }}>Price (RM)</label>
                      <MoneyInput
                        value={form.expected_rent}
                        onChange={(raw) => setForm((f) => ({ ...f, expected_rent: raw }))}
                        placeholder="e.g. 2,500"
                        className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                        style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--kk-ink-soft)" }}>Available from</label>
                      <DateInput
                        value={form.available_from}
                        onChange={(iso) => setForm((f) => ({ ...f, available_from: iso }))}
                        className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                        style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--kk-ink-soft)" }}>Rent or sell?</label>
                    <div className="flex gap-2">
                      {(["rent", "sell"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, listing_purpose: f.listing_purpose === v ? null : v }))}
                          className="px-4 py-1.5 rounded-full text-[13px] font-medium transition-all"
                          style={{
                            background: form.listing_purpose === v ? "var(--kk-ink)" : "var(--kk-surface-2)",
                            color: form.listing_purpose === v ? "#fff" : "var(--kk-ink-mute)",
                            border: `1px solid ${form.listing_purpose === v ? "var(--kk-ink)" : "var(--kk-line)"}`,
                          }}
                        >
                          {v === "rent" ? "For Rent" : "For Sale"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--kk-ink-faint)", letterSpacing: "0.1em" }}>Photos <span className="normal-case font-normal">(optional)</span></p>
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
              </div>

              {/* Tenancy agreement */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--kk-ink-faint)", letterSpacing: "0.1em" }}>Tenancy agreement <span className="normal-case font-normal">(optional)</span></p>
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
                <input ref={agreementInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setAgreementFile({ file: f, name: f.name }); if (agreementInputRef.current) agreementInputRef.current.value = ""; }} />
              </div>

              {/* WhatsApp toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.sendWhatsApp}
                  onChange={(e) => setForm((f) => ({ ...f, sendWhatsApp: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-[13px]" style={{ color: "var(--kk-ink-soft)" }}>
                  Send WhatsApp intake form link after saving
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  disabled={pending}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-opacity hover:opacity-70"
                  style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={pending || uploadingPhotos}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2"
                  style={{ background: "var(--kk-ink)", color: "#fff" }}
                >
                  {(pending || uploadingPhotos) ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {uploadingPhotos ? "Uploading…" : "Save listing"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <WhatsAppGateDialog open={gateOpen} onOpenChange={setGateOpen} missingFields={missingFields} />
    </>
  );
}
