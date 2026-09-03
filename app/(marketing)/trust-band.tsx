"use client";

const LOGOS: { key: string; src: string; label: string; height: number }[] = [
  { key: "shell",      src: "/logos/shell.svg",     label: "Shell",             height: 44 },
  { key: "mcdonalds",  src: "/logos/mcdonalds.svg", label: "McDonald's",        height: 40 },
  { key: "pwc",        src: "/logos/pwc.svg",        label: "PwC",               height: 28 },
  { key: "jnj",        src: "/logos/jnj.svg",        label: "Johnson & Johnson", height: 24 },
  { key: "razer",      src: "/logos/razer.svg",      label: "Razer",             height: 24 },
  { key: "brevo",      src: "/logos/brevo.svg",      label: "Brevo",             height: 28 },
  { key: "resend",     src: "/logos/resend.svg",     label: "Resend",            height: 22 },
  { key: "mozilla",    src: "/logos/mozilla.svg",    label: "Mozilla",           height: 22 },
];

function SupabaseMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-label="Supabase">
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
      padding: "52px 32px 56px",
    }}>
      <div style={{ maxWidth: 880, margin: "0 auto", textAlign: "center" }}>

        {/* Supabase badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#C7C7CC" }}>
            Your data is hosted on
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <SupabaseMark />
            <span style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.01em", lineHeight: 1 }}>
              Supabase
            </span>
          </div>
        </div>

        {/* Trust statement — directly below Supabase */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginBottom: 40 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p style={{ fontSize: 13, color: "#AEAEB2", margin: 0 }}>
            Only you can access your own data. Not even we can read it.
          </p>
        </div>

        {/* "Also trusted by" label */}
        <p style={{ fontSize: 13, color: "#C7C7CC", margin: "0 0 32px", letterSpacing: "0.01em" }}>
          The same infrastructure also trusted by
        </p>

        {/* Logo row — wraps on mobile */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "24px 44px",
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
