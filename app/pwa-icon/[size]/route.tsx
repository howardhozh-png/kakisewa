import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: s } = await params;
  const sz = Math.min(512, Math.max(16, parseInt(s) || 192));
  const logoSz = Math.round(sz * 0.72);

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
        <svg viewBox="0 0 24 24" width={logoSz} height={logoSz} fill="none" shape-rendering="crispEdges">
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
    { width: sz, height: sz }
  );
}
