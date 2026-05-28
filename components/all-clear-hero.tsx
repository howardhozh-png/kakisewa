import { Sparkles } from "lucide-react";

interface Props {
  monthLabel: string;
  totalRent: number;
  tenantCount: number;
}

export function AllClearHero({ monthLabel, totalRent, tenantCount }: Props) {
  return (
    <section
      className="kk-section relative overflow-hidden text-center py-16 px-6"
      style={{
        background:
          "radial-gradient(circle at top, rgba(52,199,89,0.10), transparent 60%), var(--kk-surface)",
      }}
    >
      <div className="relative max-w-xl mx-auto">
        <div
          className="w-14 h-14 rounded-2xl mx-auto mb-6 flex items-center justify-center"
          style={{ background: "var(--kk-green-soft)" }}
        >
          <Sparkles className="w-6 h-6" style={{ color: "var(--kk-green)" }} />
        </div>
        <p className="kk-overline mb-3" style={{ color: "var(--kk-green)" }}>{monthLabel} · all clear</p>
        <h2
          className="serif kk-display"
          style={{ color: "var(--kk-ink)", lineHeight: 1.05 }}
        >
          Everyone&apos;s paid up.
        </h2>
        <p className="mt-4 kk-body-sm" style={{ color: "var(--kk-ink-mute)" }}>
          You collected <span className="font-semibold" style={{ color: "var(--kk-ink)" }}>RM {totalRent.toLocaleString()}</span> from {tenantCount} tenant{tenantCount === 1 ? "" : "s"}. {monthLabel} is fully closed. Nice work.
        </p>
      </div>
    </section>
  );
}
