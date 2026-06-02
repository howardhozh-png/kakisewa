"use client";

import { PAGE_HELP_EVENT } from "./onboarding-demo-modal";

interface Props {
  module: 0 | 1 | 2;
  pageTitle: string;
  bullets: string[];
}

export function PageHelpButton({ module, pageTitle, bullets }: Props) {
  function open() {
    document.dispatchEvent(
      new CustomEvent(PAGE_HELP_EVENT, { detail: { module, pageTitle, bullets } })
    );
  }

  return (
    <button
      onClick={open}
      aria-label={`How ${pageTitle} works`}
      className="inline-flex items-center justify-center rounded-full transition-all hover:opacity-70 active:scale-95"
      style={{
        width: 22,
        height: 22,
        background: "var(--kk-surface-2)",
        border: "1.5px solid var(--kk-line-strong)",
        color: "var(--kk-ink-mute)",
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      i
    </button>
  );
}
