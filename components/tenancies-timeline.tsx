"use client";

import { useMemo, useState } from "react";
import { Hint } from "@/components/hint";
import { Tenancy } from "@/lib/types";

interface Props {
  tenancies: Tenancy[];
  renewalCommissionPct?: number;
  onMonthClick?: (key: string) => void;
  selectedMonth?: string;
  plan?: string;
}

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function todayMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function TenanciesTimeline({ tenancies, renewalCommissionPct = 50, onMonthClick, selectedMonth, plan = "platinum" }: Props) {
  const today = useMemo(() => new Date(), []);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const isSilver = plan === "silver";

  const [windowMonths, setWindowMonths] = useState(12);
  const [startMonth, setStartMonth] = useState(todayMonthValue);

  const months = useMemo(() => {
    const [sy, sm] = (isSilver ? todayMonthValue() : startMonth).split("-").map(Number);
    const base = new Date(sy, sm - 1, 1);
    const count = isSilver ? 12 : windowMonths;
    const out: { key: string; label: string; year: number; date: Date }[] = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      out.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: MONTH_SHORT[d.getMonth()],
        year: d.getFullYear(),
        date: d,
      });
    }
    return out;
  }, [isSilver, startMonth, windowMonths]);

  const buckets = useMemo(() => {
    const map = new Map<string, { count: number; potential: number }>();
    months.forEach((m) => map.set(m.key, { count: 0, potential: 0 }));
    tenancies.forEach((t) => {
      if (!t.contract_end) return;
      const key = t.contract_end.slice(0, 7);
      if (!map.has(key)) return;
      const cur = map.get(key)!;
      cur.count++;
      cur.potential += (t.amount ?? 0) * (renewalCommissionPct / 100);
    });
    return map;
  }, [tenancies, months, renewalCommissionPct]);

  const maxCount = Math.max(1, ...Array.from(buckets.values()).map((b) => b.count));
  const total = Array.from(buckets.values()).reduce(
    (acc, b) => ({ count: acc.count + b.count, potential: acc.potential + b.potential }),
    { count: 0, potential: 0 }
  );

  const displayMonths = isSilver ? 12 : windowMonths;

  return (
    <div>
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <p className="kk-overline mb-2">
            Renewal income · {displayMonths} month{displayMonths === 1 ? "" : "s"}
          </p>
          <p className="kk-metric-lg" style={{ color: "var(--kk-theme-dark)" }}>
            RM {Math.round(total.potential).toLocaleString()}
          </p>
          <p className="text-[12px] mt-1 flex items-center gap-1.5" style={{ color: "var(--kk-ink-faint)" }}>
            {total.count} contract{total.count === 1 ? "" : "s"} · {renewalCommissionPct}% commission per renewal
            <Hint text="You earn half a month's rent per renewal closed." side="right" />
          </p>
        </div>
        {!isSilver && (
          <div className="shrink-0 flex items-center gap-2 flex-wrap">
            <input
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className="text-[13px] tabular-nums outline-none"
              style={{
                background: "var(--kk-surface)",
                border: "1.5px solid var(--kk-line-strong)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                borderRadius: 8,
                padding: "3px 8px",
                color: "var(--kk-ink)",
              }}
            />
            <select
              value={windowMonths}
              onChange={(e) => setWindowMonths(Number(e.target.value))}
              className="text-[13px] font-semibold tabular-nums outline-none"
              style={{
                background: "var(--kk-surface)",
                border: "1.5px solid var(--kk-line-strong)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                borderRadius: 8,
                padding: "3px 8px",
                color: "var(--kk-ink)",
              }}
            >
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
              <option value={24}>24 months</option>
            </select>
          </div>
        )}
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${windowMonths}, minmax(36px, 1fr))`, gap: "0.5rem", minWidth: `${Math.max(windowMonths * 46, 300)}px` }}>
        {months.map((m) => {
          const b = buckets.get(m.key)!;
          const heightPct = (b.count / maxCount) * 100;
          const isCurrent = m.key === todayKey;
          return (
            <div
              key={m.key}
              className="flex flex-col items-stretch gap-2 min-w-0"
              title={`${m.label} ${m.year}: ${b.count} contracts · RM ${Math.round(b.potential).toLocaleString()} potential`}
              onClick={() => onMonthClick?.(m.key)}
              style={{ cursor: onMonthClick ? "pointer" : "default" }}
            >
              <div className="relative h-20 flex items-end pt-1.5">
                <div
                  className="w-full rounded-t-md transition-all duration-500"
                  style={{
                    height: `${b.count > 0 ? Math.max(8, heightPct) : 4}%`,
                    background: b.count > 0
                      ? (isCurrent ? "rgba(0,0,0,0.18)" : selectedMonth === m.key ? "color-mix(in srgb, var(--kk-theme-dark) 90%, transparent)" : "color-mix(in srgb, var(--kk-theme-dark) 55%, transparent)")
                      : selectedMonth === m.key ? "color-mix(in srgb, var(--kk-theme-dark) 25%, transparent)" : "var(--kk-surface-2)",
                    outline: selectedMonth === m.key ? "2px solid color-mix(in srgb, var(--kk-theme-dark) 60%, transparent)" : "none",
                    outlineOffset: "2px",
                  }}
                />
              </div>
              <div className="text-center" style={{ height: 64 }}>
                <p className="text-[13px] font-semibold tabular-nums leading-none" style={{ color: b.count > 0 ? "var(--kk-ink)" : "var(--kk-ink-faint)" }}>
                  {b.count}
                </p>
                <p className="text-[11px] mt-1 leading-none whitespace-nowrap" style={{ color: "var(--kk-ink-faint)" }}>
                  {m.label} &apos;{String(m.year).slice(2)}
                </p>
                <p className="text-[10px] mt-0.5 leading-none font-medium" style={{ color: "var(--kk-theme-dark)", visibility: isCurrent ? "visible" : "hidden" }}>
                  ·now
                </p>
                <p className="text-[11px] mt-0.5 tabular-nums leading-none" style={{ color: "var(--kk-ink-mute)", visibility: b.potential > 0 ? "visible" : "hidden" }}>
                  RM {b.potential > 0 ? (b.potential / 1000).toFixed(b.potential >= 10000 ? 0 : 1) + "k" : "—"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
