"use client";

import { useState, useTransition, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { updateCompetitorLeadAction, saveOwnerLeadPhotos } from "@/lib/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { OwnerLead } from "@/lib/types";
import { Phone, X, Pencil, Building2, ImagePlus, FileSignature, Loader2, Trash2, Star } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { compressImage } from "@/lib/compress-image";
import { uploadWithProgress } from "@/lib/upload-with-progress";
import { DateInput } from "@/components/ui/date-input";
import { daysUntil } from "@/lib/types";

const FIELD_CLS = "w-full text-[14px] px-3 py-2 rounded-xl outline-none";
const FIELD_STY: React.CSSProperties = {
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
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [editingOwner, setEditingOwner] = useState(false);
  const [ownerName, setOwnerName] = useState(lead.owner_name ?? "");
  const [ownerPhone, setOwnerPhone] = useState(lead.owner_phone ?? "");
  const [propertyName, setPropertyName] = useState(lead.property_name ?? "");
  const [unit, setUnit] = useState(lead.unit ?? "");
  const [expectedRent, setExpectedRent] = useState(lead.expected_rent != null ? String(lead.expected_rent) : "");
  const [bedrooms, setBedrooms] = useState(lead.bedrooms != null ? String(lead.bedrooms) : "");
  const [bathrooms, setBathrooms] = useState(lead.bathrooms != null ? String(lead.bathrooms) : "");
  const [contractEnd, setContractEnd] = useState(lead.competitor_contract_end ?? "");

  const [photos, setPhotos] = useState<string[]>(lead.photo_urls ?? []);
  const [coverIndex, setCoverIndex] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleSave() {
    startTransition(async () => {
      const res = await updateCompetitorLeadAction(lead.id, {
        property_name: propertyName.trim() || lead.property_name || undefined,
        unit: unit || undefined,
        owner_name: ownerName || undefined,
        owner_phone: ownerPhone || undefined,
        expected_rent: expectedRent ? parseFloat(expectedRent) : null,
        bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
        bathrooms: bathrooms ? parseInt(bathrooms, 10) : null,
        competitor_contract_end: contractEnd || null,
      });
      if (!res.ok) { toast.error("Could not save"); return; }
      toast.success("Saved");
      setEditingOwner(false);
      router.refresh();
    });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("leadId", lead.id);
      fd.append("file", compressed);
      const { ok, data } = await uploadWithProgress("/api/agent/photo", fd, () => {});
      if (ok && data.url) {
        const updated = [...photos, data.url as string];
        setPhotos(updated);
        await saveOwnerLeadPhotos(lead.id, updated);
      }
    } catch {
      toast.error("Photo upload failed");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  async function handleRemovePhoto(i: number) {
    const updated = photos.filter((_, idx) => idx !== i);
    setPhotos(updated);
    if (coverIndex >= updated.length) setCoverIndex(Math.max(0, updated.length - 1));
    await saveOwnerLeadPhotos(lead.id, updated).catch(() => toast.error("Failed to remove photo"));
  }

  const daysLeft = contractEnd ? daysUntil(contractEnd, new Date()) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="bg-card border-border max-w-md p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="overflow-y-auto flex-1 space-y-5 p-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="kk-overline mb-2">Edit target listing</p>
              {editingOwner ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Owner name"
                    autoFocus
                    className="w-full text-[18px] font-semibold bg-transparent outline-none border-b pb-0.5"
                    style={{ color: "var(--kk-ink)", letterSpacing: "-0.014em", borderColor: "var(--kk-line)" }}
                  />
                  <input
                    type="tel"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="Phone (with country code)"
                    className="w-full text-[12px] bg-transparent outline-none border-b pb-0.5"
                    style={{ color: "var(--kk-ink-faint)", borderColor: "var(--kk-line)" }}
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-[18px] font-semibold leading-tight" style={{ color: "var(--kk-ink)", letterSpacing: "-0.014em" }}>
                      {ownerName || "Unknown owner"}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setEditingOwner(true)}
                      className="p-1 rounded-full shrink-0"
                      style={{ color: "var(--kk-ink-mute)" }}
                      aria-label="Edit owner info"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {ownerPhone ? (
                    <div className="flex items-center gap-0.5 mt-1">
                      <p className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>+{ownerPhone}</p>
                      <a href={`https://wa.me/${ownerPhone}`} target="_blank" rel="noopener" className="p-1 rounded-full" style={{ color: "#25D366" }} aria-label="WhatsApp">
                        <WhatsAppIcon className="w-3.5 h-3.5" />
                      </a>
                      <a href={`tel:+${ownerPhone}`} className="p-1 rounded-full" style={{ color: "var(--kk-ink-faint)" }} aria-label="Call">
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-[12px] mt-1" style={{ color: "var(--kk-ink-faint)" }}></p>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Property pill */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl" style={{ background: "var(--kk-surface-2)" }}>
            <Building2 className="w-4 h-4 shrink-0" style={{ color: "var(--kk-ink-faint)" }} />
            <input
              type="text"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              placeholder="Property name"
              className="flex-1 min-w-0 text-[13px] font-medium bg-transparent outline-none"
              style={{ color: "var(--kk-ink)" }}
            />
          </div>

          {/* Fields */}
          <div className="grid grid-cols-2 gap-3">
            <CField label="Unit" value={unit} onChange={setUnit} placeholder="e.g. A-12-05" />
            <CField label="Expected rent (RM)" value={expectedRent} onChange={setExpectedRent} placeholder="e.g. 2500" type="number" />
            <CField label="Bedrooms" value={bedrooms} onChange={setBedrooms} placeholder="e.g. 3" type="number" />
            <CField label="Bathrooms" value={bathrooms} onChange={setBathrooms} placeholder="e.g. 2" type="number" />
            {contractEnd && daysLeft !== null && (
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Days to expiry</label>
                <div className={`${FIELD_CLS}`} style={FIELD_STY}>
                  {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)}d ago` : daysLeft === 0 ? "Expires today" : `${daysLeft} days left`}
                </div>
              </div>
            )}
          </div>

          {/* Contract card */}
          <div className="rounded-xl p-4 space-y-3" style={{ border: "1px solid var(--kk-line)" }}>
            <div className="flex items-center gap-2">
              <FileSignature className="w-3.5 h-3.5" style={{ color: "var(--kk-ink-faint)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--kk-ink-mute)" }}>Contract end</p>
              {contractEnd && daysLeft !== null && (
                <ContractBadge daysLeft={daysLeft} />
              )}
            </div>
            <div>
              <label className="text-[12px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>End date</label>
              <DateInput
                value={contractEnd}
                onChange={setContractEnd}
                className="w-full mt-1.5 text-[13px] px-3 py-2 rounded-xl"
                style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
              />
            </div>
          </div>

          {/* Photos */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
            <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid var(--kk-line)", background: "var(--kk-surface-2)" }}>
              <ImagePlus className="w-3.5 h-3.5" style={{ color: "var(--kk-ink-faint)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--kk-ink-mute)" }}>Property photos</p>
              <span className="ml-auto text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>{photos.length}/10</span>
            </div>
            <div className="p-3 grid grid-cols-3 gap-2">
              {photos.map((url, i) => (
                <div
                  key={url}
                  className="relative rounded-lg overflow-hidden group cursor-pointer"
                  style={{ aspectRatio: "16/9" }}
                  onClick={() => setLightboxUrl(url)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {i === coverIndex && (
                    <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>Cover</span>
                  )}
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {i !== coverIndex && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setCoverIndex(i); }} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }} title="Set as cover">
                        <Star className="w-3 h-3 text-white" />
                      </button>
                    )}
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleRemovePhoto(i); }} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              ))}
              {photos.length < 10 && (
                <label className="flex items-center justify-center rounded-lg cursor-pointer transition-colors" style={{ aspectRatio: "16/9", border: "1.5px dashed var(--kk-line)", background: "var(--kk-surface-2)" }}>
                  {uploadingPhoto
                    ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--kk-ink-faint)" }} />
                    : <ImagePlus className="w-4 h-4" style={{ color: "var(--kk-ink-faint)" }} />
                  }
                  <input ref={photoInputRef} type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                </label>
              )}
            </div>
          </div>

          {/* Save / Delete */}
          {confirmDelete ? (
            <div className="flex items-center gap-2 pt-1 rounded-xl px-3 py-2" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
              <p className="flex-1 text-[12px] font-medium" style={{ color: "#DC2626" }}>Remove this target listing?</p>
              <button type="button" className="kk-pill kk-pill-ghost text-[12px]" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-1">
              <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors hover:bg-red-50" style={{ color: "var(--kk-ink-faint)" }}>
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
              <div className="flex-1" />
              <button type="button" className="kk-pill kk-pill-ghost" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</button>
              <button type="button" className="kk-pill kk-pill-primary" onClick={handleSave} disabled={pending}>
                {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {pending ? "Saving..." : "Save details"}
              </button>
            </div>
          )}
        </div>

        {lightboxUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setLightboxUrl(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (s: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={FIELD_CLS} style={FIELD_STY} />
    </div>
  );
}

function ContractBadge({ daysLeft }: { daysLeft: number }) {
  const bucket = daysLeft < 0 ? "expired" : daysLeft <= 30 ? "expiring_30" : daysLeft <= 60 ? "expiring_60" : "active";
  const tone: Record<string, { bg: string; ink: string; text: string }> = {
    expired:     { bg: "var(--kk-surface-2)", ink: "var(--kk-ink-mute)", text: `Expired ${Math.abs(daysLeft)}d ago` },
    expiring_30: { bg: "var(--kk-red-soft)",  ink: "#C62828",            text: daysLeft === 0 ? "Expires today" : `${daysLeft}d left` },
    expiring_60: { bg: "var(--kk-amber-soft)", ink: "#B45309",           text: `${daysLeft}d left` },
    active:      { bg: "var(--kk-green-soft)", ink: "#1F8B4C",           text: `${daysLeft}d left` },
  };
  const style = tone[bucket];
  return (
    <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: style.bg, color: style.ink }}>
      {style.text}
    </span>
  );
}
