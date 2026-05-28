"use client";

import React from "react";

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  description?: string;
  dropoffLabel?: string;
  dropoffCount?: number;   // explicit leakage override (skips consecutive computation)
  actionLabel?: string;    // green CTA pill shown below this stage's leakage
  featured?: boolean;      // applies prominent glow — for the "key" stage (e.g. Listed)
  color: string;
  textColor: string;
  href?: string;
}

interface Props {
  stages: FunnelStage[];
}

export function FunnelChart({ stages }: Props) {
  if (stages.length === 0) return null;

  const top = stages[0].count || 1;

  // transitions[i] = leakage leaving stages[i] (toward stages[i+1])
  const transitions = stages.slice(0, -1).map((s, i) => {
    const next = stages[i + 1];
    const dropoff =
      s.dropoffCount !== undefined
        ? s.dropoffCount
        : Math.max(0, s.count - next.count);
    const pct = s.count > 0 ? Math.round((dropoff / s.count) * 100) : 0;
    return {
      dropoff,
      pct,
      label: next.dropoffLabel ?? (dropoff > 0 ? `${pct}% didn't advance` : "all progressed"),
    };
  });

  return (
    <div style={{ width: "100%", padding: 12 }}>
      {/* ── Chevron row ── */}
      <div className="flex items-stretch" style={{ position: "relative" }}>
        {stages.map((s, i) => {
          const pctOfTop = Math.round((s.count / top) * 100);
          const isFirst = i === 0;
          const isLast = i === stages.length - 1;

          let clipPath: string;
          if (isFirst) {
            clipPath = "polygon(0 0, calc(100% - 22px) 0, 100% 50%, calc(100% - 22px) 100%, 0 100%)";
          } else if (isLast) {
            clipPath = "polygon(22px 0, 100% 0, 100% 100%, 22px 100%, 0 50%)";
          } else {
            clipPath = "polygon(22px 0, calc(100% - 22px) 0, 100% 50%, calc(100% - 22px) 100%, 22px 100%, 0 50%)";
          }

          const inner = (
            <div
              style={{
                clipPath,
                background: s.color,
                height: 80,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                paddingLeft: isFirst ? 12 : 34,
                paddingRight: isLast ? 12 : 34,
                width: "100%",
              }}
            >
              <p
                className="text-[13px] font-semibold leading-tight"
                style={{ color: s.textColor, letterSpacing: "-0.011em" }}
              >
                {s.label}
              </p>
              <p
                className="text-[12px] tabular-nums mt-0.5"
                style={{ color: s.textColor, opacity: 0.78 }}
              >
                {s.count}
              </p>
            </div>
          );

          // filter: drop-shadow works with clip-path; box-shadow is clipped and invisible
          const glowFilter = s.featured
            ? "drop-shadow(0 0 14px rgba(52,199,89,0.65)) drop-shadow(0 0 32px rgba(52,199,89,0.35)) drop-shadow(0 4px 10px rgba(0,0,0,0.15))"
            : "drop-shadow(0 4px 10px rgba(0,0,0,0.14))";

          return (
            <div
              key={s.key}
              className="flex-1 min-w-0"
              style={{
                marginRight: isLast ? 0 : -22,
                position: "relative",
                zIndex: stages.length - i,
                filter: glowFilter,
              }}
            >
              {s.href ? (
                <a href={s.href} className="block hover:opacity-80 transition-opacity cursor-pointer" style={{ height: "100%" }}>
                  {inner}
                </a>
              ) : (
                inner
              )}
            </div>
          );
        })}
      </div>

      {/* ── Leakage + action pill row (outside chevrons, no overlap margin) ── */}
      <div className="flex mt-3 items-start">
        {stages.map((s, i) => {
          const t = i < transitions.length ? transitions[i] : null;
          const hasLeakage = t && t.dropoff > 0;
          const hasAction = !!s.actionLabel && !!s.href;
          return (
            <div
              key={s.key}
              className="flex-1 min-w-0 flex flex-col items-center gap-1.5 pt-1 px-1"
            >
              {/* Fixed-height leakage line so all pills sit at the same vertical level */}
              <p
                className="text-[10px] tabular-nums text-center leading-snug"
                style={{ color: "var(--kk-ink-faint)", minHeight: "2rem", display: "flex", alignItems: "flex-start", justifyContent: "center" }}
              >
                {hasLeakage ? `↓ ${t!.dropoff} ${t!.label}` : ""}
              </p>
              {/* Action pill always shows when actionLabel is set */}
              {hasAction && (
                <a
                  href={s.href}
                  className="kk-scale-hover text-[11px] font-semibold px-3 py-1 rounded-full text-center w-full inline-block"
                  style={{
                    background: "rgba(52,199,89,0.13)",
                    color: "#1F8B4C",
                    border: "1px solid rgba(52,199,89,0.28)",
                  }}
                >
                  {s.actionLabel}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
