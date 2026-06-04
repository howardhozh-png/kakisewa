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
        <svg viewBox="0 0 24 24" width={26} height={26} fill="none">
          <path d="M6 3 L6 21" stroke="#000000" strokeWidth="3" strokeLinecap="butt" />
          <path
            d="M17 5 C 20,4 1,6 6,12 C 11,18 5,20 17,21"
            stroke="#000000"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { width: 32, height: 32 }
  );
}
