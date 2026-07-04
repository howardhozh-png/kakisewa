"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  trialDaysLeft: number;
}

export function TrialWelcomeBanner({ trialDaysLeft }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      style={{
        background: "var(--kk-green-soft, #F0FFF4)",
        borderBottom: "1px solid rgba(52,199,89,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "8px 40px",
        fontSize: 13,
        fontWeight: 500,
        color: "var(--kk-green-ink, #1F8B4C)",
        position: "relative",
        minHeight: 36,
      }}
    >
      <span>Free trial</span>
      <span style={{ opacity: 0.35 }}>·</span>
      <span><strong>{trialDaysLeft} days remaining</strong></span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          position: "absolute", right: 10,
          background: "none", border: "none", cursor: "pointer",
          color: "var(--kk-green-ink, #1F8B4C)", opacity: 0.45,
          lineHeight: 0, padding: 6,
        }}
      >
        <X style={{ width: 13, height: 13 }} />
      </button>
    </div>
  );
}
