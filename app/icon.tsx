import { ImageResponse } from "next/og";
import { loadDmSerifFont } from "@/lib/load-dm-serif";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const fontData = await loadDmSerifFont();

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
            fontFamily: "DM Serif Display",
            fontSize: 28,
            fontWeight: 400,
            color: "#000000",
            lineHeight: 1,
            paddingBottom: 2,
          }}
        >
          k
        </div>
      </div>
    ),
    {
      width: 32,
      height: 32,
      fonts: [{ name: "DM Serif Display", data: fontData, style: "normal", weight: 400 }],
    }
  );
}
