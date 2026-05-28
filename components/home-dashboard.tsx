"use client";

import Link from "next/link";
import { useTransition, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Users, ArrowRight, CheckCircle, Home, Loader2, Camera } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { Tenancy, daysUntil } from "@/lib/types";
import type { OwnerLead } from "@/lib/types";
import { buildExpiryPingTenant, buildExpiryPingOwner, saveProfileDetails } from "@/lib/actions";
import { PhotoCropModal } from "@/components/photo-crop-modal";
import { toast } from "sonner";

interface Props {
  expiring: Tenancy[];
  agentName: string | null;
  leadsNeedingAttention: number;
  listedWithoutTenant: OwnerLead[];
  motivationPhotoUrl: string | null;
}

function greeting(name: string | null): string {
  const h = new Date().getHours();
  const time = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const firstName = name?.split(" ")[0] ?? null;
  return firstName ? `${time}, ${firstName}.` : `${time}.`;
}


function DaysChip({ days }: { days: number }) {
  const past  = days < 0;
  const red   = !past && days < 30;
  const label = past ? `${Math.abs(days)}d expired` : `${days}d left`;
  const color = past || red ? "#C03810" : "var(--kk-ink-faint)";
  return (
    <span
      className="text-[11px] tabular-nums px-2 py-0.5 rounded-full shrink-0"
      style={{
        background: past || red ? "rgba(192,56,16,0.1)" : "var(--kk-surface-2)",
        color,
        fontWeight: past || red ? 700 : 500,
      }}
    >
      {label}
    </span>
  );
}

function ExpiringRow({ t, days }: { t: Tenancy; days: number }) {
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState<"tenant" | "owner" | null>(null);
  const router = useRouter();

  function pingTenant(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading("tenant");
    startTransition(async () => {
      const res = await buildExpiryPingTenant(t.id);
      setLoading(null);
      if (!res) { toast.error("Cannot build message. Contract data is missing."); return; }
      window.open(res.url, "_blank", "noopener,noreferrer");
      toast.success(`Renewal check sent to ${t.tenant_name}`);
    });
  }

  function pingOwner(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading("owner");
    startTransition(async () => {
      const res = await buildExpiryPingOwner(t.id);
      setLoading(null);
      if (!res) { toast.error("Cannot build message. Owner phone is missing."); return; }
      window.open(res.url, "_blank", "noopener,noreferrer");
      toast.success(`Renewal check sent to ${t.property?.owner_name ?? "owner"}`);
    });
  }

  return (
    <div
      className="flex items-center gap-3 px-5 py-3.5 kk-card-hover cursor-pointer"
      style={{ borderTop: "1px solid var(--kk-line)", transition: "transform 200ms cubic-bezier(0.32,0.72,0,1), box-shadow 200ms ease" }}
      onClick={() => router.push(`/tenancies?highlight=${t.id}`)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-tight" style={{ color: "var(--kk-ink)" }}>
          {t.property?.owner_name ?? t.tenant_name}
        </p>
        <p className="text-[12px] mt-0.5 truncate" style={{ color: "var(--kk-ink-mute)" }}>
          {[t.property_name, t.property?.unit].filter(Boolean).join(", ") || t.tenant_name}
        </p>
      </div>
      <DaysChip days={days} />
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={pingTenant}
          disabled={loading !== null}
          title="Ask tenant if renewing"
          className="kk-dash-pill"
        >
          {loading === "tenant" ? <Loader2 className="w-3 h-3 animate-spin" /> : <WhatsAppIcon className="w-3 h-3" />}
          Tenant
        </button>
        <button
          onClick={pingOwner}
          disabled={loading !== null}
          title="Ask owner if continuing to rent out"
          className="kk-dash-pill"
        >
          {loading === "owner" ? <Loader2 className="w-3 h-3 animate-spin" /> : <WhatsAppIcon className="w-3 h-3" />}
          Owner
        </button>
      </div>
    </div>
  );
}

function formatAvailableDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function ListedRow({ lead }: { lead: OwnerLead }) {
  const availableDate = formatAvailableDate(lead.available_from);
  const router = useRouter();
  return (
    <div
      className="flex items-center gap-3 px-5 py-3.5 kk-card-hover cursor-pointer"
      style={{ borderTop: "1px solid var(--kk-line)", transition: "transform 200ms cubic-bezier(0.32,0.72,0,1), box-shadow 200ms ease" }}
      onClick={() => router.push(`/leads?highlight=${lead.id}`)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-tight" style={{ color: "var(--kk-ink)" }}>
          {lead.owner_name}
        </p>
        <p className="text-[12px] mt-0.5 truncate" style={{ color: "var(--kk-ink-mute)" }}>
          {[lead.property_name, lead.unit].filter(Boolean).join(", ") ||
            (lead.expected_rent ? `RM ${lead.expected_rent.toLocaleString()}/mo` : "No details yet")}
        </p>
      </div>
      {availableDate && (
        <span className="text-[11px] font-medium shrink-0 tabular-nums" style={{ color: "var(--kk-ink-faint)" }}>
          {availableDate}
        </span>
      )}
      <Link
        href={`/matching/${lead.id}`}
        onClick={(e) => e.stopPropagation()}
        className="kk-dash-pill shrink-0"
      >
        <Users className="w-3 h-3" />
        Build pack
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

function ColEmpty({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "var(--kk-green)" }} />
      <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>{message}</p>
    </div>
  );
}

function DashCol({ title, count, href, subtitle, children }: {
  title: string;
  count: number;
  href: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="kk-section overflow-hidden flex flex-col">
      {/* Header */}
      <div
        className="px-5 pt-5 pb-4 flex items-start justify-between gap-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--kk-line)" }}
      >
        <div>
          <div className="flex items-center gap-2">
            <p className="kk-overline">{title}</p>
            {count > 0 && (
              <span
                className="text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full"
                style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", border: "1px solid var(--kk-line)" }}
              >
                {count}
              </span>
            )}
          </div>
          <p className="text-[12px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>{subtitle}</p>
        </div>
        <Link
          href={href}
          className="text-[12px] font-semibold flex items-center gap-1 shrink-0 mt-0.5"
          style={{ color: "var(--kk-ink-mute)" }}
        >
          All <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}

function LeadsCol({ count }: { count: number }) {
  const router = useRouter();
  const [flashing, setFlashing] = useState(false);

  function followUp() {
    setFlashing(true);
    setTimeout(() => router.push("/leads"), 600);
  }

  return (
    <div className={`kk-section overflow-hidden flex flex-col self-start ${flashing ? "kk-flash-green" : ""}`}>
      {/* Header */}
      <div
        className="px-5 pt-5 pb-4 flex items-start justify-between gap-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--kk-line)" }}
      >
        <div>
          <div className="flex items-center gap-2">
            <p className="kk-overline">Leads</p>
            {count > 0 && (
              <span
                className="text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full"
                style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", border: "1px solid var(--kk-line)" }}
              >
                {count}
              </span>
            )}
          </div>
          <p className="text-[12px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>
            {count === 0 ? "All imported leads are listed" : `${count} imported ${count === 1 ? "lead" : "leads"} not yet listed`}
          </p>
        </div>
        <Link
          href="/leads"
          className="text-[12px] font-semibold flex items-center gap-1 shrink-0 mt-0.5"
          style={{ color: "var(--kk-ink-mute)" }}
        >
          All <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Body */}
      <div className="flex flex-col items-center justify-center px-6 py-6 gap-3">
        {count === 0 ? (
          <ColEmpty message="All imported leads have been listed." />
        ) : (
          <>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--kk-surface-2)" }}
            >
              <Home className="w-5 h-5" style={{ color: "var(--kk-ink-mute)" }} />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-semibold" style={{ color: "var(--kk-ink)" }}>
                {count} {count === 1 ? "lead" : "leads"} waiting
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>
                Imported or replied. Send the form and get them listed.
              </p>
            </div>
            <button
              onClick={followUp}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-semibold transition-opacity hover:opacity-80"
              style={{ background: "var(--kk-blue)", color: "#fff" }}
            >
              Follow-up now
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function MotivationPhotoStand({ initialSrc }: { initialSrc: string | null }) {
  const [src, setSrc] = useState<string | null>(initialSrc);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCropSrc(URL.createObjectURL(f));
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleCropDone(blob: Blob) {
    URL.revokeObjectURL(cropSrc!);
    setCropSrc(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", new File([blob], "motivation.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/upload/avatar", { method: "POST", body: form });
      if (!res.ok) { toast.error("Photo upload failed"); return; }
      const data = await res.json();
      setSrc(data.url);
      await saveProfileDetails({ motivation_photo_url: data.url });
    } finally {
      setUploading(false);
    }
  }

  function handleCropCancel() {
    URL.revokeObjectURL(cropSrc!);
    setCropSrc(null);
  }

  return (
    <>
    {cropSrc && (
      <PhotoCropModal
        src={cropSrc}
        aspectRatio={3 / 2}
        shape="rect"
        onDone={handleCropDone}
        onCancel={handleCropCancel}
      />
    )}
    <div className="h-full flex justify-end select-none">
      {/* Height fills the grid row; aspect-ratio 3:2 (landscape 4R) sets the width */}
      <button
        onClick={() => !uploading && inputRef.current?.click()}
        className="relative group h-full"
        style={{
          aspectRatio: "3/2",
          background: src ? "#f5f0ea" : "var(--kk-surface-2)",
          border: src ? "none" : "1.5px dashed var(--kk-line)",
          borderRadius: 3,
          boxShadow: src
            ? "0 0 0 8px #fff, 0 6px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.10)"
            : "none",
          overflow: "hidden",
          cursor: uploading ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title={src ? "Change photo" : "Add your source of energy and motivation"}
      >
        {src ? (
          <>
            <img
              src={src}
              alt="Source of motivation"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.45)" }}
            >
              <Camera className="w-4 h-4" style={{ color: "#fff" }} />
              <span className="text-[11px] font-medium" style={{ color: "#fff" }}>Change photo</span>
            </div>
          </>
        ) : uploading ? (
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--kk-ink-faint)" }} />
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <Camera className="w-5 h-5" style={{ color: "var(--kk-ink-faint)", opacity: 0.5 }} />
            <p className="text-[11px] leading-snug" style={{ color: "var(--kk-ink-faint)" }}>
              Source of energy<br />and motivation
            </p>
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
      />
    </div>
    </>
  );
}

export function HomeDashboard({ expiring, agentName, leadsNeedingAttention, listedWithoutTenant, motivationPhotoUrl }: Props) {
  const today = new Date();
  const sorted = expiring
    .filter((t) => t.contract_end)
    .map((t) => ({ t, days: daysUntil(t.contract_end!, today) }))
    .sort((a, b) => a.days - b.days);

  const subtitle = (sorted.length > 0 || listedWithoutTenant.length > 0 || leadsNeedingAttention > 0)
    ? "Here’s what needs your attention today."
    : "Everything’s on track. No urgent action needed today.";

  return (
    <div
      className="mx-auto max-w-[1440px] px-3 lg:px-5 py-8 lg:py-10 flex flex-col"
      style={{ height: "calc(100vh - 104px)" }}
    >

      {/* Header row: greeting (2 cols) + photo stand (1 col) side by side on desktop */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-5 mb-8 flex-shrink-0">
        <header className="lg:col-span-2">
          <p className="kk-overline mb-3">Today&apos;s priorities</p>
          <h1 className="serif kk-display" style={{ color: "var(--kk-ink)" }}>
            {greeting(agentName)}
          </h1>
          <p className="mt-3 kk-body-sm" style={{ color: "var(--kk-ink-mute)" }}>{subtitle}</p>
        </header>

        {/* Photo — desktop only, height = header row height, width auto from 4R ratio */}
        <div className="hidden lg:block h-full">
          <MotivationPhotoStand initialSrc={motivationPhotoUrl} />
        </div>
      </div>

      {/* 3 columns — flex-1 min-h-0 + grid-rows-1 makes the single row fill remaining height */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0" style={{ gridTemplateRows: "1fr" }}>

        {/* Contracts */}
        <DashCol
          title="Contracts"
          count={sorted.length}
          href="/tenancies"
          subtitle={
            sorted.length === 0
              ? "No contracts expiring soon"
              : `${sorted.length} expiring in the next 2 months`
          }
        >
          {sorted.length === 0
            ? <ColEmpty message="No contracts expiring in the next 2 months." />
            : sorted.map(({ t, days }) => <ExpiringRow key={t.id} t={t} days={days} />)
          }
        </DashCol>

        {/* Listings */}
        <DashCol
          title="Listings"
          count={listedWithoutTenant.length}
          href="/leads"
          subtitle={
            listedWithoutTenant.length === 0
              ? "No open listings right now"
              : `${listedWithoutTenant.length} ${listedWithoutTenant.length === 1 ? "property" : "properties"} waiting to be matched`
          }
        >
          {listedWithoutTenant.length === 0
            ? <ColEmpty message="No properties waiting to be matched." />
            : listedWithoutTenant.map((lead) => <ListedRow key={lead.id} lead={lead} />)
          }
        </DashCol>

        {/* Leads */}
        <LeadsCol count={leadsNeedingAttention} />

      </div>
    </div>
  );
}
