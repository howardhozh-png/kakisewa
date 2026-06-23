"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const DISMISS_KEY = "kk-ref-banner-v1";

export function ReferralBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(DISMISS_KEY)) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="mb-4 flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{ background: "var(--kk-blue)", color: "#fff" }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-snug">
          Refer 12 agents, get 1 full year free
        </p>
        <p className="text-[11px] mt-0.5" style={{ opacity: 0.82 }}>
          Each referral earns credit equal to their first payment.
        </p>
      </div>
      <Link
        href="/subscription"
        className="shrink-0 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-opacity hover:opacity-85"
        style={{ background: "rgba(255,255,255,0.18)", color: "#fff", whiteSpace: "nowrap" }}
      >
        Get my code
      </Link>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-lg p-1 transition-opacity hover:opacity-70"
        style={{ color: "rgba(255,255,255,0.7)" }}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
