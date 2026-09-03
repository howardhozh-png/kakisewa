"use client";

const LOGOS: { key: string; src: string; label: string; height: number }[] = [
  { key: "shell",     src: "/logos/shell.svg",     label: "Shell",             height: 56 },
  { key: "mcdonalds", src: "/logos/mcdonalds.svg", label: "McDonald's",        height: 52 },
  { key: "pwc",       src: "/logos/pwc.svg",        label: "PwC",               height: 36 },
  { key: "jnj",       src: "/logos/jnj.svg",        label: "Johnson & Johnson", height: 30 },
  { key: "razer",     src: "/logos/razer.svg",      label: "Razer",             height: 30 },
  { key: "brevo",     src: "/logos/brevo.svg",      label: "Brevo",             height: 36 },
  { key: "resend",    src: "/logos/resend.svg",     label: "Resend",            height: 28 },
  { key: "mozilla",   src: "/logos/mozilla.svg",    label: "Mozilla",           height: 28 },
];

export function TrustBand() {
  return (
    <section style={{
      background: "#fff",
      borderTop: "1px solid rgba(0,0,0,0.06)",
      borderBottom: "1px solid rgba(0,0,0,0.06)",
      padding: "72px 32px 80px",
    }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", textAlign: "center" }}>

        {/* Overline number */}
        <p style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#C7C7CC",
          margin: "0 0 14px",
        }}>
          Your data
        </p>

        {/* Full-sentence serif heading */}
        <h2 className="serif" style={{
          fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
          color: "#1D1D1F",
          lineHeight: 1.1,
          letterSpacing: "-0.022em",
          margin: "0 0 20px",
          fontWeight: 400,
        }}>
          <span style={{ color: "#C7C7CC" }}>04 </span>{"Your data is hosted on "}
          <span style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.22em", verticalAlign: "middle" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/supabase.svg"
              alt=""
              style={{ display: "inline", height: "0.82em", width: "auto", verticalAlign: "middle", position: "relative", top: "-0.04em" }}
            />
            Supabase
          </span>
        </h2>

        {/* Trust statement */}
        <p style={{ fontSize: 14, color: "var(--kk-ink-mute)", margin: "0 0 56px", textAlign: "center" }}>
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            style={{ display: "inline", verticalAlign: "middle", marginRight: 6, position: "relative", top: -1 }}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Only you can access your own data. Not even we can read it.
        </p>

        {/* "Also trusted by" label */}
        <p style={{ fontSize: 13, color: "#C7C7CC", margin: "0 0 40px", letterSpacing: "0.01em" }}>
          The same infrastructure also trusted by
        </p>

        {/* Logo row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "32px 56px",
        }}>
          {LOGOS.map(({ key, src, label, height }) => (
            <div key={key} style={{ display: "flex", alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={label}
                style={{ display: "block", height: height, width: "auto" }}
              />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
