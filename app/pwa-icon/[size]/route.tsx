import { ImageResponse } from "next/og";
import { loadDmSerifFontEdge } from "@/lib/load-dm-serif";

export const runtime = "edge";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: s } = await params;
  const sz = Math.min(512, Math.max(16, parseInt(s) || 192));
  const fontSize = Math.round(sz * 0.68);

  const origin = new URL(req.url).origin;
  const fontData = await loadDmSerifFontEdge(origin);

  return new ImageResponse(
    (
      <div
        style={{
          width: sz,
          height: sz,
          background: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: "DM Serif Display",
            fontSize,
            fontWeight: 400,
            color: "#000000",
            lineHeight: 1,
          }}
        >
          k
        </div>
      </div>
    ),
    {
      width: sz,
      height: sz,
      fonts: [{ name: "DM Serif Display", data: fontData, style: "normal", weight: 400 }],
    }
  );
}
