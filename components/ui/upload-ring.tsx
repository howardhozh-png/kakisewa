"use client";

/**
 * Apple-style circular upload progress ring.
 * SVG-based, smooth CSS transition, no dependencies.
 */
export function UploadRing({
  progress,
  size = 40,
  color = "#1C1C1E",
}: {
  progress: number;
  size?: number;
  color?: string;
}) {
  const stroke = Math.max(2, size * 0.065);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (Math.min(Math.max(progress, 0), 100) / 100) * circ;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)", display: "block" }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          style={{ transition: "stroke-dasharray 0.2s ease" }}
        />
      </svg>
      {/* Percentage label */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.round(size * 0.24),
          fontWeight: 600,
          lineHeight: 1,
          color,
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          letterSpacing: "-0.02em",
        }}
      >
        {Math.round(progress)}
      </div>
    </div>
  );
}
