"use client";

import { useState, useTransition, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { track } from "@/lib/analytics";
import { Users, Loader2, ChevronDown, MessageCircle, PenLine, Camera, FileText, X } from "lucide-react";
import { normalizePhone } from "@/lib/phone";
import { addOwnerLeadAction, generateOwnerIntakeLink, saveOwnerLeadPhotos, saveOwnerLeadAgreementUrl } from "@/lib/actions";
import { toast } from "sonner";
import { useWhatsAppGate } from "@/hooks/use-whatsapp-gate";
import { WhatsAppGateDialog } from "@/components/whatsapp-gate-dialog";
import type { OwnerLead } from "@/lib/types";

const PHOTO_MAX = 10;

interface Props { ownerLeads?: OwnerLead[] }

type WaForm = { property_name: string; unit: string; owner_name: string; owner_phone: string };
type ManualForm = { property_name: string; unit: string; owner_name: string; owner_phone: string; notes: string };
const EMPTY_WA: WaForm = { property_name: "", unit: "", owner_name: "", owner_phone: "" };
const EMPTY_MANUAL: ManualForm = { property_name: "", unit: "", owner_name: "", owner_phone: "", notes: "" };

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center" style={{ zIndex: 10001 }}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />
      <div className="relative z-10 w-full sm:max-w-sm">
        {children}
      </div>
    </div>
  );
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

export function AddOutreachButton({ ownerLeads = [] }: Props) {
  const router = useRouter();
  const ph = usePostHog();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [waForm, setWaForm] = useState<WaForm>(EMPTY_WA);
  const [manualForm, setManualForm] = useState<ManualForm>(EMPTY_MANUAL);
  const [photoFiles, setPhotoFiles] = useState<Array<{ file: File; preview: string }>>([]);
  const [agreementFile, setAgreementFile] = useState<{ file: File; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const { gateOpen, setGateOpen, missingFields, checkAndRun } = useWhatsAppGate();
  const dropRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const agreementRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!waOpen && !manualOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (waOpen && !pending && !uploading) setWaOpen(false);
      if (manualOpen && !pending && !uploading) setManualOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [waOpen, manualOpen, pending, uploading]);

  // Property autocomplete for manual form
  const [showSugg, setShowSugg] = useState(false);
  const propertySuggestions = useMemo(() => {
    const q = manualForm.property_name.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set<string>();
    return ownerLeads
      .filter((ol) => (ol.property_name ?? "").toLowerCase().includes(q))
      .filter((ol) => { const k = (ol.property_name ?? "").toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 6);
  }, [manualForm.property_name, ownerLeads]);

  function addPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPhotoFiles((prev) => [...prev, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))].slice(0, PHOTO_MAX));
    if (photoRef.current) photoRef.current.value = "";
  }
  function removePhoto(i: number) {
    setPhotoFiles((prev) => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, idx) => idx !== i); });
  }

  async function uploadFiles(leadId: string) {
    if (photoFiles.length > 0) {
      const urls: string[] = [];
      for (const { file } of photoFiles) {
        const fd = new FormData(); fd.append("leadId", leadId); fd.append("file", file);
        const r = await fetch("/api/agent/photo", { method: "POST", body: fd });
        const d = await r.json() as { ok?: boolean; url?: string };
        if (d.ok && d.url) urls.push(d.url);
      }
      if (urls.length > 0) { await saveOwnerLeadPhotos(leadId, urls); track(ph, "photo_uploaded", { count: urls.length, context: "outreach" }); }
    }
    if (agreementFile) {
      const fd = new FormData(); fd.append("file", agreementFile.file);
      const r = await fetch("/api/upload/document", { method: "POST", body: fd });
      const d = await r.json() as { url?: string };
      if (d.url) await saveOwnerLeadAgreementUrl(leadId, d.url);
    }
  }

  function resetManual() {
    setManualForm(EMPTY_MANUAL);
    photoFiles.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotoFiles([]); setAgreementFile(null);
  }

  function handleWaSend() {
    if (!waForm.owner_name.trim()) { toast.error("Owner name is required"); return; }
    if (!waForm.owner_phone.trim()) { toast.error("Phone number is required"); return; }
    checkAndRun(() => {
      startTransition(async () => {
        const res = await addOwnerLeadAction({
          property_name: waForm.property_name.trim() || null,
          unit: waForm.unit.trim() || null,
          owner_name: waForm.owner_name.trim(),
          owner_phone: normalizePhone(waForm.owner_phone.trim()),
          expected_rent: null, stage: "imported",
        });
        if (!res.ok) { toast.error(res.message ?? "Could not save"); return; }
        track(ph, "card_added", { type: "owner_lead", method: "whatsapp" });
        if (res.id) {
          const link = await generateOwnerIntakeLink(res.id);
          if (link.ok) { window.open(link.waUrl, "_blank", "noopener,noreferrer"); toast.success("Lead saved. WhatsApp opened."); }
          else toast.success("Lead saved");
        }
        setWaOpen(false); setWaForm(EMPTY_WA); router.refresh();
      });
    });
  }

  function handleManualSave() {
    if (!manualForm.owner_name.trim()) { toast.error("Owner name is required"); return; }
    if (!manualForm.owner_phone.trim()) { toast.error("Phone number is required"); return; }
    startTransition(async () => {
      const res = await addOwnerLeadAction({
        property_name: manualForm.property_name.trim() || null,
        unit: manualForm.unit.trim() || null,
        owner_name: manualForm.owner_name.trim(),
        owner_phone: normalizePhone(manualForm.owner_phone.trim()),
        notes: manualForm.notes.trim() || null,
        expected_rent: null, stage: "imported",
      });
      if (!res.ok) { toast.error(res.message ?? "Could not save"); return; }
      track(ph, "card_added", { type: "owner_lead", method: "manual" });
      if (res.id) { setUploading(true); try { await uploadFiles(res.id); } finally { setUploading(false); } }
      toast.success("Added to outreach");
      setManualOpen(false); resetManual(); router.refresh();
    });
  }

  const busy = pending || uploading;

  return (
    <>
      {/* Trigger */}
      <div className="relative" ref={dropRef}>
        <button
          id="tour-add-lead"
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          className="kk-pill kk-pill-white flex items-center gap-2 px-4 py-2"
          style={{ fontSize: "13px", fontWeight: 500, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.12)", border: "1px solid rgba(0,0,0,0.08)" }}
        >
          <Users className="w-4 h-4" />
          Add to outreach
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 rounded-xl overflow-hidden"
              style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 200 }}>
              <button className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] font-medium hover:opacity-80 transition-opacity"
                style={{ color: "var(--kk-ink)" }}
                onClick={() => { setDropdownOpen(false); setWaForm(EMPTY_WA); setWaOpen(true); }}>
                <MessageCircle className="w-4 h-4 shrink-0" style={{ color: "var(--kk-green)" }} />
                Via WhatsApp
              </button>
              <div style={{ height: 1, background: "var(--kk-line)" }} />
              <button className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] font-medium hover:opacity-80 transition-opacity"
                style={{ color: "var(--kk-ink)" }}
                onClick={() => { setDropdownOpen(false); resetManual(); setManualOpen(true); }}>
                <PenLine className="w-4 h-4 shrink-0" style={{ color: "var(--kk-ink-mute)" }} />
                Add manually
              </button>
            </div>
          </>
        )}
      </div>

      {/* WA quick dialog */}
      {waOpen && (
        <Overlay onClose={() => { if (!busy) setWaOpen(false); }}>
          <div className="rounded-t-2xl sm:rounded-2xl p-6" style={{ background: "var(--kk-surface)" }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="serif text-[18px] tracking-tight" style={{ color: "var(--kk-ink)" }}>Send via WhatsApp</h2>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>We'll open WhatsApp with the intake link</p>
              </div>
              <button onClick={() => setWaOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-soft)" }}>✕</button>
            </div>
            <div className="space-y-3">
              <div><FieldLabel>Property name</FieldLabel><TextInput value={waForm.property_name} onChange={(v) => setWaForm((f) => ({ ...f, property_name: v }))} placeholder="e.g. Residensi Mutiara" /></div>
              <div><FieldLabel>Unit</FieldLabel><TextInput value={waForm.unit} onChange={(v) => setWaForm((f) => ({ ...f, unit: v }))} placeholder="e.g. A-12" /></div>
              <div><FieldLabel required>Owner name</FieldLabel><TextInput value={waForm.owner_name} onChange={(v) => setWaForm((f) => ({ ...f, owner_name: v }))} placeholder="e.g. Encik Ahmad" /></div>
              <div>
                <FieldLabel required>Phone number</FieldLabel>
                <TextInput type="tel" value={waForm.owner_phone} onChange={(v) => setWaForm((f) => ({ ...f, owner_phone: v }))} onBlur={(v) => setWaForm((f) => ({ ...f, owner_phone: normalizePhone(v) }))} placeholder="e.g. 601XXXXXXXX" />
                <p className="text-[11px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>For overseas numbers, include the country code, e.g. +44 7911 123456</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setWaOpen(false)} disabled={busy} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>Cancel</button>
                <button type="button" onClick={handleWaSend} disabled={busy} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2" style={{ background: "var(--kk-green)", color: "#fff" }}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                  Open WhatsApp
                </button>
              </div>
            </div>
          </div>
        </Overlay>
      )}

      {/* Manual add dialog */}
      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />
          <div className="relative z-10 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 overflow-y-auto max-h-[90dvh]"
            style={{ background: "var(--kk-surface)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="serif text-[20px] tracking-tight" style={{ color: "var(--kk-ink)" }}>Add to outreach</h2>
              <button onClick={() => setManualOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-soft)" }}>✕</button>
            </div>
            <div className="space-y-5">

              {/* Property */}
              <div>
                <SectionLabel>Property</SectionLabel>
                <div className="space-y-3">
                  <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowSugg(false); }}>
                    <FieldLabel>Property name</FieldLabel>
                    <TextInput value={manualForm.property_name}
                      onChange={(v) => { setManualForm((f) => ({ ...f, property_name: v })); setShowSugg(true); }}
                      placeholder="e.g. Residensi Mutiara" />
                    {showSugg && propertySuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden"
                        style={{ zIndex: 9999, background: "var(--kk-surface)", border: "1px solid var(--kk-line)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 200, overflowY: "auto" }}>
                        {propertySuggestions.map((ol) => (
                          <button key={ol.id} type="button" onMouseDown={(e) => { e.preventDefault(); setManualForm((f) => ({ ...f, property_name: ol.property_name ?? "" })); setShowSugg(false); }}
                            className="w-full text-left px-4 py-2.5 hover:opacity-70">
                            <p className="text-[13px] font-medium" style={{ color: "var(--kk-ink)" }}>{ol.property_name}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div><FieldLabel>Unit</FieldLabel><TextInput value={manualForm.unit} onChange={(v) => setManualForm((f) => ({ ...f, unit: v }))} placeholder="e.g. A-12" /></div>
                </div>
              </div>

              {/* Owner */}
              <div>
                <SectionLabel>Owner</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <div><FieldLabel required>Owner name</FieldLabel><TextInput value={manualForm.owner_name} onChange={(v) => setManualForm((f) => ({ ...f, owner_name: v }))} placeholder="e.g. Encik Ahmad" /></div>
                  <div>
                    <FieldLabel required>Phone</FieldLabel>
                    <TextInput type="tel" value={manualForm.owner_phone} onChange={(v) => setManualForm((f) => ({ ...f, owner_phone: v }))} onBlur={(v) => setManualForm((f) => ({ ...f, owner_phone: normalizePhone(v) }))} placeholder="601XXXXXXXX" />
                    <p className="text-[11px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>For overseas numbers, include the country code, e.g. +44 7911 123456</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <FieldLabel>Notes</FieldLabel>
                <textarea value={manualForm.notes} onChange={(e) => setManualForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Any context about this owner or property…" rows={2}
                  className="w-full px-3 py-2 rounded-xl text-[13px] outline-none resize-none"
                  style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }} />
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
                <button type="button" onClick={() => setManualOpen(false)} disabled={busy}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-medium hover:opacity-70"
                  style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>Cancel</button>
                <button type="button" onClick={handleManualSave} disabled={busy}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2"
                  style={{ background: "var(--kk-ink)", color: "#fff" }}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {uploading ? "Uploading…" : "Save"}
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
