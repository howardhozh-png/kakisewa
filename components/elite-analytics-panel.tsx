import { getEliteAnalyticsData } from "@/lib/db";
import { TrendingUp, TrendingDown, RefreshCw, Users, MousePointer } from "lucide-react";

function fmt(n: number) {
  if (n >= 1_000_000) return `RM ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `RM ${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `RM ${Math.round(n).toLocaleString()}`;
}

// ── 1. Year-over-Year ─────────────────────────────────────────────────────────

function YoYBenchmark({
  currentYear, lastYear,
  monthsCurrent, monthsLast,
  totalCurrent, totalLast,
}: {
  currentYear: number; lastYear: number;
  monthsCurrent: Array<{ label: string; amount: number }>;
  monthsLast:    Array<{ label: string; amount: number }>;
  totalCurrent: number; totalLast: number;
}) {
  const now = new Date();
  const curMonthIdx = now.getMonth();
  const growth = totalLast > 0 ? ((totalCurrent - totalLast) / totalLast) * 100 : null;
  const isUp = growth !== null && growth >= 0;

  const pairs = monthsCurrent.slice(0, curMonthIdx + 1).map((cur, i) => ({
    label: cur.label,
    curr: cur.amount,
    last: monthsLast[i]?.amount ?? 0,
  }));
  const maxVal = Math.max(1, ...pairs.flatMap((p) => [p.curr, p.last]));

  return (
    <div className="kk-section p-5">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-3.5 h-3.5" style={{ color: "var(--kk-ink-faint)" }} />
        <p className="kk-overline">This year vs last year</p>
      </div>
      <div className="flex items-end gap-3 mb-0.5">
        <p className="kk-metric-lg" style={{ color: "var(--kk-theme-dark)" }}>{fmt(totalCurrent)}</p>
        {growth !== null && (
          <span className="text-[13px] font-semibold mb-1"
            style={{ color: isUp ? "#1F8B4C" : "#DC2626" }}>
            {isUp ? "+" : ""}{growth.toFixed(0)}% YoY
          </span>
        )}
      </div>
      <p className="text-[11px] mb-4" style={{ color: "var(--kk-ink-faint)" }}>
        {currentYear} YTD vs {lastYear} same period
      </p>

      {pairs.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${pairs.length}, 1fr)`, gap: "0.25rem" }}>
          {pairs.map((p) => {
            const hCurr = Math.max(3, (p.curr / maxVal) * 72);
            const hLast = Math.max(3, (p.last / maxVal) * 72);
            return (
              <div key={p.label} className="flex flex-col items-center gap-0.5">
                <div className="w-full flex items-end gap-0.5" style={{ height: 72 }}>
                  <div className="flex-1 rounded-t-sm" title={`${lastYear}: ${fmt(p.last)}`}
                    style={{ height: hLast, background: "var(--kk-line-strong)" }} />
                  <div className="flex-1 rounded-t-sm" title={`${currentYear}: ${fmt(p.curr)}`}
                    style={{ height: hCurr, background: "var(--kk-theme-dark)" }} />
                </div>
                <p className="text-[9px]" style={{ color: "var(--kk-ink-faint)" }}>{p.label}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>No commission data yet this year.</p>
      )}

      <div className="flex items-center gap-4 mt-3">
        {[
          { color: "var(--kk-line-strong)", label: String(lastYear) },
          { color: "var(--kk-theme-dark)",  label: String(currentYear) },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--kk-ink-faint)" }}>
            <span className="w-3 h-2 rounded-sm inline-block" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── 2. Renewal Income Recovery ────────────────────────────────────────────────

function RenewalRecovery({
  recovered, total, missed, recoveredCount, missedCount,
}: {
  recovered: number; total: number; missed: number;
  recoveredCount: number; missedCount: number;
}) {
  const recoverPct = total > 0 ? Math.round((recovered / total) * 100) : 0;

  return (
    <div className="kk-section p-5">
      <div className="flex items-center gap-2 mb-1">
        <RefreshCw className="w-3.5 h-3.5" style={{ color: "var(--kk-ink-faint)" }} />
        <p className="kk-overline">Renewal income</p>
      </div>
      <p className="kk-metric-lg mb-0.5" style={{ color: "var(--kk-theme-dark)" }}>{fmt(recovered)}</p>
      <p className="text-[11px] mb-4" style={{ color: "var(--kk-ink-faint)" }}>
        Recovered this year · {recoverPct}% of potential
      </p>

      {/* Recovery bar */}
      <div className="rounded-full overflow-hidden mb-4" style={{ height: 8, background: "var(--kk-surface-2)" }}>
        <div className="h-full rounded-full transition-all"
          style={{ width: `${recoverPct}%`, background: recoverPct >= 70 ? "#1F8B4C" : recoverPct >= 40 ? "#f59e0b" : "#DC2626" }} />
      </div>

      {/* Three stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Recovered", value: fmt(recovered), sub: `${recoveredCount} tenancies`, color: "#1F8B4C" },
          { label: "Total potential", value: fmt(total), sub: `${recoveredCount + missedCount} expiring`, color: "var(--kk-ink)" },
          { label: "Missed", value: fmt(missed), sub: `${missedCount} lost`, color: "#DC2626" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ background: "var(--kk-surface-2)" }}>
            <p className="text-[15px] font-black tabular-nums" style={{ color }}>{value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>{label}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 3. Lead Conversion by Availability Date ───────────────────────────────────

function LeadConversion({
  leadConversion,
}: {
  leadConversion: Array<{ month: string; label: string; total: number; matched: number; rate: number }>;
}) {
  const maxTotal = Math.max(1, ...leadConversion.map((m) => m.total));

  return (
    <div className="kk-section p-5">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-3.5 h-3.5" style={{ color: "var(--kk-ink-faint)" }} />
        <p className="kk-overline">Lead conversion</p>
      </div>
      <p className="text-[11px] mb-4" style={{ color: "var(--kk-ink-faint)" }}>
        Owner leads by availability date · matched vs total
      </p>

      {leadConversion.length === 0 ? (
        <p className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>No leads with availability dates yet.</p>
      ) : (
        <div className="space-y-2.5">
          {leadConversion.map((m) => {
            const barW = Math.max(2, (m.total / maxTotal) * 100);
            const matchW = m.total > 0 ? (m.matched / m.total) * barW : 0;
            return (
              <div key={m.month}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold" style={{ color: "var(--kk-ink)" }}>{m.label}</span>
                  <span className="text-[11px] tabular-nums" style={{ color: "var(--kk-ink-mute)" }}>
                    {m.matched}/{m.total}
                    {" "}
                    <span style={{ color: m.rate >= 50 ? "#1F8B4C" : m.rate >= 20 ? "#f59e0b" : "var(--kk-ink-faint)" }}>
                      {m.rate}%
                    </span>
                  </span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: 6, background: "var(--kk-surface-2)" }}>
                  <div className="h-full flex">
                    <div className="rounded-full" style={{ width: `${matchW}%`, background: "#1F8B4C" }} />
                    <div style={{ width: `${barW - matchW}%`, background: "var(--kk-line-strong)" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-4 mt-4">
        {[
          { color: "#1F8B4C", label: "Matched" },
          { color: "var(--kk-line-strong)", label: "Not yet matched" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--kk-ink-faint)" }}>
            <span className="w-3 h-2 rounded-sm inline-block" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── 4. Outreach Click Rate ────────────────────────────────────────────────────

function OutreachClickRate({
  ownerTotal, ownerContacted, ownerClickRate,
  tenantIntakeSent, tenantIntake30d,
}: {
  ownerTotal: number; ownerContacted: number; ownerClickRate: number;
  tenantIntakeSent: number; tenantIntake30d: number;
}) {
  const stats = [
    {
      label: "Owner outreach rate",
      value: `${ownerClickRate}%`,
      sub: `${ownerContacted} of ${ownerTotal} leads contacted`,
      pct: ownerClickRate,
      color: ownerClickRate >= 60 ? "#1F8B4C" : ownerClickRate >= 30 ? "#f59e0b" : "#DC2626",
    },
    {
      label: "Tenant profiles sent",
      value: String(tenantIntakeSent),
      sub: `${tenantIntake30d} in last 30 days`,
      pct: tenantIntakeSent > 0 ? Math.min(100, tenantIntake30d * 10) : 0,
      color: "var(--kk-theme-dark)",
    },
  ];

  return (
    <div className="kk-section p-5">
      <div className="flex items-center gap-2 mb-1">
        <MousePointer className="w-3.5 h-3.5" style={{ color: "var(--kk-ink-faint)" }} />
        <p className="kk-overline">Outreach activity</p>
      </div>
      <p className="text-[11px] mb-5" style={{ color: "var(--kk-ink-faint)" }}>
        Owner link clicks and tenant profile sends
      </p>

      <div className="space-y-5">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="flex items-baseline justify-between mb-1.5">
              <p className="text-[12px] font-semibold" style={{ color: "var(--kk-ink)" }}>{s.label}</p>
              <p className="text-[18px] font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
            </div>
            <div className="rounded-full overflow-hidden mb-1" style={{ height: 6, background: "var(--kk-surface-2)" }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${s.pct}%`, background: s.color }} />
            </div>
            <p className="text-[10px]" style={{ color: "var(--kk-ink-faint)" }}>{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function EliteAnalyticsPanel() {
  const data = await getEliteAnalyticsData();

  return (
    <div className="mb-8">
      <p className="kk-overline mb-1">Elite analytics</p>
      <h2 className="serif text-[22px] font-bold mb-6" style={{ color: "var(--kk-ink)" }}>
        Deep performance insights
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <YoYBenchmark
          currentYear={data.yoy.currentYear}
          lastYear={data.yoy.lastYear}
          monthsCurrent={data.yoy.monthsCurrent}
          monthsLast={data.yoy.monthsLast}
          totalCurrent={data.yoy.totalCurrent}
          totalLast={data.yoy.totalLast}
        />
        <RenewalRecovery
          recovered={data.renewalRecovery.recovered}
          total={data.renewalRecovery.total}
          missed={data.renewalRecovery.missed}
          recoveredCount={data.renewalRecovery.recoveredCount}
          missedCount={data.renewalRecovery.missedCount}
        />
        <LeadConversion leadConversion={data.leadConversion} />
        <OutreachClickRate
          ownerTotal={data.outreach.ownerTotal}
          ownerContacted={data.outreach.ownerContacted}
          ownerClickRate={data.outreach.ownerClickRate}
          tenantIntakeSent={data.outreach.tenantIntakeSent}
          tenantIntake30d={data.outreach.tenantIntake30d}
        />
      </div>
    </div>
  );
}
