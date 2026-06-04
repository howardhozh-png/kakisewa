import { ImageResponse } from "next/og";

export const runtime = "edge";

// Pre-computed: upper arm from (6,12)→(17,5), lower arm from (6,12)→(17,21)
const ARM1_ANGLE = Math.atan2(-7, 11) * (180 / Math.PI); // ≈ -32.47°
const ARM2_ANGLE = Math.atan2(9, 11) * (180 / Math.PI);  // ≈  39.29°
const ARM1_LEN_FRAC = Math.sqrt(170) / 24;               // ≈ 0.543
const ARM2_LEN_FRAC = Math.sqrt(202) / 24;               // ≈ 0.592

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: s } = await params;
  const sz = Math.min(512, Math.max(16, parseInt(s) || 192));
  const L = Math.round(sz * 0.72); // logo area (px)

  const sw = (2.8 / 24) * L;          // bar width (same as original strokeWidth)
  const stemLeft = (4.6 / 24) * L;    // left edge of vertical bar
  const stemTop = (3 / 24) * L;
  const stemH = (18 / 24) * L;
  const midX = (6 / 24) * L;          // arm pivot x (center of stem)
  const midY = (12 / 24) * L;         // arm pivot y

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
        {/* Pure CSS divs — no SVG, no stroke rendering, no 3D fringe */}
        <div style={{ position: "relative", display: "flex", width: L, height: L }}>
          {/* Vertical stem */}
          <div
            style={{
              position: "absolute",
              left: stemLeft,
              top: stemTop,
              width: sw,
              height: stemH,
              background: "#000000",
            }}
          />
          {/* Upper arm */}
          <div
            style={{
              position: "absolute",
              left: midX,
              top: midY - sw / 2,
              width: ARM1_LEN_FRAC * L,
              height: sw,
              background: "#000000",
              transformOrigin: "0 50%",
              transform: `rotate(${ARM1_ANGLE}deg)`,
            }}
          />
          {/* Lower arm */}
          <div
            style={{
              position: "absolute",
              left: midX,
              top: midY - sw / 2,
              width: ARM2_LEN_FRAC * L,
              height: sw,
              background: "#000000",
              transformOrigin: "0 50%",
              transform: `rotate(${ARM2_ANGLE}deg)`,
            }}
          />
        </div>
      </div>
    ),
    { width: sz, height: sz }
  );
}
