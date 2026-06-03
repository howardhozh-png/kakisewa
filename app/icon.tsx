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
          background: "#FFFFFF",
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 24 24" width={22} height={22} fill="#000000">
          <rect x="3.5" y="3" width="4" height="18" />
          <path d="M6.53 10.54 L20.03 1.54 L21.97 4.46 L8.47 13.46 Z" />
          <path d="M8.47 10.54 L21.97 19.54 L20.03 22.46 L6.53 13.46 Z" />
        </svg>
      </div>
    ),
    { width: 32, height: 32 }
  );
}
