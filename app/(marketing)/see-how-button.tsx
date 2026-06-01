"use client";

import { DEMO_EVENT } from "@/components/onboarding-demo-modal";

export function SeeHowButton() {
  return (
    <button
      onClick={() => document.dispatchEvent(new CustomEvent(DEMO_EVENT))}
      className="px-8 py-3.5 rounded-full font-semibold transition-opacity hover:opacity-70"
      style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)", fontSize: "var(--kk-body-lg)" }}
    >
      See how it works
    </button>
  );
}
