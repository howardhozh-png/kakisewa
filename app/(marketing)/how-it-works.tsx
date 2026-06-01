const STEPS = [
  {
    num: "01",
    title: "Add your listings once",
    desc: "Enter each property with its contract end date. KakiSewa starts tracking renewals and leads automatically from day one.",
  },
  {
    num: "02",
    title: "KakiSewa watches. You get notified.",
    desc: "60 days before every expiry — and every time a tenant shows interest — you get an alert. No spreadsheet. No gut feel.",
  },
  {
    num: "03",
    title: "You close first. Every time.",
    desc: "Send one branded tenant pack link. The owner picks. You look like a top agency before you even walk in.",
  },
];

export function HowItWorks() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-px" style={{ background: "var(--kk-line)" }}>
      {STEPS.map((step) => (
        <div key={step.num} className="px-8 py-10" style={{ background: "var(--kk-surface-2)" }}>
          <p
            className="serif font-black mb-5"
            style={{
              fontSize: "clamp(2.5rem, 3.5vw, 3.25rem)",
              color: "var(--kk-line-strong)",
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {step.num}
          </p>
          <p
            className="serif mb-3"
            style={{
              fontSize: "clamp(1.15rem, 1.5vw, 1.35rem)",
              lineHeight: 1.2,
              letterSpacing: "-0.015em",
              color: "var(--kk-ink)",
            }}
          >
            {step.title}
          </p>
          <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.65 }}>
            {step.desc}
          </p>
        </div>
      ))}
    </div>
  );
}
