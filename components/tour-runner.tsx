"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import { TOURS } from "@/lib/tours";

export function TourRunner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const stepRef = useRef<string | null>(null);

  const tourId = searchParams.get("tour");
  const stepKey = searchParams.get("step") ?? "1";

  const tour = tourId ? TOURS[tourId] : null;
  const stepIndex = tour ? tour.steps.findIndex(s => s.key === stepKey) : -1;
  const step = tour && stepIndex !== -1 ? tour.steps[stepIndex] : null;
  const isActive = !!step;
  const isLast = tour ? stepIndex === tour.steps.length - 1 : false;

  useEffect(() => { setMounted(true); }, []);

  // Retry-loop: polls for the target element every 100ms, up to 10 tries.
  // Needed because after a programmatic el.click() React may not have
  // finished re-rendering (e.g. expanding the WA panel) when we first look.
  useEffect(() => {
    if (!isActive || !mounted || !step) return;
    setRect(null);
    const targetId = step.targetId;
    stepRef.current = targetId; // track which step we're measuring
    let attempts = 0;

    function tryMeasure() {
      // Abort if the step changed while we were waiting
      if (stepRef.current !== targetId) return;
      const el = document.getElementById(targetId);
      if (!el) {
        if (attempts++ < 10) setTimeout(tryMeasure, 100);
        return;
      }
      // Scroll to center so the spotlight is always clearly visible
      el.scrollIntoView({ block: "center", behavior: "auto" });
      setTimeout(() => {
        if (stepRef.current !== targetId) return;
        const fresh = document.getElementById(targetId);
        if (fresh) setRect(fresh.getBoundingClientRect());
      }, 60);
    }

    const timer = setTimeout(tryMeasure, 120); // brief initial pause
    function onResize() {
      const el = document.getElementById(targetId);
      if (el) setRect(el.getBoundingClientRect());
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      clearTimeout(timer);
      stepRef.current = null;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [isActive, mounted, step]);

  function dismiss() {
    if (!tour) return;
    stepRef.current = null;
    const params = new URLSearchParams(window.location.search);
    params.delete("tour");
    params.delete("step");
    const qs = params.toString();
    router.replace(window.location.pathname + (qs ? "?" + qs : ""), { scroll: false });
  }

  function advance() {
    if (!tour || !step) return;
    stepRef.current = null; // stop pending measurement for current step

    // Perform the UI action for this step (expand panel, switch tab, etc.)
    if (step.clickTargetOnNext) {
      const el = document.getElementById(step.targetId);
      if (el) el.click();
    }

    if (isLast) {
      try { localStorage.setItem(tour.storageKey, "1"); } catch {}
      dismiss();
    } else {
      const nextStep = tour.steps[stepIndex + 1];
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
  const TIP_H = 230;
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
      {/* Full-screen block — prevents clicking anything while tour is active */}
      <div style={{ position: "fixed", inset: 0, zIndex: 600 }} />

      {/* Spotlight ring */}
      <div style={{
        position: "fixed",
        top: spotTop, left: spotLeft,
        width: spotW, height: spotH,
        borderRadius: 12,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.48)",
        border: "2.5px solid rgba(0,113,227,0.9)",
        pointerEvents: "none",
        zIndex: 601,
        animation: "kk-tour-ring 2s ease-in-out infinite",
      }} />

      {/* Tooltip */}
      <div style={{
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
      }}>
        {/* arrow */}
        <svg viewBox="0 0 14 8" style={{ position: "absolute", width: 14, height: 8, left: arrowOff, ...(tipBelow ? { top: -7 } : { bottom: -7 }) }}>
          <path d={tipBelow ? "M7 0L14 8H0L7 0Z" : "M7 8L0 0H14L7 8Z"} fill="var(--kk-surface)" />
        </svg>

        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--kk-blue)", marginBottom: 7 }}>
          Step {stepNum} of {totalSteps}
        </p>
        <p style={{ fontSize: 15, fontWeight: 700, color: "var(--kk-ink)", marginBottom: 6, lineHeight: 1.3 }}>
          {step.title}
        </p>
        <p style={{ fontSize: 12, color: "var(--kk-ink-mute)", lineHeight: 1.6, marginBottom: 14 }}>
          {step.body}
        </p>

        {/* progress dots */}
        <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
          {tour.steps.map((_, i) => (
            <span key={i} style={{
              width: i === stepIndex ? 16 : 6,
              height: 6, borderRadius: 99,
              background: i === stepIndex ? "var(--kk-blue)" : "rgba(0,113,227,0.20)",
              transition: "width 0.25s",
            }} />
          ))}
        </div>

        {/* actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={dismiss} style={{ fontSize: 12, color: "var(--kk-ink-faint)", background: "none", border: "none", padding: "6px 2px", cursor: "pointer" }}>
            Skip tour
          </button>
          <button onClick={advance} style={{
            fontSize: 13, fontWeight: 700, padding: "7px 18px", borderRadius: 20,
            background: "var(--kk-blue)", color: "#fff", border: "none", cursor: "pointer",
          }}>
            {step.nextLabel}{!isLast ? " →" : ""}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
