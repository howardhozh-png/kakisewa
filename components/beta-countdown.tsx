"use client";

import { useEffect, useState } from "react";
import { BETA_END } from "@/lib/types";

export function BetaCountdown() {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    const calc = () => {
      setDays(Math.max(0, Math.ceil((BETA_END.getTime() - Date.now()) / 86_400_000)));
    };
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, []);

  if (days === null) return null;

  const pct = Math.min(100, Math.max(0, (days / 90) * 100));
  const color = days > 30 ? "var(--kk-green)" : days > 10 ? "var(--kk-amber)" : "var(--kk-red)";

  return (
    <div
      className="hidden md:inline-flex items-center gap-2 px-2.5 py-1 rounded-full"
      style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}
      data-tooltip={`${days} days left in Beta`}
    >
      <svg width="14" height="14" viewBox="0 0 26 26">
        <circle cx="13" cy="13" r="10" fill="none" stroke="var(--kk-line)" strokeWidth="3" />
        <circle
          cx="13" cy="13" r="10"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${(pct / 100) * 62.8} 62.8`}
          strokeLinecap="round"
          transform="rotate(-90 13 13)"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>{days}d beta</span>
    </div>
  );
}
