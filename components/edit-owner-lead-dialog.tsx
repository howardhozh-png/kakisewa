"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/ui/money-input";
import { DateInput } from "@/components/ui/date-input";
import { OwnerLead } from "@/lib/types";
import { updateOwnerLeadDetails, saveOwnerLeadAgreementUrl, removeOwnerLeadForce, updateMatchedTenancyDetails } from "@/lib/actions";
import { normalizePhone, phoneError, toE164Display } from "@/lib/phone";
import { Loader2, X, Pencil, ImagePlus, FileText, Upload, Trash2, Star, Phone, Building2, CalendarPlus } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { usePhotoUpload } from "@/hooks/use-photo-upload";
import { CalendarEventDialog } from "@/components/calendar-event-dialog";
import { CompetitorRentedDialog } from "@/components/competitor-rented-dialog";
import { toast } from "sonner";

interface Props {
  lead: OwnerLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (updated: Partial<OwnerLead>) => void;
  tenantInfo?: {
    tenant_name: string;
    tenant_phone: string;
    tenancy_id: string;
    lifecycle_stage?: string | null;
    contract_start?: string | null;
    contract_end?: string | null;
    contract_duration_months?: number | null;
    amount?: number;
  } | null;
}

export function EditOwnerLeadDialog({ lead, open, onOpenChange, onSaved, tenantInfo }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { photos, coverIndex, uploading: uploadingPhoto, inputRef: photoInputRef, reset: resetPhotos,
          handleUpload: handlePhotoUpload, handleRemove: handleRemovePhoto, handleSetCover } =
    usePhotoUpload(lead?.id ?? "", lead?.photo_urls ?? [], lead?.cover_photo_index ?? 0, onSaved);
  const [agreementUrls, setAgreementUrls] = useState<string[]>([]);
  const [uploadingAgreement, setUploadingAgreement] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const agreementInputRef = useRef<HTMLInputElement>(null);

  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [editingOwner, setEditingOwner] = useState(false);
  const [propertyName, setPropertyName] = useState("");
  const [unit, setUnit] = useState("");
  const [expectedRent, setExpectedRent] = useState<string>("");
  const [bedrooms, setBedrooms] = useState<string>("");
  const [bathrooms, setBathrooms] = useState<string>("");
  const [parking, setParking] = useState<string>("");
  const [listingPurpose, setListingPurpose] = useState<"rent" | "sell" | "both" | null>(null);
  const [phoneErr, setPhoneErr] = useState<string | null>(null);
  const [availableFrom, setAvailableFrom] = useState("");
  const [notes, setNotes] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [competitorRentedOpen, setCompetitorRentedOpen] = useState(false);

  // Tenancy fields (only for matched/Rented cards)
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenancyAmount, setTenancyAmount] = useState("");
  const [contractStart, setContractStart] = useState("");
  const [contractDuration, setContractDuration] = useState("");

  // Reset fields when a new lead is opened
  useEffect(() => {
    if (lead) {
      resetPhotos(lead.photo_urls ?? [], lead.cover_photo_index ?? 0);
      setAgreementUrls(parseAgreementUrls(lead.agreement_url ?? null));
      setOwnerName(lead.owner_name ?? "");
      setOwnerPhone(lead.owner_phone ?? "");
      setEditingOwner(false);
      setPropertyName(lead.property_name ?? "");
      setUnit(lead.unit ?? "");
      setExpectedRent(lead.expected_rent != null ? String(lead.expected_rent) : "");
      setBedrooms(lead.bedrooms != null ? String(lead.bedrooms) : "");
      setBathrooms(lead.bathrooms != null ? String(lead.bathrooms) : "");
      setParking(lead.parking ?? "");
      setListingPurpose(lead.listing_purpose ?? null);
      setPhoneErr(null);
      setAvailableFrom(lead.available_from ?? "");
      setNotes(lead.notes ?? "");
      setConfirmDelete(false);
    }
  }, [lead?.id, open]);

  useEffect(() => {
    if (tenantInfo) {
      setTenantName(tenantInfo.tenant_name ?? "");
      setTenantPhone(tenantInfo.tenant_phone ?? "");
      setTenancyAmount(tenantInfo.amount != null ? String(tenantInfo.amount) : "");
      setContractStart(tenantInfo.contract_start ?? "");
      setContractDuration(tenantInfo.contract_duration_months != null ? String(tenantInfo.contract_duration_months) : "");
    }
  }, [tenantInfo?.tenancy_id, open]);

  if (!lead) return null;


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
      const updated = [...agreementUrls, url];
      setAgreementUrls(updated);
      await saveOwnerLeadAgreementUrl(lead!.id, serializeAgreementUrls(updated));
      toast.success("Document saved");
    } catch { toast.error("Upload failed"); }
    finally { setUploadingAgreement(false); if (agreementInputRef.current) agreementInputRef.current.value = ""; }
  }

  async function handleRemoveAgreementFile(index: number) {
    const updated = agreementUrls.filter((_, i) => i !== index);
    setAgreementUrls(updated);
    await saveOwnerLeadAgreementUrl(lead!.id, serializeAgreementUrls(updated));
    toast.success("Document removed");
  }

  function handleDelete() {
    if (!lead) return;
    startTransition(async () => {
      try {
        await removeOwnerLeadForce(lead.id);
        onOpenChange(false);
        router.refresh();
      } catch {
        toast.error("Could not delete lead");
      }
    });
  }

  function handleSave() {
    if (!lead) return;
    const pErr = phoneError(normalizePhone(ownerPhone));
    if (pErr) { setPhoneErr(pErr); toast.error(pErr); return; }
    const updates = {
      owner_name: ownerName || undefined,
      owner_phone: ownerPhone || undefined,
      property_name: propertyName || null,
      unit: unit || null,
      expected_rent: expectedRent ? parseFloat(expectedRent) : null,
      bedrooms: bedrooms !== "" ? parseInt(bedrooms, 10) : null,
      bathrooms: bathrooms ? parseInt(bathrooms, 10) : null,
      parking: parking.trim() || null,
      listing_purpose: listingPurpose,
      available_from: availableFrom || null,
      notes: notes || null,
    };
    startTransition(async () => {
      const res = await updateOwnerLeadDetails(lead.id, updates);
      if (!res.ok) { toast.error(res.message ?? "Could not save"); return; }

      // Also save tenancy fields if lead is matched (Rented column)
      if (lead.stage === "matched" && tenantInfo?.tenancy_id) {
        const tenancyUpdates = {
          tenant_name: tenantName || undefined,
          tenant_phone: tenantPhone || undefined,
          amount: tenancyAmount ? parseFloat(tenancyAmount) : undefined,
          contract_start: contractStart || undefined,
          contract_duration_months: contractDuration ? parseInt(contractDuration, 10) : undefined,
        };
        await updateMatchedTenancyDetails(tenantInfo.tenancy_id, tenancyUpdates);
      }

      onSaved?.(updates);
      router.refresh();
      toast.success("Lead updated");
      onOpenChange(false);
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
                    onChange={(e) => { setOwnerPhone(e.target.value); setPhoneErr(null); }}
                    onBlur={(e) => {
                      const normalized = normalizePhone(e.target.value);
                      setOwnerPhone(normalized);
                      setPhoneErr(phoneError(normalized));
                    }}
                    placeholder="e.g. 0123456789"
                    className="w-full text-[12px] mt-1 bg-transparent outline-none border-b pb-0.5"
                    style={{ color: "var(--kk-ink-faint)", borderColor: phoneErr ? "#FF3B30" : "var(--kk-line)" }}
                  />
                  {phoneErr ? (
                    <p className="text-[11px] mt-0.5" style={{ color: "#FF3B30" }}>{phoneErr}</p>
                  ) : (
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>For overseas numbers, include the country code, e.g. +44 7911 123456</p>
                  )}
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
                  {ownerPhone ? (
                    <div className="flex items-center gap-0.5 mt-1">
                      <p className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>{toE164Display(ownerPhone)}</p>
                      <a href={`https://wa.me/${normalizePhone(ownerPhone)}`} target="_blank" rel="noopener" className="p-1 rounded-full" style={{ color: "var(--kk-whatsapp)" }} aria-label="WhatsApp">
                        <WhatsAppIcon className="w-3.5 h-3.5" />
                      </a>
                      <a href={`tel:${toE164Display(ownerPhone)}`} className="p-1 rounded-full" style={{ color: "var(--kk-ink-faint)" }} aria-label="Call">
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ) : null}
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
            <div className="rounded-xl p-3 space-y-3" style={{ background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.20)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#1F8B4C" }}>Tenant details</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[11px]" style={{ color: "#1F8B4C" }}>Tenant name</label>
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="w-full text-[13px] font-medium rounded-lg px-2.5 py-1.5 outline-none"
                    style={{ background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.25)", color: "var(--kk-ink)" }}
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[11px]" style={{ color: "#1F8B4C" }}>Tenant phone</label>
                  <input
                    type="tel"
                    value={tenantPhone}
                    onChange={(e) => setTenantPhone(e.target.value)}
                    className="w-full text-[13px] rounded-lg px-2.5 py-1.5 outline-none"
                    style={{ background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.25)", color: "var(--kk-ink)" }}
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[11px]" style={{ color: "#1F8B4C" }}>Contract start</label>
                  <DateInput
                    value={contractStart}
                    onChange={setContractStart}
                    className="w-full text-[13px] rounded-lg px-2.5 py-1.5 outline-none"
                    style={{ background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.25)", color: "var(--kk-ink)", fontSize: 16 }}
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[11px]" style={{ color: "#1F8B4C" }}>Duration (months)</label>
                  <input
                    type="number"
                    value={contractDuration}
                    onChange={(e) => setContractDuration(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="12"
                    className="w-full text-[13px] rounded-lg px-2.5 py-1.5 outline-none"
                    style={{ background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.25)", color: "var(--kk-ink)" }}
                  />
                </div>
                <div className="space-y-0.5 col-span-2">
                  <label className="text-[11px]" style={{ color: "#1F8B4C" }}>Monthly rent (RM)</label>
                  <MoneyInput
                    value={tenancyAmount}
                    onChange={setTenancyAmount}
                    placeholder="e.g. 1,500"
                    className="w-full text-[13px] rounded-lg px-2.5 py-1.5 outline-none"
                    style={{ background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.25)", color: "var(--kk-ink)" } as React.CSSProperties}
                  />
                </div>
                {tenantInfo.contract_end && (
                  <p className="col-span-2 text-[11px]" style={{ color: "#1F8B4C" }}>
                    Contract ends: {tenantInfo.contract_end}
                    {contractDuration && contractStart
                      ? ` (will recalculate from start + ${contractDuration} months on save)`
                      : ""}
                  </p>
                )}
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
            <Field label="Property name" value={propertyName} onChange={setPropertyName} placeholder="e.g. Residensi Mutiara" full required />
            <Field label="Unit" value={unit} onChange={setUnit} placeholder="e.g. A-12" />
            <Field label="Expected rent (RM/mo)" value={expectedRent} onChange={setExpectedRent} placeholder="e.g. 1,800" money required />
            <BedroomPicker value={bedrooms} onChange={setBedrooms} required />
            <Field label="Bathrooms" value={bathrooms} onChange={(v) => setBathrooms(String(Math.max(0, Number(v))))} placeholder="e.g. 2" type="number" required />
            <Field label="Parking" value={parking} onChange={setParking} placeholder="e.g. A142" />
            <Field label="Available from" value={availableFrom} onChange={setAvailableFrom} type="date" full required highlight={lead.stage === "listed" && !availableFrom} />
          </div>

          {/* Rent / Sale purpose — multi-select */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Purpose (tap to toggle, both allowed)</label>
            <div className="flex gap-2">
              {(["rent", "sell"] as const).map((v) => {
                const active = listingPurpose === v || listingPurpose === "both";
                return (
                  <button key={v} type="button"
                    onClick={() => setListingPurpose((cur) => {
                      if (cur === "both") return v === "rent" ? "sell" : "rent";
                      if (cur === v) return null;
                      if (cur === null) return v;
                      return "both";
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
                  <input ref={photoInputRef} type="file" accept="image/*" multiple className="sr-only" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                </label>
              )}
            </div>
          </div>

          {/* Tenancy agreement */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
            <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid var(--kk-line)", background: "var(--kk-surface-2)" }}>
              <FileText className="w-3.5 h-3.5" style={{ color: "var(--kk-ink-faint)" }} />
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--kk-ink-mute)" }}>Tenancy agreement</p>
              <span className="ml-auto text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>{agreementUrls.length}/3</span>
            </div>
            <div className="px-3 py-2 space-y-1">
              {agreementUrls.map((url, i) => (
                <div key={url} className="flex items-center gap-2 py-1.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--kk-green-soft)" }}>
                    <FileText className="w-3.5 h-3.5" style={{ color: "var(--kk-green)" }} />
                  </div>
                  <p className="flex-1 text-[13px] font-medium truncate min-w-0" style={{ color: "var(--kk-ink)" }} title={getDocumentName(url)}>{getDocumentName(url)}</p>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="kk-pill kk-pill-ghost shrink-0" style={{ padding: "0.25rem 0.6rem", fontSize: 12 }}>View</a>
                  <button type="button" onClick={() => handleRemoveAgreementFile(i)} className="p-1.5 rounded-lg" style={{ color: "var(--kk-ink-faint)" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {agreementUrls.length < 3 && (
                <div className="py-2 flex flex-col items-center gap-1">
                  <label className="kk-pill kk-pill-ghost cursor-pointer flex items-center gap-1.5">
                    {uploadingAgreement ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {agreementUrls.length === 0 ? "Upload document" : "Add document"}
                    <input ref={agreementInputRef} type="file" className="sr-only" onChange={handleAgreementUpload} disabled={uploadingAgreement} />
                  </label>
                  <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>PDF, image, or any file — max 20 MB</p>
                </div>
              )}
            </div>
          </div>

          {confirmDelete ? (
            <div className="flex items-center gap-2 pt-1 rounded-xl px-3 py-2" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
              <p className="flex-1 text-[12px] font-medium" style={{ color: "#DC2626" }}>Moved to bin — auto-deleted after 7 days</p>
              <button type="button" className="kk-pill kk-pill-ghost text-[12px]" onClick={() => setConfirmDelete(false)} disabled={pending}>Cancel</button>
              <button type="button" onClick={handleDelete} disabled={pending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                style={{ background: "#DC2626", color: "#fff" }}>
                {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                {pending ? "Moving…" : "Move to bin"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              {/* Row 1 — secondary actions */}
              <div className="flex items-center gap-2">
                {lead?.stage === "listed" && (
                  <button
                    type="button"
                    onClick={() => setCompetitorRentedOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors hover:bg-gray-100"
                    style={{ color: "var(--kk-ink-mute)", border: "1px solid var(--kk-line)" }}
                  >
                    <Building2 className="w-3 h-3" />
                    Lost listing
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCalendarOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors"
                  style={{ background: "rgba(0,113,227,0.07)", color: "var(--kk-blue)" }}
                >
                  <CalendarPlus className="w-3 h-3" />
                  + Calendar
                </button>
              </div>
              {/* Row 2 — primary actions */}
              <div className="flex items-center gap-2">
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
            </div>
          )}

          {lightboxUrl && <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
        </div>
      </DialogContent>

      {lead && (
        <>
          <CalendarEventDialog
            open={calendarOpen}
            onOpenChange={setCalendarOpen}
            defaultTitle={[lead.owner_name, propertyName].filter(Boolean).join(" · ") || [propertyName, unit ? `Unit ${unit}` : null].filter(Boolean).join(" · ") || ""}
            subtitle={[propertyName, unit ? `Unit ${unit}` : null].filter(Boolean).join(" · ") || undefined}
            cardHref={`/my-listing?highlight=${lead.id}`}
            contextLabel={[lead.owner_name, propertyName].filter(Boolean).join(" · ") || undefined}
            ownerLeadId={lead.id}
            defaultOwnerName={lead.owner_name ?? ""}
            defaultOwnerPhone={lead.owner_phone ?? ""}
          />
          <CompetitorRentedDialog
            lead={lead}
            open={competitorRentedOpen}
            onOpenChange={setCompetitorRentedOpen}
            onSuccess={() => onOpenChange(false)}
          />
        </>
      )}
    </Dialog>
  );
}

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
export function getDocumentName(url: string): string {
  const part = decodeURIComponent(url.split('/').pop() ?? '');
  return part.replace(/^\d{13}-/, '') || 'Document';
}

function Field({ label, value, onChange, placeholder, type = "text", full, money, highlight, required }: {
  label: string; value: string; onChange: (s: string) => void; placeholder?: string; type?: string; full?: boolean; money?: boolean; highlight?: boolean; required?: boolean;
}) {
  const cls = "w-full text-[14px] px-3 py-2 rounded-xl";
  const sty = highlight
    ? { background: "rgba(255,149,0,0.06)", border: "1.5px solid rgba(255,149,0,0.45)", color: "var(--kk-ink)" }
    : { background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" };
  return (
    <div className={`space-y-1.5 ${full ? "col-span-2" : ""}`}>
      <label className="text-[13px] font-medium" style={{ color: highlight ? "#B45309" : "var(--kk-ink-soft)" }}>
        {label}{required && <span style={{ color: "var(--kk-red)" }}> *</span>}
      </label>
      {money
        ? <MoneyInput value={value} onChange={onChange} placeholder={placeholder} className={cls} style={sty} />
        : type === "date"
        ? <DateInput value={value} onChange={onChange} className={cls} style={sty} />
        : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} onWheel={type === "number" ? (e) => e.currentTarget.blur() : undefined} placeholder={placeholder} className={cls} style={sty} />
      }
    </div>
  );
}

const BEDROOM_OPTIONS = [
  { label: "Studio", value: "0" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5+", value: "5" },
];

export function BedroomPicker({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>
        Bedrooms{required && <span style={{ color: "var(--kk-red)" }}> *</span>}
      </label>
      <div className="flex gap-1 flex-wrap">
        {BEDROOM_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(value === opt.value ? "" : opt.value)}
            className="px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors"
            style={{
              background: value === opt.value ? "var(--kk-ink)" : "var(--kk-surface-2)",
              color: value === opt.value ? "#fff" : "var(--kk-ink-mute)",
              border: `1px solid ${value === opt.value ? "var(--kk-ink)" : "var(--kk-line)"}`,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
