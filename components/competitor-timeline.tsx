"use client";

import { useMemo, useState } from "react";
import { MonthPickerPill } from "@/components/month-picker-pill";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OwnerLead } from "@/lib/types";

interface Props {
  leads: OwnerLead[];
  onMonthClick?: (key: string) => void;
  selectedMonth?: string;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function CompetitorTimeline({ leads, onMonthClick, selectedMonth }: Props) {
  const today = useMemo(() => new Date(), []);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [windowMonths, setWindowMonths] = useState(12);
  const [startMonth, setStartMonth] = useState(currentMonthKey);

  const months = useMemo(() => {
    const [sy, sm] = startMonth.split("-").map(Number);
    const out: { key: string; label: string; year: number }[] = [];
    for (let i = 0; i < windowMonths; i++) {
      const d = new Date(sy, sm - 1 + i, 1);
      out.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: MONTHS[d.getMonth()],
        year: d.getFullYear(),
      });
    }
    return out;
  }, [startMonth, windowMonths]);

  const buckets = useMemo(() => {
    const map = new Map<string, number>();
    months.forEach((m) => map.set(m.key, 0));
    leads.forEach((l) => {
      if (!l.competitor_contract_end) return;
      const key = l.competitor_contract_end.slice(0, 7);
      if (map.has(key)) map.set(key, map.get(key)! + (l.expected_rent ?? 0));
    });
    return map;
  }, [leads, months]);

  const maxAmount = Math.max(1, ...Array.from(buckets.values()));
  // Total across ALL leads, not just those expiring in the window
  const totalRm = leads.reduce((sum, l) => sum + (l.expected_rent ?? 0), 0);

  function fmtRm(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
    return String(n);
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-3 gap-2">
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--kk-ink-faint)", marginBottom: 2 }}>
            Total potential income · {windowMonths} month{windowMonths === 1 ? "" : "s"}
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.025em", color: "var(--kk-theme-dark)", fontVariantNumeric: "tabular-nums" }}>
            RM {totalRm.toLocaleString()}/mo
          </p>
          <p style={{ fontSize: 11, marginTop: 2, color: "var(--kk-ink-faint)" }}>
            across all {leads.length} target unit{leads.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="kk-chart-ctrl flex items-center gap-1 shrink-0">
          <MonthPickerPill value={startMonth} onChange={setStartMonth} />
          <Select value={String(windowMonths)} onValueChange={(v) => { if (v) setWindowMonths(Number(v)); }}>
            <SelectTrigger className="text-[10px] font-medium gap-1 [&_svg]:size-3" style={{ height: "auto", padding: "2px 8px", borderRadius: 12, border: "1px solid var(--kk-line)", background: "var(--kk-surface-2)", color: "var(--kk-ink)" }}>
              <SelectValue>{windowMonths}m</SelectValue>
            </SelectTrigger>
            <SelectContent align="end" className="min-w-[72px] text-[11px]">
              {(["3","6","12","24"] as const).map((v) => (
                <SelectItem key={v} value={v} className="py-1.5 text-[11px]">{v}m</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${windowMonths}, minmax(36px, 1fr))`, gap: "0.5rem", minWidth: `${Math.max(windowMonths * 46, 300)}px` }}>
          {months.map((m) => {
            const amount = buckets.get(m.key) ?? 0;
            const heightPct = (amount / maxAmount) * 100;
            const isCurrent = m.key === todayKey;
            return (
              <div
                key={m.key}
                title={`${m.label} ${m.year}: RM ${amount.toLocaleString()}/mo`}
                onClick={() => onMonthClick?.(m.key)}
                style={{ cursor: onMonthClick ? "pointer" : "default", display: "flex", flexDirection: "column", alignItems: "stretch", gap: "0.5rem", minWidth: 0 }}
              >
                <div className="relative flex items-end" style={{ height: 90, paddingTop: 6 }}>
                  <div
                    className="w-full rounded-t-md transition-all duration-500"
                    style={{
                      height: `${amount > 0 ? Math.max(8, heightPct) : 4}%`,
                      background: amount > 0
                        ? (isCurrent ? "rgba(0,0,0,0.18)" : selectedMonth === m.key ? "color-mix(in srgb, var(--kk-theme-dark) 90%, transparent)" : "color-mix(in srgb, var(--kk-theme-dark) 55%, transparent)")
                        : selectedMonth === m.key ? "color-mix(in srgb, var(--kk-theme-dark) 25%, transparent)" : "var(--kk-surface-2)",
                      outline: selectedMonth === m.key ? "2px solid color-mix(in srgb, var(--kk-theme-dark) 60%, transparent)" : "none",
                      outlineOffset: "2px",
                    }}
                  />
                </div>
                <div className="text-center" style={{ height: 44 }}>
                  <p className="text-[11px] font-semibold tabular-nums leading-none" style={{ color: amount > 0 ? "var(--kk-ink)" : "var(--kk-ink-faint)" }}>
                    {amount > 0 ? `RM ${fmtRm(amount)}` : "0"}
                  </p>
                  <p className="text-[10px] mt-1 leading-none whitespace-nowrap" style={{ color: "var(--kk-ink-faint)" }}>
                    {m.label} &apos;{String(m.year).slice(2)}
                  </p>
                  <p className="text-[9px] mt-0.5 leading-none font-medium" style={{ color: "var(--kk-theme-dark)", visibility: isCurrent ? "visible" : "hidden" }}>
                    ·now
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
