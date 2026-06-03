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
        <svg viewBox="0 0 24 24" width={28} height={28} fill="none">
          <path
            d="M6 3 L6 21 M6 12 L17 5 M6 12 L17 21"
            stroke="#000000"
            strokeWidth="2.8"
            strokeLinecap="butt"
            strokeLinejoin="miter"
          />
        </svg>
      </div>
    ),
    { width: 32, height: 32 }
  );
}
