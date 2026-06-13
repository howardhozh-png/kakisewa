"use client";

import { PAGE_HELP_EVENT } from "./onboarding-demo-dialog";

interface Props {
  module: 0 | 1 | 2 | 3;
  pageTitle: string;
  bullets: string[];
  noVideo?: boolean;
  variant?: "info" | "question";
}

export function PageHelpButton({ module, pageTitle, bullets, noVideo, variant = "info" }: Props) {
  function open() {
    document.dispatchEvent(
      new CustomEvent(PAGE_HELP_EVENT, { detail: { module, pageTitle, bullets, noVideo } })
    );
  }

  if (variant === "question") {
    return (
      <button
        onClick={open}
        aria-label={`How ${pageTitle} works`}
        className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80 active:scale-95"
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#1C1C1E",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "2px 0",
        }}
      >
        <span
          className="inline-flex items-center justify-center rounded-full"
          style={{
            width: 18,
            height: 18,
            background: "#FEF3C7",
            border: "1.5px solid #1C1C1E",
            color: "#1C1C1E",
            fontSize: 10,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          ?
        </span>
        How this works
      </button>
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
