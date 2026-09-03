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

function SupabaseMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="Supabase">
      <path d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C-.33 13.427.65 15.455 2.409 15.455h9.579l.113 7.51c.014.985 1.259 1.408 1.873.636l9.262-11.653c1.093-1.375.113-3.403-1.645-3.403h-9.642z" fill="#3FCF8E" />
    </svg>
  );
}

export function TrustBand() {
  return (
    <section style={{
      background: "#fff",
      borderTop: "1px solid rgba(0,0,0,0.06)",
      borderBottom: "1px solid rgba(0,0,0,0.06)",
      padding: "72px 32px 80px",
    }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", textAlign: "center" }}>

        {/* Title: "Your data is hosted on Supabase" — all one heading in dark ink */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: "#1D1D1F", letterSpacing: "-0.01em" }}>
            Your data is hosted on
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SupabaseMark />
            <span style={{ fontSize: 22, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.02em", lineHeight: 1 }}>
              Supabase
            </span>
          </div>
        </div>

        {/* Trust statement — inline icon so it wraps cleanly on mobile */}
        <p style={{ fontSize: 14, color: "#AEAEB2", margin: "0 0 52px", textAlign: "center" }}>
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="#AEAEB2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
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

        {/* Logo row — wraps on mobile */}
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
