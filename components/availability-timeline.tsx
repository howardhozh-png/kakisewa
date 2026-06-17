"use client";

import { useMemo, useState } from "react";

import { Hint } from "@/components/hint";
import { MonthPickerPill } from "@/components/month-picker-pill";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OwnerLead } from "@/lib/types";

interface Props {
  leads: OwnerLead[];
  commissionPct?: number;
  onMonthClick?: (key: string) => void;
  selectedMonth?: string;
}

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function todayMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function AvailabilityTimeline({ leads, commissionPct = 100, onMonthClick, selectedMonth }: Props) {
  const today = useMemo(() => new Date(), []);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [windowMonths, setWindowMonths] = useState(12);
  const [startMonth, setStartMonth] = useState(todayMonthValue);

  const months = useMemo(() => {
    const [sy, sm] = startMonth.split("-").map(Number);
    const base = new Date(sy, sm - 1, 1);
    const out: { key: string; label: string; year: number }[] = [];
    for (let i = 0; i < windowMonths; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      out.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: MONTH_SHORT[d.getMonth()],
        year: d.getFullYear(),
      });
    }
    return out;
  }, [startMonth, windowMonths]);

  const buckets = useMemo(() => {
    const map = new Map<string, { count: number; potential: number; items: OwnerLead[] }>();
    months.forEach((m) => map.set(m.key, { count: 0, potential: 0, items: [] }));
    leads.forEach((l) => {
      const key = l.available_from ? l.available_from.slice(0, 7) : todayKey;
      if (!map.has(key)) return;
      const cur = map.get(key)!;
      cur.count++;
      cur.potential += (l.expected_rent ?? 0) * (commissionPct / 100);
      cur.items.push(l);
    });
    return map;
  }, [leads, months, commissionPct]);

  const maxCount = useMemo(() => {
    let max = 1;
    buckets.forEach((b) => { if (b.count > max) max = b.count; });
    return max;
  }, [buckets]);

  const total = Array.from(buckets.values()).reduce(
    (acc, b) => ({ count: acc.count + b.count, potential: acc.potential + b.potential }),
    { count: 0, potential: 0 }
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-3 gap-2">
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--kk-ink-faint)", marginBottom: 2 }}>
            Property availability · {windowMonths} month{windowMonths === 1 ? "" : "s"}
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.025em", color: "var(--kk-theme-dark)", fontVariantNumeric: "tabular-nums" }}>
            RM {Math.round(total.potential).toLocaleString()}
          </p>
          <p style={{ fontSize: 11, marginTop: 2, color: "var(--kk-ink-faint)" }}>
            {total.count} propert{total.count === 1 ? "y" : "ies"} · {commissionPct}% commission
            <Hint text="You earn 1 full month's rent per successful placement." side="right" />
          </p>
        </div>
        <div className="kk-chart-ctrl flex items-center gap-1 shrink-0">
          <MonthPickerPill value={startMonth} onChange={setStartMonth} />
          <Select value={String(windowMonths)} onValueChange={(v) => { if (v) setWindowMonths(Number(v)); }}>
            <SelectTrigger className="text-[10px] font-medium gap-1 [&_svg]:size-3" style={{ height: "auto", padding: "2px 8px", borderRadius: 12, border: "1px solid var(--kk-line)", background: "var(--kk-surface-2)", color: "var(--kk-ink)" }}>
              <SelectValue>{windowMonths}m</SelectValue>
            </SelectTrigger>
            <SelectContent align="end" className="min-w-[72px] text-[11px]">
              <SelectItem value="3" className="py-1.5 text-[11px]">3m</SelectItem>
              <SelectItem value="6" className="py-1.5 text-[11px]">6m</SelectItem>
              <SelectItem value="12" className="py-1.5 text-[11px]">12m</SelectItem>
              <SelectItem value="24" className="py-1.5 text-[11px]">24m</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {windowMonths > 0 ? (
        <div className="overflow-x-auto -mx-1 px-1">
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${windowMonths}, minmax(36px, 1fr))`, gap: "0.5rem", minWidth: `${Math.max(windowMonths * 46, 300)}px` }}>
          {months.map((m) => {
            const b = buckets.get(m.key)!;
            const pct = (b.count / maxCount) * 100;
            const isCurrent = m.key === todayKey;
            const isSelected = selectedMonth === m.key;
            return (
              <div
                key={m.key}
                className="flex flex-col items-stretch gap-2 min-w-0"
                title={`${m.label} ${m.year}: ${b.count} propert${b.count === 1 ? "y" : "ies"} · RM ${Math.round(b.potential).toLocaleString()} potential`}
                onClick={() => onMonthClick?.(m.key)}
                style={{ cursor: onMonthClick ? "pointer" : "default" }}
              >
                <div className="relative flex flex-col justify-end items-stretch" style={{ height: 90, paddingTop: 6 }}>
                  {b.count > 0 ? (
                    <div
                      style={{
                        height: `${Math.max(8, pct)}%`,
                        background: isCurrent
                          ? "rgba(0,0,0,0.18)"
                          : isSelected
                            ? "color-mix(in srgb, var(--kk-theme-dark) 90%, transparent)"
                            : "color-mix(in srgb, var(--kk-theme-dark) 55%, transparent)",
                        borderRadius: "4px 4px 0 0",
                        outline: isSelected ? "2px solid color-mix(in srgb, var(--kk-theme-dark) 70%, transparent)" : "none",
                        outlineOffset: "2px",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: "4%",
                        background: isSelected ? "color-mix(in srgb, var(--kk-theme-dark) 30%, transparent)" : "var(--kk-surface-2)",
                        borderRadius: "4px 4px 0 0",
                        outline: isSelected ? "2px solid color-mix(in srgb, var(--kk-theme-dark) 70%, transparent)" : "none",
                        outlineOffset: "2px",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
                <div className="text-center" style={{ height: 56 }}>
                  <p className="text-[11px] font-semibold tabular-nums leading-none" style={{ color: b.count > 0 ? "var(--kk-ink)" : "var(--kk-ink-faint)" }}>
                    {b.count}
                  </p>
                  <p className="text-[10px] mt-1 leading-none whitespace-nowrap" style={{ color: "var(--kk-ink-faint)" }}>
                    {m.label} &apos;{String(m.year).slice(2)}
                  </p>
                  <p className="text-[9px] mt-0.5 leading-none font-medium" style={{ color: "var(--kk-theme-dark)", visibility: isCurrent ? "visible" : "hidden" }}>
                    ·now
                  </p>
                  <p className="text-[10px] mt-0.5 tabular-nums leading-none" style={{ color: "var(--kk-ink-mute)", visibility: b.potential > 0 ? "visible" : "hidden" }}>
                    RM {b.potential > 0 ? (b.potential / 1000).toFixed(b.potential >= 10000 ? 0 : 1) + "k" : "—"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      ) : (
        <p className="text-[13px] text-center py-6" style={{ color: "var(--kk-ink-faint)" }}>Set months above to see the chart.</p>
      )}
    </div>
  );
}
