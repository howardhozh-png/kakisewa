"use client";

import { useState } from "react";
import { OwnerLead } from "@/lib/types";
import { Inbox, Sparkles, Megaphone, Check, XCircle, ChevronRight } from "lucide-react";
import { AvailabilityTimeline } from "@/components/availability-timeline";

type Stage = OwnerLead["stage"];

interface StageInfo {
  key: Stage;
  label: string;
  description: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  actionLabel?: string;
  actionHref?: string;
}

const STAGE_DEFS: StageInfo[] = [
  {
    key: "imported",
    label: "Imported",
    description: "Fresh leads waiting for your first move.",
    hint: "Break the ice. Send a WhatsApp message to start the conversation. Most agents lose deals by waiting too long.",
    icon: Inbox,
    actionLabel: "Follow up now →",
    actionHref: "#kk-col-imported",
  },
  {
    key: "wants_rent",
    label: "Wants to rent",
    description: "Owner is interested. Now capture the details.",
    hint: "Get property name, expected rent, bedrooms and availability date before listing. Missing details = can't build a tenant pack.",
    icon: Sparkles,
    actionLabel: "Fill in details →",
    actionHref: "#kk-col-wants_rent",
  },
  {
    key: "listed",
    label: "Listed",
    description: "Property is live. Find a tenant and close the deal.",
    hint: "Every listed property needs an availability date so you can see which months are busy and plan your matching effort.",
    icon: Megaphone,
    actionLabel: "Build tenant packs →",
    actionHref: "#kk-col-listed",
  },
  {
    key: "matched",
    label: "Rented",
    description: "Deal done. Tenancy signed, commission earned.",
    hint: "Track the tenancy in the Renew Old Money tab to protect your renewal income when the contract approaches expiry.",
    icon: Check,
    actionLabel: "View tenancies →",
    actionHref: "/tenancies",
  },
  {
    key: "own_stay",
    label: "Own stay",
    description: "Owner keeping it for themselves.",
    hint: "Keep the relationship warm. Circumstances change. They may need your help again in 6 to 12 months.",
    icon: XCircle,
  },
];

interface Props {
  byStage: Record<Stage, OwnerLead[]>;
  onMonthClick?: (key: string) => void;
}

export function LeadStageExplorer({ byStage, onMonthClick }: Props) {
  const [selectedStage, setSelectedStage] = useState<Stage>("listed");

  const current = STAGE_DEFS.find((s) => s.key === selectedStage) ?? STAGE_DEFS[2];
  const Icon = current.icon;

  const listedLeads = byStage.listed ?? [];

  return (
    <section className="kk-section mb-8 overflow-hidden">

      {/* ── Stage selector strip ── */}
      <div className="px-6 pt-6 pb-4">
        <p className="kk-overline mb-4">How your pipeline works</p>
        <div className="flex items-center gap-1 flex-wrap">
          {STAGE_DEFS.map((s, i) => {
            const isSelected = s.key === selectedStage;
            const count = (s.key === "imported"
              ? (byStage.imported?.length ?? 0) + (byStage.replied?.length ?? 0)
              : (byStage[s.key]?.length ?? 0));
            return (
              <div key={s.key} className="flex items-center gap-1">
                {i > 0 && (
                  <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "var(--kk-ink-faint)" }} />
                )}
                <button
                  onClick={() => setSelectedStage(s.key)}
                  className="kk-scale-hover flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all"
                  style={{
                    background: s.key === "listed"
                      ? "var(--kk-blue)"
                      : isSelected ? "var(--kk-ink)" : "var(--kk-surface-2)",
                    color: s.key === "listed" || isSelected ? "#fff" : "var(--kk-ink-mute)",
                    boxShadow: isSelected ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                  }}
                >
                  {s.label}
                  <span
                    className="tabular-nums text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: s.key === "listed" || isSelected ? "rgba(255,255,255,0.25)" : "var(--kk-surface)",
                      color: s.key === "listed" || isSelected ? "#fff" : "var(--kk-ink-faint)",
                    }}
                  >
                    {count}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Stage detail panel ── */}
      <div className="px-6 py-6">
        {/* Stage header — title + description on one line */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: selectedStage === "listed" ? "rgba(0,113,227,0.10)" : "var(--kk-surface-2)",
              color: selectedStage === "listed" ? "var(--kk-blue)" : "var(--kk-ink-mute)",
            }}
          >
            <Icon className="w-4 h-4" />
          </div>
          <p className="text-[14px] font-semibold leading-tight truncate" style={{ color: "var(--kk-ink)" }}>
            {current.label}
            <span className="font-normal ml-1.5" style={{ color: "var(--kk-ink-mute)" }}>
              · {current.description}
            </span>
          </p>
        </div>

        {/* Stage hint */}
        <p className="text-[13px] mb-5 truncate italic" style={{ color: "rgba(0,0,0,0.28)" }}>
          {current.hint}
        </p>

        {/* Listed stage: availability chart in its own card */}
        {selectedStage === "listed" && (
          <div className="kk-section p-5 mt-2">
            <AvailabilityTimeline leads={listedLeads} commissionPct={100} onMonthClick={onMonthClick} />
          </div>
        )}

        {/* Non-listed stages: CTA */}
        {selectedStage !== "listed" && current.actionLabel && current.actionHref && (
          <a
            href={current.actionHref}
            className="kk-scale-hover inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-full"
            style={{ background: "rgba(0,113,227,0.10)", color: "var(--kk-blue)", border: "1px solid rgba(0,113,227,0.22)" }}
          >
            {current.actionLabel}
          </a>
        )}
      </div>
    </section>
  );
}
