export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        padding: "2rem",
        background: "#FBFBFD",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          background: "#1C1C1E",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 24 24" width={46} height={46} fill="white">
          <rect x="3.5" y="3" width="4" height="18" rx="0.5" />
          <path d="M7.5 12 L18.5 3 L21 5.5 L10 14.5 Z" />
          <path d="M7.5 12 L10 9.5 L21 18.5 L18.5 21 Z" />
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <h1 className="kk-h1">You are offline</h1>
        <p className="kk-body" style={{ color: "#6E6E73", maxWidth: 320 }}>
          Check your connection and try again.
        </p>
      </div>

      <a
        href="/home"
        className="kk-pill kk-pill-primary"
        style={{ marginTop: "0.5rem" }}
      >
        Go to home
      </a>
    </div>
  );
}
