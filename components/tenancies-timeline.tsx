"use client";

import { useMemo, useState } from "react";
import { Hint } from "@/components/hint";
import { Tenancy } from "@/lib/types";

interface Props {
  tenancies: Tenancy[];
  renewalCommissionPct?: number;
  onMonthClick?: (key: string) => void;
  selectedMonth?: string;
}

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function TenanciesTimeline({ tenancies, renewalCommissionPct = 50, onMonthClick, selectedMonth }: Props) {
  const today = useMemo(() => new Date(), []);
  const [windowMonths, setWindowMonths] = useState(12);
  const [monthsDisplay, setMonthsDisplay] = useState("12");

  const months = useMemo(() => {
    const out: { key: string; label: string; year: number; date: Date }[] = [];
    for (let i = 0; i < windowMonths; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      out.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: MONTH_SHORT[d.getMonth()],
        year: d.getFullYear(),
        date: d,
      });
    }
    return out;
  }, [today, windowMonths]);

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

  return (
    <div>
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <p className="kk-overline mb-2">
            Renewal income · next {windowMonths} month{windowMonths === 1 ? "" : "s"}
          </p>
          <p className="kk-metric-lg" style={{ color: "#F4511E" }}>
            RM {Math.round(total.potential).toLocaleString()}
          </p>
          <p className="text-[12px] mt-1 flex items-center gap-1.5" style={{ color: "var(--kk-ink-faint)" }}>
            {total.count} contract{total.count === 1 ? "" : "s"} · {renewalCommissionPct}% commission per renewal
            <Hint text="You earn half a month's rent per renewal closed." side="right" />
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>Next</span>
          <input
            type="text"
            inputMode="numeric"
            value={monthsDisplay}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              setMonthsDisplay(raw);
              const v = parseInt(raw, 10);
              if (!isNaN(v)) setWindowMonths(Math.min(24, Math.max(0, v)));
            }}
            onBlur={() => setMonthsDisplay(String(windowMonths))}
            className="text-[13px] font-semibold text-center tabular-nums outline-none"
            style={{
              width: "52px",
              background: "var(--kk-surface)",
              border: "1.5px solid var(--kk-line-strong)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              borderRadius: 8,
              padding: "3px 6px",
              color: "var(--kk-ink)",
            }}
          />
          <span className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>month{windowMonths === 1 ? "" : "s"}</span>
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${windowMonths}, minmax(36px, 1fr))`, gap: "0.5rem", minWidth: `${Math.max(windowMonths * 46, 300)}px` }}>
        {months.map((m) => {
          const b = buckets.get(m.key)!;
          const heightPct = (b.count / maxCount) * 100;
          const isCurrent = m.key === months[0].key;
          return (
            <div
              key={m.key}
              className="flex flex-col items-stretch gap-2 min-w-0"
              title={`${m.label} ${m.year}: ${b.count} contracts · RM ${Math.round(b.potential).toLocaleString()} potential`}
              onClick={() => onMonthClick?.(m.key)}
              style={{ cursor: onMonthClick ? "pointer" : "default" }}
            >
              <div className="relative h-20 flex items-end">
                <div
                  className="w-full rounded-t-md transition-all duration-500"
                  style={{
                    height: `${b.count > 0 ? Math.max(8, heightPct) : 4}%`,
                    background: b.count > 0
                      ? (isCurrent ? "rgba(0,0,0,0.18)" : selectedMonth === m.key ? "rgba(180,40,10,0.90)" : "rgba(244,81,30,0.55)")
                      : selectedMonth === m.key ? "rgba(180,40,10,0.25)" : "var(--kk-surface-2)",
                    outline: selectedMonth === m.key ? "2px solid rgba(180,40,10,0.60)" : "none",
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
                <p className="text-[10px] mt-0.5 leading-none font-medium" style={{ color: "#F4511E", visibility: isCurrent ? "visible" : "hidden" }}>
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
