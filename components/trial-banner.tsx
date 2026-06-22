"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const PLAN_CAPS = [
  { name: "Silver",   cards: 50 },
  { name: "Gold",     cards: 150 },
  { name: "Platinum", cards: 400 },
  { name: "Elite",    cards: 1000 },
];

export function TrialBanner({
  daysLeft,
  isBeta,
  currentCardCount,
}: {
  daysLeft: number;
  isBeta?: boolean;
  currentCardCount?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const key = `kk_trial_banner_dismissed_${today}`;
    if (!localStorage.getItem(key)) setVisible(true);
  }, []);

  function dismiss() {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`kk_trial_banner_dismissed_${today}`, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const label = daysLeft === 1 ? "1 day" : `${daysLeft} days`;
  const periodLabel = isBeta ? "beta access" : "trial";
  const cardCount = currentCardCount ?? 0;

  return (
    <div
      className="px-4 py-2.5 relative"
      style={{ background: "#DC2626", color: "#fff", fontSize: "var(--kk-sm)", lineHeight: 1.4 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-4 pr-8">
        <span className="font-semibold">
          {periodLabel === "beta access" ? "Beta" : "Trial"} ends in <strong>{label}</strong> — choose your plan now
        </span>

        {currentCardCount !== undefined && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] opacity-80">You have {cardCount} cards:</span>
            {PLAN_CAPS.map(p => {
              const fits = cardCount <= p.cards;
              return (
                <span
                  key={p.name}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{
                    background: fits ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.25)",
                    opacity: fits ? 1 : 0.55,
                  }}
                >
                  {fits ? "✓" : "✗"} {p.name}
                </span>
              );
            })}
          </div>
        )}

        <Link
          href="/subscription"
          className="underline font-semibold opacity-90 hover:opacity-100 transition-opacity whitespace-nowrap"
        >
          Choose plan →
        </Link>
      </div>

      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
