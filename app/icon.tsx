import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const ARM1_ANGLE = Math.atan2(-7, 11) * (180 / Math.PI);
const ARM2_ANGLE = Math.atan2(9, 11) * (180 / Math.PI);
const ARM1_LEN_FRAC = Math.sqrt(170) / 24;
const ARM2_LEN_FRAC = Math.sqrt(202) / 24;

export default function Icon() {
  const sz = 32;
  const L = Math.round(sz * 0.72);
  const sw = (2.8 / 24) * L;
  const stemLeft = (4.6 / 24) * L;
  const stemTop = (3 / 24) * L;
  const stemH = (18 / 24) * L;
  const midX = (6 / 24) * L;
  const midY = (12 / 24) * L;

  return new ImageResponse(
    (
      <div
        style={{
          width: sz,
          height: sz,
          background: "#FFFFFF",
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ position: "relative", width: L, height: L }}>
          <div style={{ position: "absolute", left: stemLeft, top: stemTop, width: sw, height: stemH, background: "#000000" }} />
          <div style={{ position: "absolute", left: midX, top: midY - sw / 2, width: ARM1_LEN_FRAC * L, height: sw, background: "#000000", transformOrigin: "0 50%", transform: `rotate(${ARM1_ANGLE}deg)` }} />
          <div style={{ position: "absolute", left: midX, top: midY - sw / 2, width: ARM2_LEN_FRAC * L, height: sw, background: "#000000", transformOrigin: "0 50%", transform: `rotate(${ARM2_ANGLE}deg)` }} />
        </div>
      </div>
    ),
    { width: sz, height: sz }
  );
}
