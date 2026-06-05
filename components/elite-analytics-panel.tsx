import { getLifecycleTenancies, getMonthlyCommissionTimeline, getAgentProfile, countOwnerLeads } from "@/lib/db";
import { Tenancy } from "@/lib/types";

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(n: number) {
  if (n >= 1_000_000) return `RM ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `RM ${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `RM ${Math.round(n).toLocaleString()}`;
}

// ── Commission Forecast ────────────────────────────────────────────────────────

function CommissionForecast({
  tenancies,
  actualByMonth,
}: {
  tenancies: Tenancy[];
  actualByMonth: Map<string, number>;
}) {
  const today = new Date();
  const months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const projected = tenancies
      .filter((t) => t.contract_end?.startsWith(key) && t.lifecycle_stage !== "closed")
      .reduce((sum, t) => sum + (t.amount ?? 0) * 0.5, 0);
    months.push({
      key,
      label: MONTH_SHORT[d.getMonth()],
      year: d.getFullYear(),
      isCurrent: i === 0,
      actual: actualByMonth.get(key) ?? 0,
      projected,
    });
  }

  const totalProjected = months.reduce((s, m) => s + m.projected, 0);
  const maxVal = Math.max(1, ...months.map((m) => Math.max(m.actual, m.projected)));

  return (
    <div className="kk-section p-5">
      <p className="kk-overline mb-1">Commission forecast</p>
      <p className="kk-metric-lg mb-0.5" style={{ color: "var(--kk-theme-dark)" }}>
        {fmt(totalProjected)}
      </p>
      <p className="text-[12px] mb-5" style={{ color: "var(--kk-ink-faint)" }}>
        Projected renewal income over next 6 months (50% of expiring rents)
      </p>

      <div className="grid grid-cols-6 gap-2">
        {months.map((m) => {
          const projH = maxVal > 0 ? Math.max(4, (m.projected / maxVal) * 80) : 4;
          const actualH = maxVal > 0 ? Math.max(4, (m.actual / maxVal) * 80) : 4;
          return (
            <div key={m.key} className="flex flex-col items-center gap-1">
              <div className="w-full flex items-end gap-0.5" style={{ height: 80 }}>
                <div className="flex-1 rounded-t-sm" title={`Projected: ${fmt(m.projected)}`}
                  style={{ height: projH, background: "color-mix(in srgb, var(--kk-theme-dark) 35%, transparent)", transition: "height 0.4s" }} />
                {m.actual > 0 && (
                  <div className="flex-1 rounded-t-sm" title={`Actual: ${fmt(m.actual)}`}
                    style={{ height: actualH, background: "var(--kk-theme-dark)", transition: "height 0.4s" }} />
                )}
              </div>
              <p className="text-[10px] font-semibold" style={{ color: m.isCurrent ? "var(--kk-ink)" : "var(--kk-ink-faint)" }}>
                {m.label}
              </p>
              {m.projected > 0 && (
                <p className="text-[9px] tabular-nums" style={{ color: "var(--kk-ink-mute)" }}>
                  {fmt(m.projected)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3">
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
          <span className="w-3 h-2 rounded-sm inline-block" style={{ background: "color-mix(in srgb, var(--kk-theme-dark) 35%, transparent)" }} />
          Projected
        </span>
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
          <span className="w-3 h-2 rounded-sm inline-block" style={{ background: "var(--kk-theme-dark)" }} />
          Actual earned
        </span>
      </div>
    </div>
  );
}

// ── Benchmarking ──────────────────────────────────────────────────────────────

function Benchmarking({
  thisYear,
  lastYear,
}: {
  thisYear: Array<{ label: string; commission: number; isPast: boolean; isCurrent: boolean }>;
  lastYear: Array<{ label: string; commission: number }>;
}) {
  const today = new Date();
  const currentMonthIdx = today.getMonth();

  // Only compare months that have passed (or current) in both years
  const pairs = thisYear.slice(0, currentMonthIdx + 1).map((cur, i) => ({
    label: cur.label,
    thisYear: cur.commission,
    lastYear: lastYear[i]?.commission ?? 0,
  }));

  const thisYTD = pairs.reduce((s, p) => s + p.thisYear, 0);
  const lastYTD = pairs.reduce((s, p) => s + p.lastYear, 0);
  const growth = lastYTD > 0 ? ((thisYTD - lastYTD) / lastYTD) * 100 : null;
  const maxVal = Math.max(1, ...pairs.flatMap((p) => [p.thisYear, p.lastYear]));

  return (
    <div className="kk-section p-5">
      <p className="kk-overline mb-1">Benchmarking</p>
      <div className="flex items-end gap-3 mb-0.5">
        <p className="kk-metric-lg" style={{ color: "var(--kk-theme-dark)" }}>{fmt(thisYTD)}</p>
        {growth !== null && (
          <span
            className="text-[13px] font-semibold mb-1"
            style={{ color: growth >= 0 ? "#1F8B4C" : "#DC2626" }}
          >
            {growth >= 0 ? "+" : ""}{growth.toFixed(0)}% YoY
          </span>
        )}
      </div>
      <p className="text-[12px] mb-5" style={{ color: "var(--kk-ink-faint)" }}>
        {today.getFullYear()} YTD vs {today.getFullYear() - 1} same period
      </p>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${pairs.length}, 1fr)`, gap: "0.375rem" }}>
        {pairs.map((p) => {
          const thisH = Math.max(4, (p.thisYear / maxVal) * 80);
          const lastH = Math.max(4, (p.lastYear / maxVal) * 80);
          return (
            <div key={p.label} className="flex flex-col items-center gap-1">
              <div className="w-full flex items-end gap-0.5" style={{ height: 80 }}>
                <div className="flex-1 rounded-t-sm"
                  title={`${today.getFullYear() - 1}: ${fmt(p.lastYear)}`}
                  style={{ height: lastH, background: "var(--kk-line-strong)" }} />
                <div className="flex-1 rounded-t-sm"
                  title={`${today.getFullYear()}: ${fmt(p.thisYear)}`}
                  style={{ height: thisH, background: "var(--kk-theme-dark)" }} />
              </div>
              <p className="text-[10px]" style={{ color: "var(--kk-ink-faint)" }}>{p.label}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3">
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
          <span className="w-3 h-2 rounded-sm inline-block" style={{ background: "var(--kk-line-strong)" }} />
          {today.getFullYear() - 1}
        </span>
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
          <span className="w-3 h-2 rounded-sm inline-block" style={{ background: "var(--kk-theme-dark)" }} />
          {today.getFullYear()}
        </span>
      </div>
    </div>
  );
}

// ── Portfolio Score ────────────────────────────────────────────────────────────

interface ScoreProps {
  leadCount: number;
  contractCount: number;
  ytdCommission: number;
  lastYearYTD: number;
  monthlyGoal: number;
  agentName: string | null | undefined;
  agentPhone: string | null | undefined;
  agentAgency: string | null | undefined;
}

function PortfolioScore({ leadCount, contractCount, ytdCommission, lastYearYTD, monthlyGoal, agentName, agentPhone, agentAgency }: ScoreProps) {
  const criteria: Array<{ label: string; pts: number; earned: number; detail: string }> = [
    {
      label: "Owner pipeline active",
      pts: 20,
      earned: leadCount > 0 ? 20 : leadCount > 0 ? 10 : 0,
      detail: leadCount > 0 ? `${leadCount} leads tracked` : "No leads uploaded yet",
    },
    {
      label: "Contracts tracked",
      pts: 20,
      earned: contractCount >= 5 ? 20 : contractCount >= 1 ? 10 : 0,
      detail: contractCount >= 5 ? `${contractCount} active contracts` : contractCount > 0 ? `${contractCount} contracts (add more)` : "No contracts added",
    },
    {
      label: "Income growth",
      pts: 30,
      earned: ytdCommission > 0 && ytdCommission > lastYearYTD ? 30 : ytdCommission > 0 ? 15 : 0,
      detail: ytdCommission > lastYearYTD
        ? "YTD ahead of last year"
        : ytdCommission > 0
        ? "YTD below last year — keep pushing"
        : "No commission logged yet",
    },
    {
      label: "Goal set",
      pts: 15,
      earned: monthlyGoal > 0 ? 15 : 0,
      detail: monthlyGoal > 0 ? `RM ${monthlyGoal.toLocaleString()}/month target` : "Set a monthly target",
    },
    {
      label: "Profile complete",
      pts: 15,
      earned: (agentName ? 5 : 0) + (agentPhone ? 5 : 0) + (agentAgency ? 5 : 0),
      detail: [!agentName && "Add name", !agentPhone && "Add phone", !agentAgency && "Add agency"].filter(Boolean).join(", ") || "Fully complete",
    },
  ];

  const score = criteria.reduce((s, c) => s + c.earned, 0);
  const maxScore = criteria.reduce((s, c) => s + c.pts, 0);
  const pct = Math.round((score / maxScore) * 100);

  const tier =
    pct >= 80 ? { label: "Elite performer", color: "#c98840" } :
    pct >= 60 ? { label: "On track", color: "#1F8B4C" } :
    pct >= 40 ? { label: "Building momentum", color: "var(--kk-blue)" } :
    { label: "Just getting started", color: "var(--kk-ink-mute)" };

  return (
    <div className="kk-section p-5">
      <p className="kk-overline mb-3">Portfolio score</p>
      <div className="flex items-center gap-5 mb-5">
        <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="40" cy="40" r="32" fill="none" stroke="var(--kk-surface-2)" strokeWidth="8" />
            <circle
              cx="40" cy="40" r="32"
              fill="none"
              stroke={tier.color}
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 32}`}
              strokeDashoffset={`${2 * Math.PI * 32 * (1 - pct / 100)}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[20px] font-black tabular-nums" style={{ color: "var(--kk-ink)" }}>{pct}</span>
          </div>
        </div>
        <div>
          <p className="text-[18px] font-bold" style={{ color: "var(--kk-ink)" }}>{pct}/100</p>
          <p className="text-[13px] font-semibold mt-0.5" style={{ color: tier.color }}>{tier.label}</p>
          <p className="text-[11px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>
            Based on pipeline, contracts, income growth, and profile
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {criteria.map((c) => (
          <div key={c.label} className="flex items-center gap-3">
            <div className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
              style={{
                background: c.earned === c.pts ? "#1F8B4C" : c.earned > 0 ? "#f59e0b" : "var(--kk-line)",
                color: c.earned > 0 ? "#fff" : "var(--kk-ink-faint)",
              }}>
              {c.earned === c.pts ? "✓" : c.earned > 0 ? "~" : "·"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold" style={{ color: "var(--kk-ink)" }}>{c.label}</p>
              <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>{c.detail}</p>
            </div>
            <span className="text-[12px] font-bold tabular-nums shrink-0" style={{ color: "var(--kk-ink-mute)" }}>
              {c.earned}/{c.pts}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function EliteAnalyticsPanel() {
  const today = new Date();
  const thisYearNum = today.getFullYear();
  const lastYearNum = thisYearNum - 1;

  const [tenancies, thisYearTimeline, lastYearTimeline, agent, leadCount] = await Promise.all([
    getLifecycleTenancies(),
    getMonthlyCommissionTimeline(thisYearNum),
    getMonthlyCommissionTimeline(lastYearNum),
    getAgentProfile(),
    countOwnerLeads().catch(() => 0),
  ]);

  const actualByMonth = new Map<string, number>();
  for (const m of thisYearTimeline.months) {
    if (m.commission > 0) actualByMonth.set(m.key, m.commission);
  }

  const currentMonthIdx = today.getMonth();
  const lastYearYTD = lastYearTimeline.months
    .slice(0, currentMonthIdx + 1)
    .reduce((s, m) => s + m.commission, 0);

  const contractCount = tenancies.filter((t) => t.lifecycle_stage !== "closed").length;

  return (
    <div className="mt-8">
      <p className="kk-overline mb-1">Elite analytics</p>
      <h2 className="serif text-[22px] font-bold mb-6" style={{ color: "var(--kk-ink)" }}>
        Deep performance insights
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CommissionForecast tenancies={tenancies} actualByMonth={actualByMonth} />
        <Benchmarking thisYear={thisYearTimeline.months} lastYear={lastYearTimeline.months} />
        <PortfolioScore
          leadCount={leadCount}
          contractCount={contractCount}
          ytdCommission={thisYearTimeline.ytd}
          lastYearYTD={lastYearYTD}
          monthlyGoal={thisYearTimeline.monthlyGoal}
          agentName={agent.name}
          agentPhone={agent.phone}
          agentAgency={agent.agency}
        />
      </div>
    </div>
  );
}
