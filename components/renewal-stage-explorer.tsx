"use client";

import { useState, useMemo } from "react";
import { Tenancy, LifecycleStage, defaultLifecycleStage } from "@/lib/types";
import { CircleDashed, AlertTriangle, CheckCircle, ChevronRight } from "lucide-react";
import { TenanciesTimeline } from "@/components/tenancies-timeline";

type RenewalStage = "active" | "headsup" | "renewing";

interface StageInfo {
  key: RenewalStage;
  label: string;
  description: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  ink: string;
  soft: string;
  actionHref?: string;
}

const STAGE_DEFS: StageInfo[] = [
  {
    key: "active",
    label: "Active",
    description: "Tenancy running smoothly. Nothing due yet.",
    hint: "Keep the relationship warm. The system will flag contracts approaching expiry so you know exactly when to act.",
    icon: CircleDashed,
    ink: "var(--kk-ink-mute)",
    soft: "var(--kk-surface-2)",
    actionHref: "#kk-col-active",
  },
  {
    key: "headsup",
    label: "Expiring",
    description: "Contracts expiring soon. Open the card to choose what happens next.",
    hint: "Use the 'What's next?' dropdown on any Expiring card to choose: Renew contract, Find new tenant, or Stop renting. Open the card popup for quick WhatsApp shortcuts to reach the owner or tenant.",
    icon: AlertTriangle,
    ink: "#C03810",
    soft: "rgba(244,81,30,0.10)",
    actionHref: "#kk-col-headsup",
  },
  {
    key: "renewing",
    label: "Renewing",
    description: "Owner confirmed. Collect commission and set the new end date.",
    hint: "Click 'Moved in' on the card, enter the new contract end date, and confirm. The tenancy loops back to Active automatically.",
    icon: CheckCircle,
    ink: "#1F8B4C",
    soft: "var(--kk-green-soft)",
    actionHref: "#kk-col-renewing",
  },
];

interface Props {
  tenancies: Tenancy[];
  byStage: Record<LifecycleStage, Tenancy[]>;
  onMonthClick?: (key: string) => void;
}

export function RenewalStageExplorer({ tenancies, byStage, onMonthClick }: Props) {
  const [selectedStage, setSelectedStage] = useState<RenewalStage>("headsup");
  const today = useMemo(() => new Date(), []);

  const current = STAGE_DEFS.find((s) => s.key === selectedStage) ?? STAGE_DEFS[1];
  const Icon = current.icon;

  return (
    <section className="kk-section mb-8 overflow-hidden">

      {/* ── Stage selector strip ── */}
      <div className="px-6 pt-6 pb-4">
        <p className="kk-overline mb-4">How your renewal pipeline works</p>
        <div className="flex items-center gap-1 flex-wrap">
          {STAGE_DEFS.map((s, i) => {
            const isSelected = s.key === selectedStage;
            const count = byStage[s.key]?.length ?? 0;
            return (
              <div key={s.key} className="flex items-center gap-1">
                {i > 0 && (
                  <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "var(--kk-ink-faint)" }} />
                )}
                <button
                  onClick={() => setSelectedStage(s.key)}
                  className="kk-scale-hover flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all"
                  style={{
                    background: s.key === "headsup" ? "#F4511E" : isSelected ? "var(--kk-ink)" : "var(--kk-surface-2)",
                    color: s.key === "headsup" || isSelected ? "#fff" : "var(--kk-ink-mute)",
                    boxShadow: isSelected && s.key !== "headsup" ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                  }}
                >
                  {s.label}
                  <span
                    className="tabular-nums text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: s.key === "headsup" || isSelected ? "rgba(255,255,255,0.25)" : "var(--kk-surface)",
                      color: s.key === "headsup" || isSelected ? "#fff" : "var(--kk-ink-faint)",
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
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: current.soft, color: current.ink }}
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

        <p className="text-[13px] mb-5 truncate italic" style={{ color: "rgba(0,0,0,0.28)" }}>
          {current.hint}
        </p>

        {selectedStage === "headsup" && (
          <div className="kk-section p-5 mt-2">
            <TenanciesTimeline
              tenancies={tenancies.filter((t) => {
                const s = defaultLifecycleStage(t, today);
                return s !== "ending" && s !== "closed" && s !== null;
              })}
              renewalCommissionPct={50}
              onMonthClick={onMonthClick}
            />
          </div>
        )}

        {selectedStage !== "headsup" && current.actionHref && (
          <a
            href={current.actionHref}
            className="kk-scale-hover inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-full"
            style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", border: "1px solid var(--kk-line)" }}
          >
            View {current.label.toLowerCase()} →
          </a>
        )}
      </div>
    </section>
  );
}
