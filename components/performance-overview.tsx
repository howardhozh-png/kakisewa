"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CountUp } from "@/components/count-up";
import { updateAgentGoals } from "@/lib/actions";
import { Loader2, Target } from "lucide-react";
import { FilterSelect } from "@/components/filter-select";
import { toast } from "sonner";
import { useGoal } from "@/components/goal-context";

export interface MonthCell {
  key: string;
  label: string;
  year: number;
  isPast: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  commission: number;
}

interface Props {
  initialMonths: MonthCell[];
  initialMonthlyGoal: number;
  initialCommissionPct: number;
  ytd: number;
  remainingMonths: number;
  year: number;
}

export function PerformanceOverview({ initialMonths, initialMonthlyGoal, initialCommissionPct, ytd, remainingMonths, year }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [monthlyGoal, setMonthlyGoal] = useState<number>(initialMonthlyGoal ?? 6000);
  const [goalDisplay, setGoalDisplay] = useState<string>(String(initialMonthlyGoal ?? 6000));
  const { setLiveMonthlyGoal } = useGoal();

  // liveGoal tracks the input in real-time for instant calculations
  const liveGoal = useMemo(() => {
    const v = parseInt(goalDisplay, 10);
    return isNaN(v) || v < 0 ? monthlyGoal : v;
  }, [goalDisplay, monthlyGoal]);

  const annualGoal    = liveGoal * 12;
  const quarterlyGoal = liveGoal * 3;
  const ytdGap        = Math.max(0, annualGoal - ytd);
  const forecastPerMonth = remainingMonths > 0 ? ytdGap / remainingMonths : 0;
  const annualPct     = annualGoal > 0 ? Math.round((ytd / annualGoal) * 100) : 0;

  const cumulativeActuals = useMemo(() => {
    const out: number[] = [];
    let acc = 0;
    initialMonths.forEach((m) => {
      if (m.isPast || m.isCurrent) {
        acc += m.commission;
        out.push(acc);
      } else {
        acc += forecastPerMonth;
        out.push(acc);
      }
    });
    return out;
  }, [initialMonths, forecastPerMonth]);


  const maxBar = Math.max(liveGoal, ...initialMonths.map((m) => m.commission), forecastPerMonth);

  function persistGoal(value: number) {
    startTransition(async () => {
      const res = await updateAgentGoals({ monthly_goal_rm: value, commission_pct: initialCommissionPct });
      if (res.ok) router.refresh();
      else toast.error("Could not save goal");
    });
  }

  function commitGoal() {
    const v = parseInt(goalDisplay, 10);
    const snapped = Math.max(0, Math.round((isNaN(v) ? monthlyGoal : v) / 500) * 500);
    setGoalDisplay(String(snapped));
    setMonthlyGoal(snapped);
    persistGoal(snapped);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8">

      {/* ── LEFT: sticky goal panel ── */}
      <div className="lg:sticky flex flex-col" style={{ top: 80 }}>
        <section className="kk-section p-6 lg:p-8 flex-1 flex flex-col justify-between">

          {/* Monthly target — label */}
          <p className="kk-overline">Monthly target</p>

          {/* Monthly target — input */}
          <div className="flex items-baseline gap-1.5">
            <span className="kk-metric" style={{ color: "var(--kk-ink-mute)" }}>RM</span>
            <input
              type="text"
              inputMode="numeric"
              value={goalDisplay ? Number(goalDisplay).toLocaleString() : ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                setGoalDisplay(raw);
                const v = parseInt(raw, 10);
                if (!isNaN(v) && v >= 0) setLiveMonthlyGoal(v);
              }}
              onFocus={(e) => e.target.select()}
              onBlur={commitGoal}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitGoal();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="kk-metric outline-none rounded-xl px-3 py-1"
              style={{
                color: "var(--kk-ink)",
                letterSpacing: "-0.018em",
                background: "var(--kk-surface)",
                border: "1.5px solid var(--kk-line-strong)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                width: `${Math.max(4, Number(goalDisplay).toLocaleString().length + 2)}ch`,
                minWidth: "5ch",
              }}
            />
            {pending && <Loader2 className="w-4 h-4 animate-spin self-center ml-1" style={{ color: "var(--kk-ink-faint)" }} />}
          </div>

          {/* Monthly target — hint */}
          <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>Rounds to nearest RM 500 on save</p>

          {/* Divider */}
          <div style={{ height: 1, background: "var(--kk-line)" }} />

          {/* Annual + Quarterly */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="kk-overline mb-1.5">Annual</p>
              <p className="kk-metric" style={{ color: "var(--kk-ink)" }}>
                <CountUp value={annualGoal} prefix="RM " />
              </p>
            </div>
            <div>
              <p className="kk-overline mb-1.5">Quarterly</p>
              <p className="kk-metric" style={{ color: "var(--kk-ink)" }}>
                <CountUp value={quarterlyGoal} prefix="RM " />
              </p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "var(--kk-line)" }} />

          {/* To hit goal callout */}
          <div className="rounded-2xl p-4" style={{ background: "var(--kk-surface-2)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--kk-ink-mute)" }} />
              <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--kk-ink-mute)" }}>To hit annual goal</p>
            </div>
            <p className="kk-metric-lg" style={{ color: "var(--kk-green)" }}>
              <CountUp value={Math.round(forecastPerMonth)} prefix="RM " />
            </p>
            <p className="text-[12px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>
              per remaining {remainingMonths} month{remainingMonths !== 1 ? "s" : ""}
            </p>
          </div>

        </section>
      </div>

      {/* ── RIGHT: actuals + forecast ── */}
      <div className="min-w-0 flex flex-col">
        <section className="kk-section p-6 lg:p-8 flex-1">
          <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
            <div>
              <p className="kk-overline mb-2">Actuals &amp; forecast</p>
              <h2 className="kk-h2" style={{ color: "var(--kk-ink)" }}>
                <CountUp value={Math.round(ytd)} prefix="RM " /> earned year to date
              </h2>
            </div>
            <div className="shrink-0">
              <FilterSelect
                value={String(year)}
                onChange={(v) => router.replace(`/performance?year=${v}`, { scroll: false })}
                options={Array.from({ length: 7 }, (_, i) => { const y = new Date().getFullYear() - 3 + i; return { value: String(y), label: String(y) }; })}
                minWidth={100}
              />
            </div>
          </div>

          <TimelineRow
            label="Per-month commission"
            months={initialMonths}
            max={maxBar}
            goal={liveGoal}
            valueOf={(m) => m.isFuture ? forecastPerMonth : m.commission}
            formatter={(v) => v === 0 ? "−" : `RM ${(v / 1000).toFixed(1)}k`}
          />

          {/* Cumulative running total */}
          <div className="mt-6">
            <p className="kk-overline mb-3">Cumulative running total</p>
            <div className="overflow-x-auto">
            <div className="grid grid-cols-12 gap-2" style={{ minWidth: "480px" }}>
              {initialMonths.map((m, i) => {
                const cum = cumulativeActuals[i];
                const isPastZero = (m.isPast || m.isCurrent) && cum === 0;
                return (
                  <div key={m.key} className="text-center">
                    <div
                      className="rounded-lg py-1"
                      style={{
                        background: m.isFuture
                          ? "var(--kk-green-soft)"
                          : m.isPast
                            ? "var(--kk-surface-2)"
                            : "var(--kk-green-soft)",
                        color: m.isFuture
                          ? "var(--kk-ink-faint)"
                          : m.isPast
                            ? "var(--kk-ink-faint)"
                            : "var(--kk-ink)",
                        border: m.isFuture ? "1px dashed rgba(52,199,89,0.3)" : "1px solid transparent",
                      }}
                    >
                      <p className="text-[11px] font-semibold tabular-nums">
                        {isPastZero ? "−" : <CountUp value={cum} prefix="RM " formatter={(v) => `${(v / 1000).toFixed(1)}k`} />}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </div>

        </section>
      </div>

    </div>
  );
}

function TimelineRow({ label, months, max, goal, valueOf, formatter }: {
  label: string;
  months: MonthCell[];
  max: number;
  goal?: number;
  valueOf: (m: MonthCell) => number;
  formatter: (v: number) => string;
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const goalLinePct = goal && max > 0 ? Math.min((goal / max) * 100, 100) : null;

  return (
    <div>
      <p className="kk-overline mb-3">{label}</p>

      <div className="overflow-x-auto">
      <div style={{ minWidth: "480px" }}>
      {/* Bar area: fixed height, goal line lives here */}
      <div className="relative h-20">
        <div className="grid grid-cols-12 gap-2 h-full items-end">
          {months.map((m) => {
            const v = valueOf(m);
            const heightPct = max > 0 ? (v / max) * 100 : 0;
            const barColor = m.isPast
              ? "var(--kk-ink-faint)"
              : m.isCurrent
                ? "var(--kk-green)"
                : "rgba(52,199,89,0.18)";
            const isHovered = hoveredKey === m.key;
            const showTooltip = isHovered && !(v === 0 && m.isPast);
            return (
              <div
                key={m.key}
                className="relative h-full flex items-end"
                onMouseEnter={() => setHoveredKey(m.key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                {showTooltip && (
                  <div
                    className="absolute left-1/2 z-20 pointer-events-none"
                    style={{ bottom: "calc(100% + 6px)", transform: "translateX(-50%)", whiteSpace: "nowrap" }}
                  >
                    <div className="rounded-lg px-2.5 py-1.5 text-center" style={{ background: "var(--kk-ink)", boxShadow: "0 4px 14px rgba(0,0,0,0.22)" }}>
                      <p className="text-[12px] font-semibold tabular-nums text-white leading-none">
                        {m.isFuture ? "~" : ""}{v === 0 ? "−" : `RM ${v.toLocaleString()}`}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.60)" }}>{m.label} {m.year}</p>
                    </div>
                    <div className="flex justify-center">
                      <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid var(--kk-ink)" }} />
                    </div>
                  </div>
                )}
                <div
                  className="w-full rounded-t-md transition-all duration-500"
                  style={{
                    height: `${Math.max(4, heightPct)}%`,
                    background: barColor,
                    opacity: v === 0 ? 0.35 : isHovered ? 0.75 : 1,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Goal line rendered after bars so it sits on top */}
        {goalLinePct !== null && (
          <div
            className="absolute left-0 right-0 pointer-events-none flex items-center gap-1.5"
            style={{ bottom: `${goalLinePct}%`, zIndex: 10 }}
          >
            <div className="flex-1 border-t border-dashed" style={{ borderColor: "rgba(0,0,0,0.35)" }} />
            <span className="text-[9px] font-semibold shrink-0" style={{ color: "var(--kk-ink)" }}>Goal</span>
          </div>
        )}
      </div>

      {/* Labels below bars */}
      <div className="grid grid-cols-12 gap-2 mt-2">
        {months.map((m) => {
          const v = valueOf(m);
          const labelColor = m.isPast ? "var(--kk-ink-faint)" : m.isCurrent ? "var(--kk-ink)" : "var(--kk-ink-faint)";
          return (
            <div key={m.key} className="text-center">
              <p className="text-[11px] font-semibold tabular-nums leading-none" style={{ color: labelColor }}>
                {v === 0 && m.isPast ? "−" : <CountUp value={v} formatter={formatter} />}
              </p>
              <p className="text-[11px] mt-1 leading-tight" style={{ color: m.isCurrent ? "var(--kk-ink)" : "var(--kk-ink-faint)", fontWeight: m.isCurrent ? 600 : 400 }}>
                {m.label}
              </p>
              {m.isCurrent && (
                <p className="text-[10px] font-medium" style={{ color: "var(--kk-green)" }}>Today</p>
              )}
            </div>
          );
        })}
      </div>
      </div>
      </div>
    </div>
  );
}
