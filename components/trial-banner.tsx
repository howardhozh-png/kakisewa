"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";

export function TrialBanner({ daysLeft }: { daysLeft: number }) {
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

  return (
    <div
      className="flex items-center justify-center gap-3 px-4 py-2.5 text-center relative"
      style={{ background: "#DC2626", color: "#fff", fontSize: "var(--kk-sm)", lineHeight: 1.4 }}
    >
      <span>
        Your Elite trial ends in <strong>{label}</strong>. Choose your plan to keep your data.{" "}
        <Link
          href="/subscription"
          className="underline font-semibold opacity-90 hover:opacity-100 transition-opacity"
        >
          Choose plan →
        </Link>
      </span>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
