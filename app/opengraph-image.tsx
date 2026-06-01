import { ImageResponse } from "next/og";

export const alt = "kakisewa — #1 property agent platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#1C1C1E",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* K logo mark */}
        <svg viewBox="0 0 24 24" width={112} height={112} fill="white">
          <rect x="3.5" y="3" width="4" height="18" rx="0.5" />
          <path d="M7.5 12 L18.5 3 L21 5.5 L10 14.5 Z" />
          <path d="M7.5 12 L10 9.5 L21 18.5 L18.5 21 Z" />
        </svg>

        {/* Text */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "-3px",
              lineHeight: 1,
            }}
          >
            kakisewa
          </div>
          <div
            style={{
              fontSize: 30,
              color: "rgba(255,255,255,0.45)",
              letterSpacing: "-0.5px",
            }}
          >
            #1 property agent platform
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
