"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/ui/money-input";
import { Tenancy, computeContractBucket, daysUntil } from "@/lib/types";
import { buildExpiryPingTenant, buildExpiryPingOwner, updateTenancyContract, updateTenancyBasicInfo, setReplyChip, updateOwnerLeadDetails, saveAgreementUrl } from "@/lib/actions";
import { Building2, X, FileSignature, Loader2, Pencil, ImagePlus, FileText, Upload, Trash2 } from "lucide-react";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { ReplyState } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  tenancy: Tenancy | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TenancyDetailDialog({ tenancy: tenancyProp, open, onOpenChange }: Props) {
  const [tenancy, setTenancy] = useState<Tenancy | null>(tenancyProp);
  useEffect(() => { setTenancy(tenancyProp); }, [tenancyProp]);

  if (!tenancy) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="bg-card border-border max-w-md p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <TenancyForm
          tenancy={tenancy}
          onClose={() => onOpenChange(false)}
          onUpdated={(updated) => setTenancy((prev) => prev ? { ...prev, ...updated } : prev)}
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
  const [photos, setPhotos] = useState<string[]>(tenancy.property?.photo_urls ?? []);
  const [agreementUrl, setAgreementUrl] = useState<string | null>(tenancy.agreement_url ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingAgreement, setUploadingAgreement] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const agreementInputRef = useRef<HTMLInputElement>(null);

  // Owner info (editable but locked behind pencil)
  const [ownerName, setOwnerName] = useState(tenancy.property?.owner_name ?? "");
  const [ownerPhone, setOwnerPhone] = useState(tenancy.property?.owner_phone ?? "");
  const [editingOwner, setEditingOwner] = useState(false);

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
    if (tenancy.renewal_proposed_start && tenancy.renewal_proposed_months) {
      const d = new Date(tenancy.renewal_proposed_start);
      d.setMonth(d.getMonth() + tenancy.renewal_proposed_months);
      return d.toISOString().slice(0, 10);
    }
    return tenancy.contract_end ?? "";
  });

  // Sync on tenancy change (different record opened)
  useEffect(() => {
    setPhotos(tenancy.property?.photo_urls ?? []);
    setAgreementUrl(tenancy.agreement_url ?? null);
    setOwnerName(tenancy.property?.owner_name ?? "");
    setOwnerPhone(tenancy.property?.owner_phone ?? "");
    setEditingOwner(false);
    setTenantName(tenancy.tenant_name ?? "");
    setTenantPhone(tenancy.tenant_phone ?? "");
    setAmount((tenancy.renewal_proposed_rent ?? tenancy.amount)?.toString() ?? "");
    setRepliedTenant(tenancy.replied_tenant ?? "pending");
    setRepliedOwner(tenancy.replied_owner ?? "pending");
    setContractStart(tenancy.renewal_proposed_start ?? tenancy.contract_start ?? "");
    setContractDuration((tenancy.renewal_proposed_months ?? tenancy.contract_duration_months)?.toString() ?? "");
    if (tenancy.renewal_proposed_start && tenancy.renewal_proposed_months) {
      const d = new Date(tenancy.renewal_proposed_start);
      d.setMonth(d.getMonth() + tenancy.renewal_proposed_months);
      setContractEnd(d.toISOString().slice(0, 10));
    } else {
      setContractEnd(tenancy.contract_end ?? "");
    }
  }, [tenancy.id]);

  function recomputeEnd(s: string, d: string) {
    if (!s || !d) return;
    const [y, m, day] = s.split("-").map(Number);
    const endDate = new Date(y, m - 1 + parseInt(d, 10), day);
    setContractEnd(`${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`);
  }

  function recomputeDuration(s: string, e: string) {
    if (!s || !e) return;
    const start = new Date(s);
    const end = new Date(e);
    const months = Math.round((end.getTime() - start.getTime()) / (30.4375 * 86400000));
    if (months > 0) setContractDuration(String(months));
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || photos.length >= 4) return;
    setUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/document", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Upload failed"); return; }
      const next = [...photos, data.url as string];
      setPhotos(next);
      await fetch(`/api/properties/${tenancy.property_id}/photos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: next }),
      });
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  async function handleRemovePhoto(idx: number) {
    const next = photos.filter((_, i) => i !== idx);
    setPhotos(next);
    await fetch(`/api/properties/${tenancy.property_id}/photos`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: next }),
    });
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
      await saveAgreementUrl(tenancy.id, url);
      toast.success("Agreement saved");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingAgreement(false);
      if (agreementInputRef.current) agreementInputRef.current.value = "";
    }
  }

  async function handleRemoveAgreement() {
    setAgreementUrl(null);
    await saveAgreementUrl(tenancy.id, null);
    toast.success("Agreement removed");
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
      // Save owner name/phone if edited and owner_lead_id is available
      if (editingOwner && tenancy.owner_lead_id) {
        await updateOwnerLeadDetails(tenancy.owner_lead_id, { owner_name: ownerName || undefined, owner_phone: ownerPhone || undefined });
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
          replied_tenant: repliedTenant,
          replied_owner: repliedOwner,
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
                placeholder="Phone (with country code)"
                className="w-full text-[12px] bg-transparent outline-none border-b pb-0.5"
                style={{ color: "var(--kk-ink-faint)", borderColor: "var(--kk-line)" }}
              />
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
              <p className="text-[12px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>
                {ownerPhone ? `+${ownerPhone}` : tenancy.tenant_phone ? `+${tenancy.tenant_phone}` : ""}
              </p>
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

      {/* Property + owner (display only — linked record) */}
      <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: "var(--kk-surface-2)" }}>
        <Building2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--kk-ink-faint)" }} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium break-words" style={{ color: "var(--kk-ink)" }}>{tenancy.property_name}</p>
          {tenancy.property?.address && (
            <p className="text-[12px] mt-0.5 break-words" style={{ color: "var(--kk-ink-faint)" }}>{tenancy.property.address}</p>
          )}
        </div>
      </div>

      {/* Editable fields */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tenant name" value={tenantName} onChange={setTenantName} placeholder="e.g. Ahmad Farid" full />
        <Field label="Phone (with country code)" value={tenantPhone} onChange={setTenantPhone} placeholder="e.g. 60123456789" full />
        <Field label="Monthly rent (RM)" value={amount} onChange={setAmount} placeholder="e.g. 1,500" money />
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
            <input
              type="date"
              value={contractStart}
              onChange={(e) => { setContractStart(e.target.value); recomputeEnd(e.target.value, contractDuration); }}
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
            <input
              type="date"
              value={contractEnd}
              onChange={(e) => { setContractEnd(e.target.value); recomputeDuration(contractStart, e.target.value); }}
              className="w-full text-[13px] px-3 py-2 rounded-xl"
              style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
            />
          </div>
        </div>

        {/* WhatsApp pings */}
        {tenancy.contract_end && (
          <PingButtons tenancy={tenancy} />
        )}
      </div>

      {/* Property photos */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid var(--kk-line)", background: "var(--kk-surface-2)" }}>
          <ImagePlus className="w-3.5 h-3.5" style={{ color: "var(--kk-ink-faint)" }} />
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--kk-ink-mute)" }}>Property photos</p>
          <span className="ml-auto text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>{photos.length}/4</span>
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
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemovePhoto(i); }}
                className="absolute top-1 right-1 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.55)" }}
              >
                <Trash2 className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
          {photos.length < 4 && (
            <label
              className="flex items-center justify-center rounded-lg cursor-pointer transition-colors"
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
            <a
              href={agreementUrl} target="_blank" rel="noopener noreferrer"
              className="kk-pill kk-pill-ghost shrink-0"
              style={{ padding: "0.3rem 0.75rem", fontSize: 12 }}
            >
              View
            </a>
            <label className="kk-pill kk-pill-ghost shrink-0 cursor-pointer" style={{ padding: "0.3rem 0.75rem", fontSize: 12 }}>
              {uploadingAgreement ? <Loader2 className="w-3 h-3 animate-spin" /> : "Replace"}
              <input ref={agreementInputRef} type="file" accept="image/*,application/pdf" className="sr-only" onChange={handleAgreementUpload} disabled={uploadingAgreement} />
            </label>
            <button type="button" onClick={handleRemoveAgreement} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--kk-ink-faint)" }}>
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

      {/* Save / Cancel */}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="kk-pill kk-pill-ghost" onClick={onClose} disabled={pending}>
          Cancel
        </button>
        <button type="button" className="kk-pill kk-pill-primary" onClick={handleSave} disabled={pending}>
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {pending ? "Saving…" : "Save details"}
        </button>
      </div>

      {lightboxUrl && <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
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

function PingButtons({ tenancy }: { tenancy: Tenancy }) {
  const [pending, startTransition] = useTransition();
  const bucket = computeContractBucket(tenancy, new Date());
  if (bucket === "active" || bucket === "no_contract") return null;

  function pingTenant() {
    startTransition(async () => {
      const res = await buildExpiryPingTenant(tenancy.id);
      if (!res) { toast.error("Cannot build message"); return; }
      window.open(res.url, "_blank", "noopener,noreferrer");
    });
  }
  function pingOwner() {
    startTransition(async () => {
      const res = await buildExpiryPingOwner(tenancy.id);
      if (!res) { toast.error("Cannot build message. Owner phone is missing."); return; }
      window.open(res.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <button onClick={pingTenant} disabled={pending} type="button" className="kk-pill kk-pill-ghost" style={{ padding: "0.35rem 0.75rem" }}>
        <WhatsAppIcon className="w-3.5 h-3.5" />
        Message tenant
      </button>
      <button onClick={pingOwner} disabled={pending} type="button" className="kk-pill kk-pill-ghost" style={{ padding: "0.35rem 0.75rem" }}>
        <WhatsAppIcon className="w-3.5 h-3.5" />
        Message owner
      </button>
    </div>
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
