import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: s } = await params;
  const sz = Math.min(512, Math.max(16, parseInt(s) || 192));
  const fontSize = Math.round(sz * 0.72);

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
            fontSize,
            fontWeight: 800,
            color: "#000000",
            lineHeight: 1,
            fontFamily: "sans-serif",
          }}
        >
          k
        </div>
      </div>
    ),
    { width: sz, height: sz }
  );
}
