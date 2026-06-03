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
        <svg viewBox="0 0 24 24" width={22} height={22} fill="none">
          <path
            d="M5.5 3 L5.5 21 M5.5 12 L19.5 3.5 M5.5 12 L19.5 20.5"
            stroke="#000000"
            strokeWidth="3.2"
            strokeLinecap="square"
          />
        </svg>
      </div>
    ),
    { width: 32, height: 32 }
  );
}
