"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/ui/money-input";
import { DateInput } from "@/components/ui/date-input";
import { Tenancy, daysUntil } from "@/lib/types";
import { updateTenancyContract, updateTenancyBasicInfo, setReplyChip, updateOwnerLeadDetails, saveAgreementUrl, removeTenancy } from "@/lib/actions";
import { Building2, X, FileSignature, Loader2, Pencil, ImagePlus, FileText, Upload, Trash2, Star, Phone, CalendarPlus } from "lucide-react";
import { normalizePhone, toE164Display } from "@/lib/phone";
import { BedroomPicker, getDocumentName } from "@/components/edit-owner-lead-dialog";
import { CalendarEventDialog } from "@/components/calendar-event-dialog";

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
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { ReplyState } from "@/lib/types";
import { toast } from "sonner";
import { usePhotoUpload } from "@/hooks/use-photo-upload";

interface Props {
  tenancy: Tenancy | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (updated: Partial<Tenancy>) => void;
}

function computeEnd(start: string, months: number): string {
  const [y, m, d] = start.split("-").map(Number);
  let end: Date;
  if (d === 1) {
    end = new Date(y, m - 1 + months, 0);
  } else {
    const anniversary = new Date(y, m - 1 + months, d);
    end = new Date(anniversary.getTime() - 86400000);
  }
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
}

export function TenancyDetailDialog({ tenancy: tenancyProp, open, onOpenChange, onUpdated: onUpdatedExternal }: Props) {
  const [tenancy, setTenancy] = useState<Tenancy | null>(tenancyProp);
  useEffect(() => { setTenancy(tenancyProp); }, [tenancyProp]);

  if (!tenancy) return null;

  function handleUpdated(updated: Partial<Tenancy>) {
    setTenancy((prev) => prev ? { ...prev, ...updated } : prev);
    onUpdatedExternal?.(updated);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="bg-card border-border max-w-md p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <TenancyForm
          tenancy={tenancy}
          onClose={() => onOpenChange(false)}
          onUpdated={handleUpdated}
        />
      </DialogContent>
    </Dialog>
  );
}

function TenancyForm({
  tenancy,
  onClose,
  onUpdated,
}: {
  tenancy: Tenancy;
  onClose: () => void;
  onUpdated: (updated: Partial<Tenancy>) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { photos, coverIndex, uploading: uploadingPhoto, inputRef: photoInputRef, reset: resetPhotos,
          handleUpload: handlePhotoUpload, handleRemove: handleRemovePhoto, handleSetCover } =
    usePhotoUpload(tenancy.owner_lead_id ?? "", tenancy.property?.photo_urls ?? [], tenancy.property?.cover_photo_index ?? 0);
  const [agreementUrls, setAgreementUrls] = useState<string[]>(parseAgreementUrls(tenancy.agreement_url ?? null));
  const [uploadingAgreement, setUploadingAgreement] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const agreementInputRef = useRef<HTMLInputElement>(null);

  // Owner info (editable but locked behind pencil)
  const [ownerName, setOwnerName] = useState(tenancy.property?.owner_name ?? "");
  const [ownerPhone, setOwnerPhone] = useState(tenancy.property?.owner_phone ?? "");
  const [editingOwner, setEditingOwner] = useState(false);

  // Property specs (bedrooms/bathrooms live on owner_leads)
  const [bedrooms, setBedrooms] = useState(tenancy.property?.bedrooms != null ? String(tenancy.property.bedrooms) : "");
  const [bathrooms, setBathrooms] = useState(tenancy.property?.bathrooms != null ? String(tenancy.property.bathrooms) : "");

  // Property name and unit (always editable)
  const [propertyName, setPropertyName] = useState(tenancy.property_name ?? "");
  const [unit, setUnit] = useState(tenancy.property?.unit ?? "");

  // Basic info fields — prefer proposed values from owner form if available
  const [tenantName, setTenantName] = useState(tenancy.tenant_name ?? "");
  const [tenantPhone, setTenantPhone] = useState(tenancy.tenant_phone ?? "");
  const [amount, setAmount] = useState((tenancy.renewal_proposed_rent ?? tenancy.amount)?.toString() ?? "");

  // Reply chips
  const [repliedTenant, setRepliedTenant] = useState<ReplyState>(tenancy.replied_tenant ?? "pending");
  const [repliedOwner, setRepliedOwner] = useState<ReplyState>(tenancy.replied_owner ?? "pending");

  // Contract fields — prefer proposed values from owner form if available
  const [contractStart, setContractStart] = useState(tenancy.renewal_proposed_start ?? tenancy.contract_start ?? "");
  const [contractDuration, setContractDuration] = useState(
    (tenancy.renewal_proposed_months ?? tenancy.contract_duration_months)?.toString() ?? ""
  );
  const [contractEnd, setContractEnd] = useState(() => {
    const s = tenancy.renewal_proposed_start ?? tenancy.contract_start;
    const mo = tenancy.renewal_proposed_months ?? tenancy.contract_duration_months;
    if (s && mo) return computeEnd(s, mo);
    return tenancy.contract_end ?? "";
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Sync on tenancy change (different record opened)
  useEffect(() => {
    setLightboxUrl(null);
    resetPhotos(tenancy.property?.photo_urls ?? [], tenancy.property?.cover_photo_index ?? 0);
    setAgreementUrls(parseAgreementUrls(tenancy.agreement_url ?? null));
    setOwnerName(tenancy.property?.owner_name ?? "");
    setOwnerPhone(tenancy.property?.owner_phone ?? "");
    setEditingOwner(false);
    setPropertyName(tenancy.property_name ?? "");
    setUnit(tenancy.property?.unit ?? "");
    setBedrooms(tenancy.property?.bedrooms != null ? String(tenancy.property.bedrooms) : "");
    setBathrooms(tenancy.property?.bathrooms != null ? String(tenancy.property.bathrooms) : "");
    setTenantName(tenancy.tenant_name ?? "");
    setTenantPhone(tenancy.tenant_phone ?? "");
    setAmount((tenancy.renewal_proposed_rent ?? tenancy.amount)?.toString() ?? "");
    setRepliedTenant(tenancy.replied_tenant ?? "pending");
    setRepliedOwner(tenancy.replied_owner ?? "pending");
    setContractStart(tenancy.renewal_proposed_start ?? tenancy.contract_start ?? "");
    setContractDuration((tenancy.renewal_proposed_months ?? tenancy.contract_duration_months)?.toString() ?? "");
    const s = tenancy.renewal_proposed_start ?? tenancy.contract_start;
    const mo = tenancy.renewal_proposed_months ?? tenancy.contract_duration_months;
    setContractEnd(s && mo ? computeEnd(s, mo) : (tenancy.contract_end ?? ""));
  }, [tenancy.id]);

  function recomputeEnd(s: string, d: string) {
    if (!s || !d) return;
    setContractEnd(computeEnd(s, parseInt(d, 10)));
  }

  function recomputeDuration(s: string, e: string) {
    if (!s || !e) return;
    const start = new Date(s);
    const end = new Date(e);
    const months = Math.round((end.getTime() - start.getTime()) / (30.4375 * 86400000));
    if (months > 0) setContractDuration(String(months));
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
      const updated = [...agreementUrls, url];
      setAgreementUrls(updated);
      await saveAgreementUrl(tenancy.id, serializeAgreementUrls(updated));
      toast.success("Document saved");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingAgreement(false);
      if (agreementInputRef.current) agreementInputRef.current.value = "";
    }
  }

  async function handleRemoveAgreementFile(index: number) {
    const updated = agreementUrls.filter((_, i) => i !== index);
    setAgreementUrls(updated);
    await saveAgreementUrl(tenancy.id, serializeAgreementUrls(updated));
    toast.success("Document removed");
  }

  function handleSave() {
    startTransition(async () => {
      const saves: Promise<{ ok: boolean; message: string }>[] = [
        updateTenancyBasicInfo(tenancy.id, {
          tenant_name: tenantName || undefined,
          tenant_phone: tenantPhone || undefined,
          amount: amount ? parseFloat(amount) : undefined,
        }),
        updateTenancyContract(tenancy.id, {
          contract_start: contractStart || undefined,
          contract_end: contractEnd || undefined,
          contract_duration_months: contractDuration ? parseInt(contractDuration, 10) : undefined,
          amount: amount ? parseFloat(amount) : undefined,
        }),
      ];
      // Save reply chips only if they changed
      if (repliedTenant !== (tenancy.replied_tenant ?? "pending")) {
        saves.push(setReplyChip(tenancy.id, "tenant", repliedTenant).then(() => ({ ok: true, message: "" })));
      }
      if (repliedOwner !== (tenancy.replied_owner ?? "pending")) {
        saves.push(setReplyChip(tenancy.id, "owner", repliedOwner).then(() => ({ ok: true, message: "" })));
      }
      // Save owner name/phone/property name/bed/bath if owner_lead_id is available
      let ownerSaved = false;
      if (tenancy.owner_lead_id) {
        const ownerUpdates: Parameters<typeof updateOwnerLeadDetails>[1] = {};
        if (editingOwner) {
          ownerUpdates.owner_name = ownerName || undefined;
          ownerUpdates.owner_phone = ownerPhone || undefined;
        }
        if (propertyName !== (tenancy.property_name ?? "")) {
          ownerUpdates.property_name = propertyName || undefined;
        }
        if (unit !== (tenancy.property?.unit ?? "")) {
          ownerUpdates.unit = unit || undefined;
        }
        const bedroomsNum = bedrooms ? parseInt(bedrooms, 10) : null;
        const bathroomsNum = bathrooms ? parseInt(bathrooms, 10) : null;
        if (bedroomsNum !== (tenancy.property?.bedrooms ?? null)) ownerUpdates.bedrooms = bedroomsNum ?? undefined;
        if (bathroomsNum !== (tenancy.property?.bathrooms ?? null)) ownerUpdates.bathrooms = bathroomsNum ?? undefined;
        if (Object.keys(ownerUpdates).length > 0) {
          try {
            await updateOwnerLeadDetails(tenancy.owner_lead_id, ownerUpdates);
            ownerSaved = true;
          } catch {
            toast.error("Could not save owner details");
            return;
          }
        }
      }
      const results = await Promise.all(saves);
      const failed = results.find((r) => !r.ok);
      if (!failed) {
        toast.success("Tenancy updated");
        onUpdated({
          tenant_name: tenantName,
          tenant_phone: tenantPhone,
          amount: amount ? parseFloat(amount) : tenancy.amount,
          contract_start: contractStart || null,
          contract_end: contractEnd || null,
          contract_duration_months: contractDuration ? parseInt(contractDuration, 10) : null,
          renewal_proposed_months: null,
          replied_tenant: repliedTenant,
          replied_owner: repliedOwner,
          property_name: propertyName || tenancy.property_name,
          // Propagate owner field changes so the card updates without a page reload
          property: ownerSaved && editingOwner ? {
            ...tenancy.property,
            owner_name: ownerName || tenancy.property?.owner_name,
            owner_phone: ownerPhone || tenancy.property?.owner_phone,
          } : tenancy.property,
        });
        onClose();
      } else {
        toast.error(failed.message || "Could not save changes");
      }
    });
  }

  return (
    <div className="overflow-y-auto flex-1 space-y-5 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="kk-overline mb-2">Edit tenancy</p>
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
                onBlur={(e) => setOwnerPhone(normalizePhone(e.target.value))}
                placeholder="Phone (with country code)"
                className="w-full text-[12px] bg-transparent outline-none border-b pb-0.5"
                style={{ color: "var(--kk-ink-faint)", borderColor: "var(--kk-line)" }}
              />
              <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>For overseas numbers, include the country code, e.g. +44 7911 123456</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-[18px] font-semibold leading-tight" style={{ color: "var(--kk-ink)", letterSpacing: "-0.014em" }}>
                  {ownerName || tenancy.tenant_name}
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
              {(ownerPhone || tenancy.tenant_phone) ? (
                <div className="flex items-center gap-0.5 mt-1">
                  <p className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>
                    {ownerPhone || tenancy.tenant_phone}
                  </p>
                  <a href={`https://wa.me/${(ownerPhone || tenancy.tenant_phone || "").replace(/\D/g, "").replace(/^0/, "60")}`} target="_blank" rel="noopener" className="p-1 rounded-full" style={{ color: "#25D366" }} aria-label="WhatsApp">
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                  </a>
                  <a href={`tel:${toE164Display(ownerPhone || tenancy.tenant_phone || "")}`} className="p-1 rounded-full" style={{ color: "var(--kk-ink-faint)" }} aria-label="Call">
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
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Property name + unit (editable) */}
      <div className="flex gap-2">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl flex-1 min-w-0" style={{ background: "var(--kk-surface-2)" }}>
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
        <input
          type="text"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Unit"
          className="text-[13px] px-3 py-2 rounded-xl outline-none"
          style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)", width: 80, flexShrink: 0 }}
        />
      </div>

      {/* Editable fields */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tenant name" value={tenantName} onChange={setTenantName} placeholder="e.g. Ahmad Farid" full />
        <div className="space-y-1.5 col-span-2">
          <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Phone (with country code)</label>
          <div className="flex items-center gap-1">
            <input type="text" value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} onBlur={(e) => setTenantPhone(normalizePhone(e.target.value))} placeholder="e.g. 60123456789" className="flex-1 min-w-0 text-[14px] px-3 py-2 rounded-xl outline-none" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }} />
            {tenantPhone && (
              <>
                <a href={`https://wa.me/${tenantPhone.replace(/\D/g, "").replace(/^0/, "60")}`} target="_blank" rel="noopener" className="p-2 rounded-full shrink-0" style={{ color: "#25D366" }} aria-label="WhatsApp">
                  <WhatsAppIcon className="w-4 h-4" />
                </a>
                <a href={`tel:${toE164Display(tenantPhone)}`} className="p-2 rounded-full shrink-0" style={{ color: "var(--kk-ink-faint)" }} aria-label="Call">
                  <Phone className="w-4 h-4" />
                </a>
              </>
            )}
          </div>
          <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>For overseas numbers, include the country code, e.g. +44 7911 123456</p>
        </div>
        <Field label="Monthly rent (RM)" value={amount} onChange={setAmount} placeholder="e.g. 1,500" money />
        <div /> {/* spacer so rent stays left */}
        <BedroomPicker value={bedrooms} onChange={setBedrooms} />
        <Field label="Bathrooms" value={bathrooms} onChange={(v) => setBathrooms(String(Math.max(0, Number(v))))} placeholder="e.g. 2" />
        {tenancy.contract_end && (
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Days to expiry</label>
            <div className="text-[14px] px-3 py-2 rounded-xl" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink-mute)" }}>
              {(() => {
                const d = daysUntil(tenancy.contract_end!, new Date());
                return d < 0 ? `Expired ${Math.abs(d)}d ago` : d === 0 ? "Expires today" : `${d} days left`;
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Contract */}
      <div className="rounded-xl p-4 space-y-3" style={{ border: "1px solid var(--kk-line)" }}>
        <div className="flex items-center gap-2">
          <FileSignature className="w-3.5 h-3.5" style={{ color: "var(--kk-ink-faint)" }} />
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--kk-ink-mute)" }}>Contract</p>
          {tenancy.contract_end && (
            <ContractBadge contractEnd={contractEnd} />
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Start date</label>
            <DateInput
              value={contractStart}
              onChange={(v) => { setContractStart(v); recomputeEnd(v, contractDuration); }}
              className="w-full text-[13px] px-3 py-2 rounded-xl"
              style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Duration (months)</label>
            <input
              type="number"
              value={contractDuration}
              onChange={(e) => { setContractDuration(e.target.value); recomputeEnd(contractStart, e.target.value); }}
              placeholder="12"
              className="w-full text-[13px] px-3 py-2 rounded-xl"
              style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <label className="text-[12px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>End date</label>
            <DateInput
              value={contractEnd}
              onChange={(v) => { setContractEnd(v); recomputeDuration(contractStart, v); }}
              className="w-full text-[13px] px-3 py-2 rounded-xl"
              style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
            />
          </div>
        </div>

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
              className="flex items-center justify-center rounded-lg cursor-pointer transition-colors"
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
              <button type="button" onClick={() => handleRemoveAgreementFile(i)} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--kk-ink-faint)" }}>
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

      {/* Save / Cancel / Delete */}
      {confirmDelete ? (
        <div className="flex items-center gap-2 pt-1 rounded-xl px-3 py-2" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
          <p className="flex-1 text-[12px] font-medium" style={{ color: "#DC2626" }}>Moved to bin — auto-deleted after 7 days</p>
          <button type="button" className="kk-pill kk-pill-ghost text-[12px]" onClick={() => setConfirmDelete(false)} disabled={pending}>Cancel</button>
          <button type="button" disabled={pending}
            onClick={() => startTransition(async () => { await removeTenancy(tenancy.id); onClose(); })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
            style={{ background: "#DC2626", color: "#fff" }}>
            {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            {pending ? "Moving…" : "Move to bin"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors hover:bg-red-50"
              style={{ color: "var(--kk-ink-faint)" }}>
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
            <div className="flex-1" />
            <button type="button" className="kk-pill kk-pill-ghost" onClick={onClose} disabled={pending}>Cancel</button>
            <button type="button" className="kk-pill kk-pill-primary" onClick={handleSave} disabled={pending}>
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {pending ? "Saving…" : "Save details"}
            </button>
          </div>
        </div>
      )}

      {lightboxUrl && <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      <CalendarEventDialog
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        defaultTitle={[tenancy.tenant_name, propertyName].filter(Boolean).join(" · ") || propertyName || ""}
        subtitle={propertyName || undefined}
        cardHref={`/existing-listing?highlight=${tenancy.id}`}
        contextLabel={[tenancy.tenant_name, propertyName].filter(Boolean).join(" · ") || undefined}
        tenancyId={tenancy.id}
      />
    </div>
  );
}

function ContractBadge({ contractEnd }: { contractEnd: string }) {
  const today = new Date();
  const days = daysUntil(contractEnd, today);
  const bucket: string = days < 0 ? "expired" : days <= 30 ? "expiring_30" : days <= 60 ? "expiring_60" : "active";
  const tone: Record<string, { bg: string; ink: string; text: string }> = {
    expired:     { bg: "var(--kk-surface-2)", ink: "var(--kk-ink-mute)", text: `Expired ${Math.abs(days)}d ago` },
    expiring_30: { bg: "var(--kk-red-soft)",  ink: "#C62828",            text: days === 0 ? "Expires today" : `${days}d left` },
    expiring_60: { bg: "var(--kk-amber-soft)", ink: "#B45309",           text: `${days}d left` },
    active:      { bg: "var(--kk-green-soft)", ink: "#1F8B4C",           text: `${days}d left` },
    no_contract: { bg: "var(--kk-surface-2)",  ink: "var(--kk-ink-faint)", text: "" },
  };
  const style = tone[bucket];
  if (!style.text) return null;
  return (
    <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: style.bg, color: style.ink }}>
      {style.text}
    </span>
  );
}


const REPLY_VALUES: ReplyState[] = ["pending", "yes", "no"];

function ReplyChipButton({ who, state, onLocalChange }: {
  who: "tenant" | "owner"; state: ReplyState; onLocalChange: (s: ReplyState) => void;
}) {
  function select(v: ReplyState) {
    if (v === state) return;
    onLocalChange(v);
  }
  return (
    <div className="flex-1 flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--kk-ink-mute)" }}>
        {who === "tenant" ? "Tenant" : "Owner"}
      </span>
      <div className="flex gap-1">
        {REPLY_VALUES.map((v) => {
          const isActive = state === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => select(v)}
              className="flex-1 text-[12px] font-semibold px-2 py-1.5 rounded-full transition-colors"
              style={{
                background: isActive ? "var(--kk-ink)" : "var(--kk-surface)",
                color: isActive ? "#fff" : "var(--kk-ink-faint)",
              }}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", full, money }: {
  label: string; value: string; onChange: (s: string) => void; placeholder?: string; type?: string; full?: boolean; money?: boolean;
}) {
  const cls = "w-full text-[14px] px-3 py-2 rounded-xl";
  const sty = { background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" };
  return (
    <div className={`space-y-1.5 ${full ? "col-span-2" : ""}`}>
      <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>{label}</label>
      {money
        ? <MoneyInput value={value} onChange={onChange} placeholder={placeholder} className={cls} style={sty} />
        : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} style={sty} />
      }
    </div>
  );
}
