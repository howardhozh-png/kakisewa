import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  const buf = readFileSync(join(process.cwd(), "public/fonts/dm-serif-display.ttf"));
  const fontData = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;

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
