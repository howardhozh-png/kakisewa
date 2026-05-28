"use client";

import { useTransition } from "react";
import { Tenancy, computeContractBucket, daysUntil } from "@/lib/types";
import { buildExpiryPingTenant, buildExpiryPingOwner } from "@/lib/actions";
import { Calendar, ChevronRight } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { toast } from "sonner";

interface Props {
  tenancies: Tenancy[];
}

export function ExpiringSoonWidget({ tenancies }: Props) {
  const today = new Date();
  if (tenancies.length === 0) return null;

  const counts = {
    expired: 0, expiring_30: 0, expiring_60: 0,
  };
  tenancies.forEach((t) => {
    const b = computeContractBucket(t, today);
    if (b in counts) counts[b as keyof typeof counts]++;
  });

  return (
    <section className="kk-section p-6 lg:p-8 mb-12">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <p className="kk-overline mb-2">Contract lifecycle</p>
          <h2 className="kk-h2" style={{ color: "var(--kk-ink)" }}>
            Expiring soon. Follow up.
          </h2>
          <p className="kk-caption mt-2">
            {counts.expiring_30 > 0 && <ExpiryChip color="var(--kk-red)" label={`${counts.expiring_30} due in 30d`} />}
            {counts.expiring_60 > 0 && <ExpiryChip color="var(--kk-amber)" label={`${counts.expiring_60} due in 60d`} />}
            {counts.expired > 0 && <ExpiryChip color="var(--kk-ink-mute)" label={`${counts.expired} expired`} />}
          </p>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--kk-line)" }}>
        {tenancies.map((t, i) => (
          <ExpiringRow key={t.id} t={t} today={today} firstRow={i === 0} />
        ))}
      </div>
    </section>
  );
}

function ExpiryChip({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-medium mr-2"
      style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)" }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function ExpiringRow({ t, today, firstRow }: { t: Tenancy; today: Date; firstRow: boolean }) {
  const [pending, startTransition] = useTransition();
  const days = t.contract_end ? daysUntil(t.contract_end, today) : 0;
  const bucket = computeContractBucket(t, today);

  const bucketStyle: Record<string, { bg: string; ink: string; text: string }> = {
    expired:      { bg: "var(--kk-surface-2)", ink: "var(--kk-ink-mute)", text: `Expired ${Math.abs(days)}d ago` },
    expiring_30:  { bg: "var(--kk-red-soft)",  ink: "#C62828",            text: days === 0 ? "Expires today" : `${days}d left` },
    expiring_60:  { bg: "var(--kk-amber-soft)", ink: "#B45309",           text: `${days}d left` },
    active:       { bg: "var(--kk-green-soft)", ink: "#1F8B4C",           text: `${days}d left` },
    no_contract:  { bg: "var(--kk-surface-2)",  ink: "var(--kk-ink-faint)", text: "No contract on file" },
  };
  const style = bucketStyle[bucket];

  function pingTenant() {
    startTransition(async () => {
      const res = await buildExpiryPingTenant(t.id);
      if (!res) { toast.error("Cannot build message. Contract data is missing."); return; }
      window.open(res.url, "_blank", "noopener,noreferrer");
      toast.success(`Renewal check sent to ${t.tenant_name}`);
    });
  }

  function pingOwner() {
    startTransition(async () => {
      const res = await buildExpiryPingOwner(t.id);
      if (!res) { toast.error("Cannot build message. Owner phone is missing."); return; }
      window.open(res.url, "_blank", "noopener,noreferrer");
      toast.success(`Renewal check sent to ${t.property?.owner_name ?? "owner"}`);
    });
  }

  return (
    <div
      className="flex items-center gap-4 px-5 py-4"
      style={{
        background: "var(--kk-surface)",
        borderTop: firstRow ? "none" : "1px solid var(--kk-line)",
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[14px] font-semibold" style={{ color: "var(--kk-ink)", letterSpacing: "-0.011em" }}>
            {t.tenant_name}
          </p>
          <span className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>·</span>
          <p className="text-[13px] truncate" style={{ color: "var(--kk-ink-mute)" }}>
            {t.property_name}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {t.contract_end ? formatDate(t.contract_end) : "—"}
          </span>
          <span>RM {t.amount.toLocaleString()} / mo</span>
          {t.property?.owner_name && <span>· Owner: {t.property.owner_name}</span>}
        </div>
      </div>

      <span
        className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
        style={{ background: style.bg, color: style.ink }}
      >
        {style.text}
      </span>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={pingTenant}
          disabled={pending}
          className="kk-pill kk-pill-ghost"
          style={{ padding: "0.4rem 0.8rem" }}
          title="Ask tenant if renewing"
        >
          <WhatsAppIcon className="w-3.5 h-3.5" />
          Ask tenant
          <ChevronRight className="w-3 h-3" style={{ color: "var(--kk-ink-faint)" }} />
        </button>
        <button
          type="button"
          onClick={pingOwner}
          disabled={pending}
          className="kk-pill kk-pill-ghost"
          style={{ padding: "0.4rem 0.8rem" }}
          title="Ask owner if continuing to rent out"
        >
          <WhatsAppIcon className="w-3.5 h-3.5" />
          Ask owner
          <ChevronRight className="w-3 h-3" style={{ color: "var(--kk-ink-faint)" }} />
        </button>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m - 1]} ${d}, ${y}`;
}
