"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, ChevronDown, MessageCircle, PenLine, Camera, X } from "lucide-react";
import { MoneyInput } from "@/components/ui/money-input";
import { addOwnerLeadAction, generateOwnerIntakeLink, saveOwnerLeadPhotos } from "@/lib/actions";
import { toast } from "sonner";

interface FormData {
  owner_name: string;
  owner_phone: string;
  property_name: string;
  unit: string;
  expected_rent: string;
  bedrooms: string;
  bathrooms: string;
  notes: string;
  sendWhatsApp: boolean;
}

const EMPTY_FORM: FormData = {
  owner_name: "",
  owner_phone: "",
  property_name: "",
  unit: "",
  expected_rent: "",
  bedrooms: "",
  bathrooms: "",
  notes: "",
  sendWhatsApp: false,
};

interface WaForm { owner_name: string; owner_phone: string; property_name: string; }
const EMPTY_WA: WaForm = { owner_name: "", owner_phone: "", property_name: "" };

export function NewListingButton() {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [waDialogOpen, setWaDialogOpen] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [waForm, setWaForm] = useState<WaForm>(EMPTY_WA);
  const [photoFiles, setPhotoFiles] = useState<Array<{ file: File; preview: string }>>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [pending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

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
    startTransition(async () => {
      const res = await addOwnerLeadAction({
        owner_name: waForm.owner_name.trim(),
        owner_phone: waForm.owner_phone.trim(),
        property_name: waForm.property_name.trim() || null,
        unit: null, expected_rent: null, bedrooms: null, bathrooms: null, notes: null,
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
    if (!form.owner_name.trim())    { toast.error("Owner name is required"); return; }
    if (!form.owner_phone.trim())   { toast.error("Phone number is required"); return; }
    if (!form.property_name.trim()) { toast.error("Property name is required"); return; }
    if (!form.unit.trim())          { toast.error("Unit number is required"); return; }
    if (!form.expected_rent.trim()) { toast.error("Expected rent is required"); return; }
    if (!form.bedrooms.trim())      { toast.error("Bedrooms is required"); return; }
    if (!form.bathrooms.trim())     { toast.error("Bathrooms is required"); return; }

    startTransition(async () => {
      const res = await addOwnerLeadAction({
        owner_name: form.owner_name.trim(),
        owner_phone: form.owner_phone.trim(),
        property_name: form.property_name.trim() || null,
        unit: form.unit.trim() || null,
        expected_rent: form.expected_rent ? parseFloat(form.expected_rent) : null,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms, 10) : null,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms, 10) : null,
        notes: form.notes.trim() || null,
      });

      if (!res.ok) {
        toast.error(res.message ?? "Could not create listing");
        return;
      }

      // Upload photos if any were selected
      if (res.id && photoFiles.length > 0) {
        setUploadingPhotos(true);
        try {
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
        } catch {
          toast.error("Photos could not be saved");
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
          New property listing
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

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-mute)" }}>
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
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-mute)" }}>
                    Phone number <span style={{ color: "var(--kk-red)" }}>*</span>
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
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-mute)" }}>
                    Property name <span style={{ color: "var(--kk-red)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.property_name}
                    onChange={(e) => setForm((f) => ({ ...f, property_name: e.target.value }))}
                    placeholder="e.g. Residensi Mutiara"
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-mute)" }}>
                    Unit number <span style={{ color: "var(--kk-red)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    placeholder="e.g. A-12"
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-mute)" }}>
                    Expected rent (RM/mo) <span style={{ color: "var(--kk-red)" }}>*</span>
                  </label>
                  <MoneyInput
                    value={form.expected_rent}
                    onChange={(raw) => setForm((f) => ({ ...f, expected_rent: raw }))}
                    placeholder="e.g. 2,500"
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-mute)" }}>
                      Bedrooms <span style={{ color: "var(--kk-red)" }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={form.bedrooms}
                      onChange={(e) => setForm((f) => ({ ...f, bedrooms: e.target.value }))}
                      placeholder="e.g. 3"
                      min={0}
                      className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                      style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-mute)" }}>
                      Bathrooms <span style={{ color: "var(--kk-red)" }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={form.bathrooms}
                      onChange={(e) => setForm((f) => ({ ...f, bathrooms: e.target.value }))}
                      placeholder="e.g. 2"
                      min={0}
                      className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                      style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-mute)" }}>
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Furnishing, tenant preferences…"
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none resize-none"
                    style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--kk-ink-mute)" }}>Photos</label>
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
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 shrink-0 transition-opacity hover:opacity-70"
                      style={{ border: "1.5px dashed var(--kk-line)", color: "var(--kk-ink-mute)" }}
                    >
                      <Camera className="w-4 h-4" />
                      <span className="text-[10px] font-medium">Add</span>
                    </button>
                    <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
                  </div>
                </div>
                <div className="col-span-2">
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
                </div>
              </div>

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
                  {uploadingPhotos ? "Uploading photos…" : "Save listing"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
