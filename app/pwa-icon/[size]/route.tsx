import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: s } = await params;
  const sz = Math.min(512, Math.max(16, parseInt(s) || 192));
  const logoSz = Math.round(sz * 0.56);

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
        <svg viewBox="0 0 24 24" width={logoSz} height={logoSz} fill="#000000">
          <rect x="3.5" y="3" width="4" height="18" />
          <path d="M6.53 10.54 L20.03 1.54 L21.97 4.46 L8.47 13.46 Z" />
          <path d="M8.47 10.54 L21.97 19.54 L20.03 22.46 L6.53 13.46 Z" />
        </svg>
      </div>
    ),
    { width: sz, height: sz }
  );
}
