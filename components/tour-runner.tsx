"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import { TOURS } from "@/lib/tours";

export function TourRunner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  const tourId = searchParams.get("tour");
  const stepKey = searchParams.get("step") ?? "1";

  const tour = tourId ? TOURS[tourId] : null;
  const stepIndex = tour ? tour.steps.findIndex(s => s.key === stepKey) : -1;
  const step = tour && stepIndex !== -1 ? tour.steps[stepIndex] : null;
  const isActive = !!step;
  const isLast = tour ? stepIndex === tour.steps.length - 1 : false;

  useEffect(() => { setMounted(true); }, []);

  const measureTarget = useCallback(() => {
    if (!step) return;
    const el = document.getElementById(step.targetId);
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      setTimeout(() => setRect(el.getBoundingClientRect()), 80);
    }
  }, [step]);

  useEffect(() => {
    if (!isActive || !mounted) return;
    const timer = setTimeout(measureTarget, 200);
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [isActive, mounted, measureTarget]);

  function dismiss() {
    if (!tour) return;
    try { localStorage.setItem(tour.storageKey, "1"); } catch {}
    const params = new URLSearchParams(window.location.search);
    params.delete("tour");
    params.delete("step");
    const qs = params.toString();
    router.replace(window.location.pathname + (qs ? "?" + qs : ""), { scroll: false });
  }

  function advance() {
    if (!tour || !step) return;

    // Programmatically perform the UI action for this step
    if (step.clickTargetOnNext) {
      const el = document.getElementById(step.targetId);
      if (el) el.click();
    }

    if (isLast) {
      try { localStorage.setItem(tour.storageKey, "1"); } catch {}
      const params = new URLSearchParams(window.location.search);
      params.delete("tour");
      params.delete("step");
      const qs = params.toString();
      router.replace(window.location.pathname + (qs ? "?" + qs : ""), { scroll: false });
    } else {
      const nextStep = tour.steps[stepIndex + 1];
      setRect(null); // clear rect so tooltip doesn't flash in wrong position
      const params = new URLSearchParams(window.location.search);
      params.set("tour", tour.id);
      params.set("step", nextStep.key);
      const qs = params.toString();
      router.replace(window.location.pathname + (qs ? "?" + qs : ""), { scroll: false });
    }
  }

  if (!isActive || !mounted || !rect || !tour || !step) return null;

  const totalSteps = tour.steps.length;
  const stepNum = stepIndex + 1;

  const GAP = 8;
  const spotTop  = rect.top    - GAP;
  const spotLeft = rect.left   - GAP;
  const spotW    = rect.width  + GAP * 2;
  const spotH    = rect.height + GAP * 2;

  const TIP_W = 288;
  const TIP_H = 220;
  let tipLeft = rect.left - GAP;
  if (tipLeft + TIP_W > window.innerWidth - 12) tipLeft = window.innerWidth - TIP_W - 12;
  if (tipLeft < 12) tipLeft = 12;

  const belowTop = rect.bottom + GAP + 14;
  const aboveTop = rect.top - GAP - TIP_H - 14;
  const tipBelow = belowTop + TIP_H < window.innerHeight - 20;
  let tipTop = tipBelow ? belowTop : aboveTop;
  tipTop = Math.max(12, Math.min(tipTop, window.innerHeight - TIP_H - 12));
  const arrowOff = Math.max(12, Math.min(rect.left + rect.width / 2 - tipLeft - 7, TIP_W - 26));

  return createPortal(
    <>
      {/* Full-screen block — prevents clicking anything under the overlay.
          Does NOT dismiss on click so users don't accidentally kill the tour. */}
      <div style={{ position: "fixed", inset: 0, zIndex: 600 }} />

      {/* Spotlight ring — visual frame, pointer-events none */}
      <div
        style={{
          position: "fixed",
          top: spotTop, left: spotLeft,
          width: spotW, height: spotH,
          borderRadius: 12,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.48)",
          border: "2.5px solid rgba(0,113,227,0.9)",
          pointerEvents: "none",
          zIndex: 601,
          animation: "kk-tour-ring 2s ease-in-out infinite",
        }}
      />

      {/* Tooltip */}
      <div
        style={{
          position: "fixed",
          top: tipTop, left: tipLeft,
          width: TIP_W,
          zIndex: 602,
          background: "var(--kk-surface)",
          borderRadius: 16,
          padding: "18px 20px 16px",
          boxShadow: "0 16px 48px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.08)",
          border: "1px solid var(--kk-line)",
          animation: "kk-demo-card-in 0.3s cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        {/* arrow */}
        <svg viewBox="0 0 14 8" style={{ position: "absolute", width: 14, height: 8, left: arrowOff, ...(tipBelow ? { top: -7 } : { bottom: -7 }) }}>
          <path d={tipBelow ? "M7 0L14 8H0L7 0Z" : "M7 8L0 0H14L7 8Z"} fill="var(--kk-surface)" />
        </svg>

        {/* step counter */}
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--kk-blue)", marginBottom: 7 }}>
          Step {stepNum} of {totalSteps}
        </p>

        {/* title */}
        <p style={{ fontSize: 15, fontWeight: 700, color: "var(--kk-ink)", marginBottom: 6, lineHeight: 1.3 }}>
          {step.title}
        </p>

        {/* body */}
        <p style={{ fontSize: 12, color: "var(--kk-ink-mute)", lineHeight: 1.6, marginBottom: 16 }}>
          {step.body}
        </p>

        {/* progress dots */}
        <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
          {tour.steps.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === stepIndex ? 16 : 6,
                height: 6, borderRadius: 99,
                background: i === stepIndex ? "var(--kk-blue)" : "rgba(0,113,227,0.20)",
                transition: "width 0.25s",
              }}
            />
          ))}
        </div>

        {/* actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={dismiss}
            style={{ fontSize: 12, color: "var(--kk-ink-faint)", background: "none", border: "none", padding: "6px 2px", cursor: "pointer" }}
          >
            Skip tour
          </button>
          <button
            onClick={advance}
            style={{
              fontSize: 13, fontWeight: 700, padding: "7px 18px", borderRadius: 20,
              background: "var(--kk-blue)", color: "#fff", border: "none", cursor: "pointer",
            }}
          >
            {step.nextLabel} {!isLast && "→"}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
