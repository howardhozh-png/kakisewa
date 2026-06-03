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
        <svg viewBox="0 0 24 24" width={logoSz} height={logoSz} fill="none">
          <path
            d="M5.5 3 L5.5 21 M5.5 12 L19.5 3.5 M5.5 12 L19.5 20.5"
            stroke="#000000"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { width: sz, height: sz }
  );
}
