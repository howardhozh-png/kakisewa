"use client";

import { useState, useTransition, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { updateCompetitorLeadAction, saveOwnerLeadPhotos } from "@/lib/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { OwnerLead } from "@/lib/types";
import { Phone, X, Pencil, Camera, Loader2 } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { UploadRing } from "@/components/ui/upload-ring";
import { compressImage } from "@/lib/compress-image";
import { uploadWithProgress } from "@/lib/upload-with-progress";
import { DateInput } from "@/components/ui/date-input";

const FIELD_STYLE: React.CSSProperties = {
  width: "100%",
  fontSize: 14,
  padding: "8px 12px",
  borderRadius: 10,
  outline: "none",
  background: "var(--kk-surface-2)",
  border: "1px solid var(--kk-line)",
  color: "var(--kk-ink)",
};

interface Props {
  lead: OwnerLead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCompetitorDialog({ lead, open, onOpenChange }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    property_name: lead.property_name ?? "",
    unit: lead.unit ?? "",
    owner_name: lead.owner_name ?? "",
    owner_phone: lead.owner_phone ?? "",
    expected_rent: lead.expected_rent != null ? String(lead.expected_rent) : "",
    bedrooms: lead.bedrooms != null ? String(lead.bedrooms) : "",
    bathrooms: lead.bathrooms != null ? String(lead.bathrooms) : "",
    competitor_contract_end: lead.competitor_contract_end ?? "",
  });
  const [dirty, setDirty] = useState(false);
  const [photos, setPhotos] = useState<string[]>(lead.photo_urls ?? []);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  }

  function handleSave() {
    if (!form.property_name.trim()) { toast.error("Property name required"); return; }
    startTransition(async () => {
      const res = await updateCompetitorLeadAction(lead.id, {
        property_name: form.property_name.trim(),
        unit: form.unit || undefined,
        owner_name: form.owner_name || undefined,
        owner_phone: form.owner_phone || undefined,
        expected_rent: form.expected_rent ? parseFloat(form.expected_rent) : null,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms, 10) : null,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms, 10) : null,
        competitor_contract_end: form.competitor_contract_end || null,
      });
      if (!res.ok) { toast.error("Could not save"); return; }
      toast.success("Updated");
      setDirty(false);
      router.refresh();
    });
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
    await saveOwnerLeadPhotos(lead.id, updated).catch(() => toast.error("Failed to remove photo"));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="bg-card border-border max-w-lg p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="overflow-y-auto">
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
                  aria-label="Edit owner name"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                <input
                  value={form.owner_phone}
                  onChange={(e) => set("owner_phone", e.target.value)}
                  className="text-[12px] flex-1 min-w-0 bg-transparent outline-none border-b border-transparent focus:border-[var(--kk-line)]"
                  style={{ color: "var(--kk-ink-mute)" }}
                  placeholder="Phone"
                />
                {form.owner_phone && (
                  <>
                    <a href={`https://wa.me/${form.owner_phone}`} target="_blank" rel="noopener" className="p-1 rounded-full shrink-0" style={{ color: "#25D366" }} aria-label="WhatsApp">
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                    </a>
                    <a href={`tel:+${form.owner_phone}`} className="p-1 rounded-full shrink-0" style={{ color: "var(--kk-ink-faint)" }} aria-label="Call">
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </>
                )}
              </div>
            </div>
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-full p-1 transition-opacity hover:opacity-60" style={{ color: "var(--kk-ink-mute)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Fields */}
          <div className="px-5 py-4 grid grid-cols-2 gap-x-4 gap-y-3">
            {[
              { label: "Property", field: "property_name" as const, colSpan: 2, placeholder: "e.g. Agile Mont Kiara" },
              { label: "Unit", field: "unit" as const, placeholder: "e.g. A-12-05" },
              { label: "Rent (RM)", field: "expected_rent" as const, type: "number", placeholder: "e.g. 2500" },
              { label: "Bedrooms", field: "bedrooms" as const, type: "number", placeholder: "e.g. 3" },
              { label: "Bathrooms", field: "bathrooms" as const, type: "number", placeholder: "e.g. 2" },
            ].map(({ label, field, type, colSpan, placeholder }) => (
              <div key={field} className={colSpan === 2 ? "col-span-2" : ""}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-faint)" }}>{label}</p>
                <input type={type ?? "text"} value={form[field]} onChange={(e) => set(field, e.target.value)} style={FIELD_STYLE} placeholder={placeholder} />
              </div>
            ))}
            <div className="col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-faint)" }}>Contract end</p>
              <DateInput value={form.competitor_contract_end} onChange={(v) => set("competitor_contract_end", v)} style={FIELD_STYLE} />
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

          {/* Save action */}
          {dirty && (
            <div className="px-5 pb-5">
              <button
                type="button"
                disabled={pending}
                onClick={handleSave}
                className="w-full py-2.5 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--kk-ink)", color: "#fff" }}
              >
                {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                {pending ? "Saving..." : "Save changes"}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
