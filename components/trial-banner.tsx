"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const urgent = daysLeft <= 3;
  const label = daysLeft === 1 ? "1 day" : `${daysLeft} days`;

  return (
    <div
      className="relative flex items-center justify-center gap-2 px-4 py-2 text-center"
      style={{
        background: urgent ? "#DC2626" : "var(--kk-ink)",
        color: "#fff",
        fontSize: "var(--kk-sm)",
        lineHeight: 1.4,
      }}
    >
      <span>
        <strong>{label} left</strong> on your free trial.{" "}
        <a
          href="mailto:support@kakisewa.com?subject=Subscribe%20to%20kakisewa"
          className="underline font-semibold opacity-90 hover:opacity-100 transition-opacity"
        >
          Contact us to subscribe
        </a>{" "}
        and keep your data.
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
