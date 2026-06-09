"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/ui/money-input";
import { DateInput } from "@/components/ui/date-input";
import { OwnerLead } from "@/lib/types";
import { updateOwnerLeadDetails, saveOwnerLeadPhotos, saveOwnerLeadAgreementUrl, removeOwnerLead } from "@/lib/actions";
import { Loader2, X, Pencil, ImagePlus, FileText, Upload, Trash2, Star } from "lucide-react";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { toast } from "sonner";

interface Props {
  lead: OwnerLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (updated: Partial<OwnerLead>) => void;
  tenantInfo?: { tenant_name: string; tenant_phone: string; tenancy_id: string } | null;
}

export function EditOwnerLeadDialog({ lead, open, onOpenChange, onSaved, tenantInfo }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState<number>(0);
  const [agreementUrl, setAgreementUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingAgreement, setUploadingAgreement] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const agreementInputRef = useRef<HTMLInputElement>(null);

  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [editingOwner, setEditingOwner] = useState(false);
  const [propertyName, setPropertyName] = useState("");
  const [unit, setUnit] = useState("");
  const [expectedRent, setExpectedRent] = useState<string>("");
  const [bedrooms, setBedrooms] = useState<string>("");
  const [bathrooms, setBathrooms] = useState<string>("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [notes, setNotes] = useState("");

  // Reset fields when a new lead is opened
  useEffect(() => {
    if (lead) {
      setPhotos(lead.photo_urls ?? []);
      setCoverIndex(lead.cover_photo_index ?? 0);
      setAgreementUrl(lead.agreement_url ?? null);
      setOwnerName(lead.owner_name ?? "");
      setOwnerPhone(lead.owner_phone ?? "");
      setEditingOwner(false);
      setPropertyName(lead.property_name ?? "");
      setUnit(lead.unit ?? "");
      setExpectedRent(lead.expected_rent != null ? String(lead.expected_rent) : "");
      setBedrooms(lead.bedrooms != null ? String(lead.bedrooms) : "");
      setBathrooms(lead.bathrooms != null ? String(lead.bathrooms) : "");
      setAvailableFrom(lead.available_from ?? new Date().toISOString().split("T")[0]);
      setNotes(lead.notes ?? "");
    }
  }, [lead?.id, open]);

  if (!lead) return null;

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || photos.length >= 10) return;
    setUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/document", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Upload failed"); return; }
      const next = [...photos, data.url as string];
      setPhotos(next);
      await saveOwnerLeadPhotos(lead!.id, next);
    } catch { toast.error("Upload failed"); }
    finally { setUploadingPhoto(false); if (photoInputRef.current) photoInputRef.current.value = ""; }
  }

  async function handleRemovePhoto(idx: number) {
    const next = photos.filter((_, i) => i !== idx);
    const newCover = idx === coverIndex ? 0 : idx < coverIndex ? coverIndex - 1 : coverIndex;
    setPhotos(next);
    setCoverIndex(newCover);
    await saveOwnerLeadPhotos(lead!.id, next);
    await updateOwnerLeadDetails(lead!.id, { cover_photo_index: newCover });
    onSaved?.({ cover_photo_index: newCover });
  }

  async function handleSetCover(idx: number) {
    setCoverIndex(idx);
    await updateOwnerLeadDetails(lead!.id, { cover_photo_index: idx });
    onSaved?.({ cover_photo_index: idx });
    toast.success("Cover photo updated");
  }

  async function handleAgreementUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAgreement(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/document", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Upload failed"); return; }
      const url = data.url as string;
      setAgreementUrl(url);
      await saveOwnerLeadAgreementUrl(lead!.id, url);
      toast.success("Agreement saved");
    } catch { toast.error("Upload failed"); }
    finally { setUploadingAgreement(false); if (agreementInputRef.current) agreementInputRef.current.value = ""; }
  }

  async function handleRemoveAgreement() {
    setAgreementUrl(null);
    await saveOwnerLeadAgreementUrl(lead!.id, null);
    toast.success("Agreement removed");
  }

  function handleDelete() {
    if (!lead) return;
    startTransition(async () => {
      await removeOwnerLead(lead.id);
      onOpenChange(false);
      router.refresh();
    });
  }

  function handleSave() {
    if (!lead) return;
    const updates = {
      owner_name: ownerName || undefined,
      owner_phone: ownerPhone || undefined,
      property_name: propertyName || null,
      unit: unit || null,
      expected_rent: expectedRent ? parseFloat(expectedRent) : null,
      bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
      bathrooms: bathrooms ? parseInt(bathrooms, 10) : null,
      available_from: availableFrom || null,
      notes: notes || null,
    };
    startTransition(async () => {
      const res = await updateOwnerLeadDetails(lead.id, updates);
      if (res.ok) {
        onSaved?.(updates);
        router.refresh();
        toast.success("Lead updated");
        onOpenChange(false);
      } else {
        toast.error(res.message ?? "Could not save");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="bg-card border-border max-w-md p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="overflow-y-auto flex-1 space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="kk-overline mb-2">Edit listing</p>
              {editingOwner ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Owner name"
                    autoFocus
                    className="w-full text-[18px] font-semibold leading-tight bg-transparent outline-none border-b pb-0.5"
                    style={{ color: "var(--kk-ink)", letterSpacing: "-0.014em", borderColor: "var(--kk-line)" }}
                  />
                  <input
                    type="tel"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="Phone (with country code)"
                    className="w-full text-[12px] mt-1 bg-transparent outline-none border-b pb-0.5"
                    style={{ color: "var(--kk-ink-faint)", borderColor: "var(--kk-line)" }}
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-[18px] font-semibold leading-tight" style={{ color: "var(--kk-ink)", letterSpacing: "-0.014em" }}>
                      {ownerName}
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
                  <p className="text-[12px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>+{ownerPhone}</p>
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

          {lead.stage === "matched" && tenantInfo && (
            <div className="rounded-xl p-3" style={{ background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.20)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#1F8B4C" }}>Rented to</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: "var(--kk-ink)" }}>{tenantInfo.tenant_name}</p>
                  <p className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>+{tenantInfo.tenant_phone}</p>
                </div>
                <a href={`/track-renewal?open=${tenantInfo.tenancy_id}`} className="text-[12px] font-medium px-3 py-1.5 rounded-full hover:opacity-80" style={{ background: "rgba(52,199,89,0.12)", color: "#1F8B4C" }}>
                  View tenancy →
                </a>
              </div>
            </div>
          )}

          <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
            Capture property details
          </p>

          {lead.stage === "listed" && !availableFrom && (
            <div className="px-3 py-2.5 rounded-xl text-[12px]" style={{ background: "rgba(255,149,0,0.08)", border: "1px solid rgba(255,149,0,0.24)", color: "#B45309" }}>
              ⚠ Set an availability date so this property shows on the pipeline chart.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Property name" value={propertyName} onChange={setPropertyName} placeholder="e.g. Residensi Mutiara" full />
            <Field label="Unit" value={unit} onChange={setUnit} placeholder="e.g. A-12" />
            <Field label="Expected rent (RM/mo)" value={expectedRent} onChange={setExpectedRent} placeholder="e.g. 1,800" money />
            <Field label="Bedrooms" value={bedrooms} onChange={setBedrooms} placeholder="e.g. 3" type="number" />
            <Field label="Bathrooms" value={bathrooms} onChange={setBathrooms} placeholder="e.g. 2" type="number" />
            <Field label={lead.stage === "listed" ? "Available from *" : "Available from"} value={availableFrom} onChange={setAvailableFrom} type="date" full highlight={lead.stage === "listed" && !availableFrom} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else the owner mentioned…"
              className="w-full text-[14px] px-3 py-2 rounded-xl"
              style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)", minHeight: 80 }}
            />
          </div>

          {/* Property photos */}
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
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {i === coverIndex && (
                    <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>Cover</span>
                  )}
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {i !== coverIndex && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSetCover(i); }}
                        className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.55)" }}
                        title="Set as cover"
                      >
                        <Star className="w-3 h-3 text-white" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemovePhoto(i); }}
                      className="w-6 h-6 rounded-md flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.55)" }}
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              ))}
              {photos.length < 10 && (
                <label
                  className="flex items-center justify-center rounded-lg cursor-pointer"
                  style={{ aspectRatio: "16/9", border: "1.5px dashed var(--kk-line)", background: "var(--kk-surface-2)" }}
                >
                  {uploadingPhoto
                    ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--kk-ink-faint)" }} />
                    : <ImagePlus className="w-4 h-4" style={{ color: "var(--kk-ink-faint)" }} />
                  }
                  <input ref={photoInputRef} type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                </label>
              )}
            </div>
          </div>

          {/* Tenancy agreement */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
            <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid var(--kk-line)", background: "var(--kk-surface-2)" }}>
              <FileText className="w-3.5 h-3.5" style={{ color: "var(--kk-ink-faint)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--kk-ink-mute)" }}>Tenancy agreement</p>
            </div>
            {agreementUrl ? (
              <div className="flex items-center gap-3 px-3 py-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--kk-green-soft)" }}>
                  <FileText className="w-4 h-4" style={{ color: "var(--kk-green)" }} />
                </div>
                <p className="flex-1 text-[13px] font-medium truncate min-w-0" style={{ color: "var(--kk-ink)" }}>Agreement</p>
                <a href={agreementUrl} target="_blank" rel="noopener noreferrer" className="kk-pill kk-pill-ghost shrink-0" style={{ padding: "0.3rem 0.75rem", fontSize: 12 }}>View</a>
                <label className="kk-pill kk-pill-ghost shrink-0 cursor-pointer" style={{ padding: "0.3rem 0.75rem", fontSize: 12 }}>
                  {uploadingAgreement ? <Loader2 className="w-3 h-3 animate-spin" /> : "Replace"}
                  <input ref={agreementInputRef} type="file" accept="image/*,application/pdf" className="sr-only" onChange={handleAgreementUpload} disabled={uploadingAgreement} />
                </label>
                <button type="button" onClick={handleRemoveAgreement} className="p-1.5 rounded-lg" style={{ color: "var(--kk-ink-faint)" }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="px-3 py-4 flex flex-col items-center gap-1.5">
                <label className="kk-pill kk-pill-ghost cursor-pointer flex items-center gap-1.5">
                  {uploadingAgreement ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Upload agreement
                  <input ref={agreementInputRef} type="file" accept="image/*,application/pdf" className="sr-only" onChange={handleAgreementUpload} disabled={uploadingAgreement} />
                </label>
                <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>PDF or image, max 20 MB</p>
              </div>
            )}
          </div>

          {confirmDelete ? (
            <div className="flex items-center gap-2 pt-1 rounded-xl px-3 py-2" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
              <p className="flex-1 text-[12px] font-medium" style={{ color: "#DC2626" }}>Delete this lead permanently?</p>
              <button type="button" className="kk-pill kk-pill-ghost text-[12px]" onClick={() => setConfirmDelete(false)} disabled={pending}>Cancel</button>
              <button type="button" onClick={handleDelete} disabled={pending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                style={{ background: "#DC2626", color: "#fff" }}>
                {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                {pending ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-1">
              <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors hover:bg-red-50"
                style={{ color: "var(--kk-ink-faint)" }}>
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
              <div className="flex-1" />
              <button type="button" className="kk-pill kk-pill-ghost" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</button>
              <button type="button" className="kk-pill kk-pill-primary" onClick={handleSave} disabled={pending}>
                {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {pending ? "Saving…" : "Save details"}
              </button>
            </div>
          )}

          {lightboxUrl && <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", full, money, highlight }: {
  label: string; value: string; onChange: (s: string) => void; placeholder?: string; type?: string; full?: boolean; money?: boolean; highlight?: boolean;
}) {
  const cls = "w-full text-[14px] px-3 py-2 rounded-xl";
  const sty = highlight
    ? { background: "rgba(255,149,0,0.06)", border: "1.5px solid rgba(255,149,0,0.45)", color: "var(--kk-ink)" }
    : { background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" };
  return (
    <div className={`space-y-1.5 ${full ? "col-span-2" : ""}`}>
      <label className="text-[13px] font-medium" style={{ color: highlight ? "#B45309" : "var(--kk-ink-soft)" }}>{label}</label>
      {money
        ? <MoneyInput value={value} onChange={onChange} placeholder={placeholder} className={cls} style={sty} />
        : type === "date"
        ? <DateInput value={value} onChange={onChange} className={cls} style={sty} />
        : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} style={sty} />
      }
    </div>
  );
}
