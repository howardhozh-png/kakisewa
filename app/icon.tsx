import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#1C1C1E",
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 24 24" width={22} height={22} fill="white">
          <rect x="3.5" y="3" width="4" height="18" rx="0.5" />
          <path d="M7.5 12 L18.5 3 L21 5.5 L10 14.5 Z" />
          <path d="M7.5 12 L10 9.5 L21 18.5 L18.5 21 Z" />
        </svg>
      </div>
    ),
    { width: 32, height: 32 }
  );
}
