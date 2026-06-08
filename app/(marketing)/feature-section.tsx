import { Check } from "lucide-react";

const features = [
  {
    title: "Never miss an expiry",
    description:
      "Every lease tracked, every owner contacted before someone else gets there first.",
  },
  {
    title: "Reach owners under your brand",
    description:
      "One-tap WhatsApp blasts. Professional. Personalised. Yours.",
  },
  {
    title: "See your income before it happens",
    description:
      "Full pipeline ranked by urgency. Know exactly what to close next.",
  },
];

const pipelineRows = [
  { name: "Ahmad Farid", unit: "D-12-03", days: 14, hot: true },
  { name: "Priya Nair", unit: "A-07-11", days: 22, hot: true },
  { name: "Chen Wei Long", unit: "B-03-08", days: 45, hot: false },
  { name: "Nurul Ain", unit: "C-15-02", days: 67, hot: false },
];

export function FeatureSection() {
  return (
    <section
      className="px-6 lg:px-12 py-20"
      style={{ background: "var(--kk-surface-2)", borderTop: "1px solid var(--kk-line)" }}
    >
      <div className="max-w-[1100px] mx-auto">
        <div
          className="grid rounded-2xl p-8 lg:p-12 grid-cols-1 gap-10 items-center lg:grid-cols-2"
          style={{ border: "1px solid var(--kk-line)", background: "var(--kk-surface)" }}
        >
          {/* Left */}
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <span
                className="uppercase font-semibold"
                style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.14em" }}
              >
                Why kakisewa
              </span>
              <h2
                className="serif"
                style={{
                  fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.022em",
                  color: "var(--kk-ink)",
                }}
              >
                The system that closes renewals for you.
              </h2>
              <p
                style={{
                  fontSize: "var(--kk-body)",
                  color: "var(--kk-ink-mute)",
                  lineHeight: 1.65,
                  maxWidth: "42ch",
                }}
              >
                Most agents lose 30 to 40% of renewals not from laziness, but because they have no system. kakisewa is the system.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              {features.map((f) => (
                <div key={f.title} className="flex flex-row gap-4 items-start">
                  <Check
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: "var(--kk-green)", marginTop: 3 }}
                  />
                  <div>
                    <p
                      className="font-semibold"
                      style={{ fontSize: "var(--kk-body)", color: "var(--kk-ink)", marginBottom: 2 }}
                    >
                      {f.title}
                    </p>
                    <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.55 }}>
                      {f.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: pipeline mockup */}
          <div
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{ background: "#1A1A1A", minHeight: 320 }}
          >
            <div
              className="px-5 pt-5 pb-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.45)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Your Pipeline
              </span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                2 expiring soon
              </span>
            </div>

            <div className="flex-1 p-4 flex flex-col gap-2">
              {pipelineRows.map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
                      {row.name}
                    </p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{row.unit}</p>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.03em",
                      color: row.hot ? "#FF6B6B" : "rgba(255,255,255,0.35)",
                      background: row.hot ? "rgba(255,107,107,0.12)" : "rgba(255,255,255,0.06)",
                      padding: "3px 8px",
                      borderRadius: 6,
                    }}
                  >
                    {row.days}d left
                  </span>
                </div>
              ))}
            </div>

            <div
              className="px-5 py-4"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
            >
              <p
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 4,
                }}
              >
                Upcoming income
              </p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
                RM 14,800
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>next 12 months</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
