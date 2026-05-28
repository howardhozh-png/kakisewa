import { MonthlyCollection } from "@/lib/types";

interface Props {
  months: MonthlyCollection[];
}

export function ThreeMonthChart({ months }: Props) {
  if (months.length === 0) return null;

  const backlog = months
    .slice(0, -1) // exclude current month from "backlog"
    .reduce((s, m) => s + m.outstanding, 0);
  const totalCurrent = months[months.length - 1];

  return (
    <section className="kk-section p-6 lg:p-8">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <p className="kk-overline mb-2">Last 3 months</p>
          <p className="kk-h2" style={{ color: "var(--kk-ink)" }}>Collection trend</p>
        </div>
        {backlog > 0 ? (
          <div className="text-right">
            <p className="kk-overline mb-1.5" style={{ color: "var(--kk-red)" }}>Backlog</p>
            <p className="text-[20px] font-semibold tabular-nums" style={{ color: "var(--kk-red)", letterSpacing: "-0.014em" }}>
              RM {backlog.toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="text-right">
            <p className="kk-overline mb-1.5" style={{ color: "var(--kk-green)" }}>Past months</p>
            <p className="text-[14px] font-medium" style={{ color: "var(--kk-green)" }}>All clear ✓</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {months.map((m, i) => {
          const isCurrent = i === months.length - 1;
          return <Donut key={m.month} m={m} highlight={isCurrent} />;
        })}
      </div>

      {totalCurrent.pct >= 100 && (
        <p
          className="mt-6 text-[13px] text-center font-medium"
          style={{ color: "var(--kk-green)" }}
        >
          {totalCurrent.label} fully collected. Nice work. 🎉
        </p>
      )}
    </section>
  );
}

function Donut({ m, highlight }: { m: MonthlyCollection; highlight?: boolean }) {
  const size = 96;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (m.pct / 100) * c;
  const ringColor = m.pct >= 100 ? "var(--kk-green)" : m.pct >= 70 ? "var(--kk-blue)" : m.pct >= 40 ? "var(--kk-amber)" : "var(--kk-red)";

  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl p-5 transition-colors"
      style={{
        background: highlight ? "var(--kk-surface)" : "var(--kk-surface-2)",
        border: `1px solid ${highlight ? "var(--kk-line-strong)" : "var(--kk-line)"}`,
      }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="var(--kk-surface-2)" strokeWidth={stroke}
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={ringColor} strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            style={{ transition: "stroke-dasharray 600ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-[18px] font-semibold tabular-nums"
            style={{ color: "var(--kk-ink)", letterSpacing: "-0.014em" }}
          >
            {m.pct}%
          </span>
        </div>
      </div>
      <div className="text-center">
        <p
          className="text-[13px] font-semibold"
          style={{ color: highlight ? "var(--kk-ink)" : "var(--kk-ink-soft)" }}
        >
          {m.label}
        </p>
        <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: "var(--kk-ink-faint)" }}>
          RM {m.collected.toLocaleString()} / {m.total.toLocaleString()}
        </p>
        {m.paymentCount > 0 && (
          <p className="text-[11px] mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>
            {m.paidCount}/{m.paymentCount} paid
          </p>
        )}
      </div>
    </div>
  );
}
