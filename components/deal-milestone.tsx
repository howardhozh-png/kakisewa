"use client";

import { useEffect, useRef } from "react";
import { useGoal } from "@/components/goal-context";

function fmt(n: number) {
  return n >= 1_000_000
    ? `RM ${(n / 1_000_000).toFixed(1)}M`
    : `RM ${n.toLocaleString()}`;
}

interface Props {
  dealCount: number;
  totalEarned: number;
  yearDeals: number;
  yearEarned: number;
  yearGoal: number;
  bestMonthAmount: number;
  bestMonthLabel: string | null;
  bestMonthThisYearAmount: number;
  bestMonthThisYearLabel: string | null;
}

export function DealMilestone({
  dealCount,
  totalEarned,
  yearDeals,
  yearEarned,
  yearGoal,
  bestMonthAmount,
  bestMonthLabel,
  bestMonthThisYearAmount,
  bestMonthThisYearLabel,
}: Props) {
  const { liveMonthlyGoal } = useGoal();
  const effectiveYearGoal = liveMonthlyGoal > 0 ? liveMonthlyGoal * 12 : yearGoal;

  const barRef = useRef<HTMLDivElement>(null);
  const thisYear = new Date().getFullYear();
  const yearPct = effectiveYearGoal > 0 ? Math.min((yearEarned / effectiveYearGoal) * 100, 100) : 0;

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    bar.style.transition = "width 0.4s cubic-bezier(0.4,0,0.2,1)";
    bar.style.width = `${yearPct}%`;
  }, [yearPct]);

  // Initial mount animation
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    bar.style.width = "0%";
    const id = requestAnimationFrame(() => {
      bar.style.transition = "width 1s cubic-bezier(0.4,0,0.2,1)";
      bar.style.width = `${yearPct}%`;
    });
    return () => cancelAnimationFrame(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="kk-section p-5 lg:p-6 flex flex-col gap-5">
      <p className="kk-overline">Career stats</p>

      {/* Lifetime */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: "var(--kk-ink-faint)" }}>Lifetime</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="kk-metric" style={{ color: "var(--kk-ink)" }}>{dealCount}</p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>deals closed</p>
          </div>
          <div>
            <p className="kk-metric" style={{ color: "var(--kk-ink)" }}>{fmt(totalEarned)}</p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>total earned</p>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: "var(--kk-line)" }} />

      {/* This year */}
      <div className="space-y-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--kk-ink-faint)" }}>{thisYear} progress</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="kk-metric" style={{ color: "var(--kk-ink)" }}>{yearDeals}</p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>deals closed</p>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="kk-metric" style={{ color: "var(--kk-ink)" }}>{fmt(yearEarned)}</p>
              {effectiveYearGoal > 0 && (
                <span className="text-[11px] tabular-nums" style={{ color: "var(--kk-ink-faint)" }}>
                  {Math.round(yearPct)}%
                </span>
              )}
            </div>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>
              {effectiveYearGoal > 0 ? `of ${fmt(effectiveYearGoal)} goal` : "earned"}
            </p>
          </div>
        </div>
        {effectiveYearGoal > 0 && (
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--kk-surface-2)" }}>
            <div ref={barRef} className="h-full rounded-full" style={{ width: "0%", background: "var(--kk-blue)" }} />
          </div>
        )}
      </div>

      <div style={{ height: 1, background: "var(--kk-line)" }} />

      {/* Best months */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: "var(--kk-ink-faint)" }}>Best month (all-time)</p>
          <p className="kk-metric-sm" style={{ color: "var(--kk-ink)" }}>{bestMonthAmount > 0 ? fmt(bestMonthAmount) : "—"}</p>
          {bestMonthLabel && <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>{bestMonthLabel}</p>}
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: "var(--kk-ink-faint)" }}>Best month ({thisYear})</p>
          <p className="kk-metric-sm" style={{ color: "var(--kk-ink)" }}>{bestMonthThisYearAmount > 0 ? fmt(bestMonthThisYearAmount) : "—"}</p>
          {bestMonthThisYearLabel && <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>{bestMonthThisYearLabel}</p>}
        </div>
      </div>
    </div>
  );
}
