"use client";

/* Inline SVG logo components — actual brand colours, no external deps */

function SupabaseMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="Supabase">
      <path d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C-.33 13.427.65 15.455 2.409 15.455h9.579l.113 7.51c.014.985 1.259 1.408 1.873.636l9.262-11.653c1.093-1.375.113-3.403-1.645-3.403h-9.642z" fill="#3FCF8E" />
    </svg>
  );
}

function ShellLogo({ height = 40 }: { height?: number }) {
  return (
    <svg height={height} viewBox="0 0 24 24" fill="none" aria-label="Shell" style={{ display: "block" }}>
      <path fill="#FFD500" d="M12 .863C5.34.863 0 6.251 0 12.98c0 .996.038 1.374.246 2.33l3.662 2.71.57 4.515h6.102l.326.227c.377.262.705.375 1.082.375.352 0 .732-.101 1.024-.313l.39-.289h6.094l.563-4.515 3.695-2.71c.208-.956.246-1.334.246-2.33C24 6.252 18.661.863 12 .863zm.996 2.258c.9 0 1.778.224 2.512.649l-2.465 12.548 3.42-12.062c1.059.36 1.863.941 2.508 1.814l.025.034-4.902 10.615 5.572-9.713.033.03c.758.708 1.247 1.567 1.492 2.648l-6.195 7.666 6.436-6.5.01.021c.253.563.417 1.36.417 1.996 0 .509-.024.712-.164 1.25l-3.554 2.602-.467 3.71h-4.475l-.517.395c-.199.158-.482.266-.682.266-.199 0-.483-.108-.682-.266l-.517-.394H6.322l-.445-3.61-3.627-2.666c-.11-.436-.16-.83-.16-1.261 0-.72.159-1.49.426-2.053l.013-.024 6.45 6.551L2.75 9.621c.25-1.063.874-2.09 1.64-2.713l5.542 9.776L4.979 6.1c.555-.814 1.45-1.455 2.546-1.827l3.424 12.069L8.355 3.816l.055-.03c.814-.45 1.598-.657 2.457-.657.195 0 .286.004.528.03l.587 13.05.46-13.059c.224-.025.309-.029.554-.029z" />
    </svg>
  );
}

function McDonaldsLogo({ height = 38 }: { height?: number }) {
  return (
    <svg height={height} viewBox="0 0 24 24" fill="none" aria-label="McDonald's" style={{ display: "block" }}>
      <path fill="#FBC817" d="M17.243 3.006c2.066 0 3.742 8.714 3.742 19.478H24c0-11.588-3.042-20.968-6.766-20.968-2.127 0-4.007 2.81-5.248 7.227-1.241-4.416-3.121-7.227-5.231-7.227C3.031 1.516 0 10.888 0 22.476h3.014c0-10.763 1.658-19.47 3.724-19.47 2.066 0 3.741 8.05 3.741 17.98h2.997c0-9.93 1.684-17.98 3.75-17.98Z" />
    </svg>
  );
}

function PwCLogo() {
  return (
    <svg height={34} viewBox="0 0 72 34" fill="none" aria-label="PwC" style={{ display: "block" }}>
      <text x="0" y="28" fontFamily="'Helvetica Neue', Arial, sans-serif" fontSize="30" fontWeight="300" fill="#D04A02" letterSpacing="-0.5">PwC</text>
    </svg>
  );
}

function JJLogo() {
  return (
    <svg height={26} viewBox="0 0 230 26" fill="none" aria-label="Johnson and Johnson" style={{ display: "block" }}>
      <text x="0" y="22" fontFamily="Georgia, 'Times New Roman', serif" fontSize="20" fontStyle="italic" fontWeight="400" fill="#CC0000">Johnson {"&"} Johnson</text>
    </svg>
  );
}

function RazerLogo() {
  return (
    <svg height={22} viewBox="0 0 96 22" fill="none" aria-label="Razer" style={{ display: "block" }}>
      <text x="0" y="18" fontFamily="'Helvetica Neue', Arial, sans-serif" fontSize="18" fontWeight="700" letterSpacing="3" fill="#44D62C">RAZER</text>
    </svg>
  );
}

const LOGOS = [
  { key: "shell",     el: <ShellLogo /> },
  { key: "mcdonalds", el: <McDonaldsLogo /> },
  { key: "pwc",       el: <PwCLogo /> },
  { key: "jnj",       el: <JJLogo /> },
  { key: "razer",     el: <RazerLogo /> },
];

export function TrustBand() {
  return (
    <section style={{
      background: "#fff",
      borderTop: "1px solid rgba(0,0,0,0.06)",
      borderBottom: "1px solid rgba(0,0,0,0.06)",
      padding: "56px 32px 60px",
    }}>
      <div style={{ maxWidth: 840, margin: "0 auto", textAlign: "center" }}>

        {/* Overline + Supabase badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#C7C7CC" }}>
            Your data is hosted on
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <SupabaseMark size={22} />
            <span style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.01em", lineHeight: 1 }}>
              Supabase
            </span>
          </div>
        </div>

        {/* Sub-label */}
        <p style={{ fontSize: 14, color: "#AEAEB2", margin: "0 0 44px" }}>
          The same infrastructure also trusted by
        </p>

        {/* Logo row — wraps on mobile */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "32px 48px",
          marginBottom: 48,
        }}>
          {LOGOS.map(({ key, el }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", opacity: 0.85 }}>
              {el}
            </div>
          ))}
        </div>

        {/* Trust statement */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p style={{ fontSize: 13, color: "#AEAEB2", margin: 0 }}>
            Only you can access your own data. Not even we can read it.
          </p>
        </div>

      </div>
    </section>
  );
}
