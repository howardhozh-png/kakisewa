"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, ShieldCheck } from "lucide-react";

export function TrialCardNudge({ daysLeft }: { daysLeft: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const key = `kk_card_nudge_dismissed_${today}`;
    if (!localStorage.getItem(key)) setVisible(true);
  }, []);

  function dismiss() {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`kk_card_nudge_dismissed_${today}`, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2"
      style={{
        background: "var(--kk-amber, #FF9500)",
        color: "#fff",
        fontSize: "var(--kk-sm)",
      }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <ShieldCheck className="w-4 h-4 shrink-0" />
        <span className="truncate">
          {daysLeft} days left on your trial. Save a card now and you won&apos;t be charged until trial ends.{" "}
          <Link
            href="/subscription"
            className="underline font-semibold opacity-90 hover:opacity-100 transition-opacity"
          >
            Secure access →
          </Link>
        </span>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="w-8 h-8 flex items-center justify-center rounded-full opacity-80 hover:opacity-100 transition-opacity shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
