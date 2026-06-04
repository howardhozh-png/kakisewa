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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#000000",
            lineHeight: 1,
            letterSpacing: "-0.04em",
          }}
        >
          k
        </div>
      </div>
    ),
    { width: 32, height: 32 }
  );
}
