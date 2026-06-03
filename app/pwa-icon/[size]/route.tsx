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
        <svg viewBox="0 0 24 24" width={logoSz} height={logoSz} fill="#1C1C1E">
          <rect x="3.5" y="3" width="4" height="18" rx="0.5" />
          <path d="M7.5 12 L18.5 3 L21 5.5 L10 14.5 Z" />
          <path d="M7.5 12 L10 9.5 L21 18.5 L18.5 21 Z" />
        </svg>
      </div>
    ),
    { width: sz, height: sz }
  );
}
