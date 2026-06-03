import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#FFFFFF",
          borderRadius: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 24 24" width={117} height={117} fill="#1C1C1E">
          <rect x="3.5" y="3" width="4" height="18" rx="0.5" />
          <path d="M7.5 12 L18.5 3 L21 5.5 L10 14.5 Z" />
          <path d="M7.5 12 L10 9.5 L21 18.5 L18.5 21 Z" />
        </svg>
      </div>
    ),
    { width: 180, height: 180 }
  );
}
