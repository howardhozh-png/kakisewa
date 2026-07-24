"use client";

import { useMemo, useState } from "react";
import { MonthPickerPill } from "@/components/month-picker-pill";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ListingIncomeEvent } from "@/lib/db";

interface Props {
  events: ListingIncomeEvent[];
}

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function todayMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Same color-mix technique as TenanciesTimeline — rent and sale segments are
// two shades of the agent's own --kk-theme-dark accent, not a second color,
// so a sale-tagged portion of a bar is visually distinct but still "on brand"
// for every agent regardless of their custom accent_color.
const RENT_SHADE = "color-mix(in srgb, var(--kk-theme-dark) 55%, transparent)";
const SALE_SHADE = "color-mix(in srgb, var(--kk-theme-dark) 90%, transparent)";

export function ListingIncomeTimeline({ events }: Props) {
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
    const map = new Map<string, { rent: number; sale: number; count: number }>();
    months.forEach((m) => map.set(m.key, { rent: 0, sale: 0, count: 0 }));
    events.forEach((e) => {
      if (!e.earned_on) return;
      const key = e.earned_on.slice(0, 7);
      const cur = map.get(key);
      if (!cur) return;
      if (e.type === "sale") cur.sale += e.amount;
      else cur.rent += e.amount;
      cur.count++;
    });
    return map;
  }, [events, months]);

  const maxTotal = Math.max(1, ...Array.from(buckets.values()).map((b) => b.rent + b.sale));
  const total = Array.from(buckets.values()).reduce(
    (acc, b) => ({ rent: acc.rent + b.rent, sale: acc.sale + b.sale, count: acc.count + b.count }),
    { rent: 0, sale: 0, count: 0 }
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-3 gap-2">
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--kk-ink-faint)", marginBottom: 2 }}>
            Listing income · {windowMonths} month{windowMonths === 1 ? "" : "s"}
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.025em", color: "var(--kk-theme-dark)", fontVariantNumeric: "tabular-nums" }}>
            RM {Math.round(total.rent + total.sale).toLocaleString()}
          </p>
          <p className="flex items-center gap-3 flex-wrap" style={{ fontSize: 11, marginTop: 2, color: "var(--kk-ink-faint)" }}>
            <span className="flex items-center gap-1">
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: RENT_SHADE }} />
              Rent RM {Math.round(total.rent).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: SALE_SHADE }} />
              Sale RM {Math.round(total.sale).toLocaleString()}
            </span>
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

      <div className="overflow-x-auto -mx-1 px-1">
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${windowMonths}, minmax(36px, 1fr))`, gap: "0.5rem", minWidth: `${Math.max(windowMonths * 46, 300)}px` }}>
        {months.map((m) => {
          const b = buckets.get(m.key)!;
          const monthTotal = b.rent + b.sale;
          const heightPct = (monthTotal / maxTotal) * 100;
          const rentSharePct = monthTotal > 0 ? (b.rent / monthTotal) * 100 : 0;
          const isCurrent = m.key === todayKey;
          return (
            <div
              key={m.key}
              className="flex flex-col items-stretch gap-2 min-w-0"
              title={`${m.label} ${m.year}: RM ${Math.round(b.rent).toLocaleString()} rent + RM ${Math.round(b.sale).toLocaleString()} sale`}
            >
              <div className="relative flex items-end" style={{ height: 90, paddingTop: 6 }}>
                <div
                  className="w-full rounded-t-md transition-all duration-500 flex flex-col-reverse overflow-hidden"
                  style={{
                    height: `${monthTotal > 0 ? Math.max(8, heightPct) : 4}%`,
                    background: monthTotal > 0 ? undefined : "var(--kk-surface-2)",
                  }}
                >
                  {monthTotal > 0 && (
                    <>
                      <div style={{ height: `${rentSharePct}%`, background: isCurrent ? "rgba(0,0,0,0.18)" : RENT_SHADE }} />
                      <div style={{ height: `${100 - rentSharePct}%`, background: isCurrent ? "rgba(0,0,0,0.32)" : SALE_SHADE }} />
                    </>
                  )}
                </div>
              </div>
              <div className="text-center" style={{ height: 56 }}>
                <p className="text-[10px] mt-1 leading-none whitespace-nowrap" style={{ color: "var(--kk-ink-faint)" }}>
                  {m.label} &apos;{String(m.year).slice(2)}
                </p>
                <p className="text-[9px] mt-0.5 leading-none font-medium" style={{ color: "var(--kk-theme-dark)", visibility: isCurrent ? "visible" : "hidden" }}>
                  ·now
                </p>
                <p className="text-[10px] mt-1 tabular-nums leading-none" style={{ color: "var(--kk-ink-mute)", visibility: monthTotal > 0 ? "visible" : "hidden" }}>
                  RM {monthTotal > 0 ? (monthTotal / 1000).toFixed(monthTotal >= 10000 ? 0 : 1) + "k" : "—"}
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
