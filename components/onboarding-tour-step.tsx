"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  targetId: string;
  stepLabel: string;
  title: string;
  body: string;
  ctaLabel: string;
  onNext: () => void;
}

// Same visual language as TourSpotlight (ring + tooltip) but driven by an
// explicit CTA button rather than dismiss-on-target-click, since this drives
// a controlled multi-page sequence (existing listing -> my listing -> home)
// rather than a single standalone tip.
export function OnboardingTourStep({ targetId, stepLabel, title, body, ctaLabel, onNext }: Props) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    function update() {
      const el = document.getElementById(targetId);
      if (el) setRect(el.getBoundingClientRect());
    }
    function scrollToTarget() {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // Retried, not one-shot: something else on the destination page can win
    // a scroll-position race against a single scrollIntoView call right
    // after navigation, leaving the target (and this tooltip) off-screen.
    scrollToTarget();
    update();
    const timers = [100, 350, 700, 1100].map((ms) =>
      setTimeout(() => { scrollToTarget(); update(); }, ms)
    );
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [mounted, targetId]);

  if (!mounted || !rect) return null;

  const GAP = 7;
  const spotTop = rect.top - GAP;
  const spotLeft = rect.left - GAP;
  const spotW = rect.width + GAP * 2;
  const spotH = rect.height + GAP * 2;

  const TIP_W = 280;
  let tipLeft = rect.left - GAP;
  if (tipLeft + TIP_W > window.innerWidth - 12) tipLeft = window.innerWidth - TIP_W - 12;
  if (tipLeft < 12) tipLeft = 12;

  const belowTop = rect.bottom + GAP + 14;
  const aboveTop = rect.top - GAP - 190 - 14;
  const tipBelow = belowTop + 190 < window.innerHeight - 20;
  const tipTop = tipBelow ? belowTop : aboveTop;
  const arrowOff = Math.max(12, Math.min(rect.left + rect.width / 2 - tipLeft - 7, TIP_W - 26));

  return createPortal(
    <>
      <div
        style={{
          position: "fixed",
          top: spotTop, left: spotLeft,
          width: spotW, height: spotH,
          borderRadius: 12,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          border: "2.5px solid rgba(0,113,227,0.9)",
          pointerEvents: "none",
          zIndex: 10002,
          animation: "kk-tour-ring 2s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: tipTop, left: tipLeft,
          width: TIP_W,
          zIndex: 10002,
          background: "var(--kk-surface)",
          borderRadius: 16,
          padding: "18px 20px",
          boxShadow: "0 16px 48px rgba(0,0,0,0.20), 0 2px 8px rgba(0,0,0,0.08)",
          border: "1px solid var(--kk-line)",
        }}
      >
        <svg
          viewBox="0 0 14 8"
          style={{
            position: "absolute",
            width: 14, height: 8,
            left: arrowOff,
            ...(tipBelow ? { top: -7 } : { bottom: -7 }),
          }}
        >
          <path d={tipBelow ? "M7 0L14 8H0L7 0Z" : "M7 8L0 0H14L7 8Z"} fill="var(--kk-surface)" />
        </svg>

        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--kk-blue)", marginBottom: 7 }}>
          {stepLabel}
        </p>
        <p style={{ fontSize: 15, fontWeight: 700, color: "var(--kk-ink)", marginBottom: 6, lineHeight: 1.3 }}>
          {title}
        </p>
        <p style={{ fontSize: 13, color: "var(--kk-ink-mute)", lineHeight: 1.6, marginBottom: 14 }}>
          {body}
        </p>

        <button
          type="button"
          onClick={onNext}
          className="kk-pill kk-pill-primary"
          style={{ width: "100%", justifyContent: "center", display: "inline-flex" }}
        >
          {ctaLabel}
        </button>
      </div>
    </>,
    document.body,
  );
}
