"use client";

import { useMemo } from "react";

export interface DonutSegment {
  key: string;
  label: string;
  count: number;
  color: string;
  ink?: string;
  soft?: string;
}

interface Props {
  segments: DonutSegment[];
  centerLabel?: string;
  size?: number;
}

export function DonutChart({ segments, centerLabel = "total", size = 180 }: Props) {
  const total = useMemo(() => segments.reduce((s, x) => s + x.count, 0), [segments]);
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  // Build cumulative dash offsets
  const arcs = useMemo(() => {
    if (total === 0) return [];
    let offset = 0;
    return segments
      .filter((s) => s.count > 0)
      .map((s) => {
        const len = (s.count / total) * c;
        const arc = { ...s, dashArray: `${len} ${c - len}`, dashOffset: -offset };
        offset += len;
        return arc;
      });
  }, [segments, total, c]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--kk-surface-2)" strokeWidth={stroke}
        />
        {arcs.map((a) => (
          <circle
            key={a.key}
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={a.color} strokeWidth={stroke}
            strokeDasharray={a.dashArray}
            strokeDashoffset={a.dashOffset}
            style={{ transition: "stroke-dasharray 400ms ease, stroke-dashoffset 400ms ease" }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[34px] font-semibold tabular-nums leading-none"
          style={{ color: "var(--kk-ink)", letterSpacing: "-0.02em" }}
        >
          {total}
        </span>
        <span className="text-[11px] mt-1.5 uppercase tracking-widest font-semibold" style={{ color: "var(--kk-ink-faint)" }}>
          {centerLabel}
        </span>
      </div>
    </div>
  );
}

export function DonutLegend({ segments }: { segments: DonutSegment[] }) {
  return (
    <ul className="flex flex-col gap-2.5 min-w-[200px]">
      {segments.map((s) => (
        <li key={s.key} className="flex items-center gap-2.5 text-[13px]">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
          <span className="flex-1" style={{ color: "var(--kk-ink-soft)" }}>{s.label}</span>
          <span className="font-semibold tabular-nums" style={{ color: "var(--kk-ink)" }}>
            {s.count}
          </span>
        </li>
      ))}
    </ul>
  );
}
