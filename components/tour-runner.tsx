"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isActive || !mounted || !step) return;

    function update() {
      const el = document.getElementById(step!.targetId);
      if (el) {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        setRect(el.getBoundingClientRect());
      }
    }

    const timer = setTimeout(update, 200);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    const el = document.getElementById(step.targetId);
    if (el) {
      const onClick = () => advance();
      el.addEventListener("click", onClick, { once: true });
      return () => {
        clearTimeout(timer);
        window.removeEventListener("resize", update);
        window.removeEventListener("scroll", update, true);
        el.removeEventListener("click", onClick);
      };
    }
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, mounted, step?.targetId]);

  function advance() {
    if (!tour || !step) return;
    const isLast = stepIndex === tour.steps.length - 1;
    if (isLast) {
      try { localStorage.setItem(tour.storageKey, "1"); } catch {}
      const params = new URLSearchParams(window.location.search);
      params.delete("tour");
      params.delete("step");
      const qs = params.toString();
      router.replace(window.location.pathname + (qs ? "?" + qs : ""), { scroll: false });
    } else {
      const nextStep = tour.steps[stepIndex + 1];
      const params = new URLSearchParams(window.location.search);
      params.set("tour", tour.id);
      params.set("step", nextStep.key);
      const qs = params.toString();
      router.replace(window.location.pathname + (qs ? "?" + qs : ""), { scroll: false });
    }
  }

  function dismiss() {
    if (!tour) return;
    try { localStorage.setItem(tour.storageKey, "1"); } catch {}
    const params = new URLSearchParams(window.location.search);
    params.delete("tour");
    params.delete("step");
    const qs = params.toString();
    router.replace(window.location.pathname + (qs ? "?" + qs : ""), { scroll: false });
  }

  if (!isActive || !mounted || !rect || !tour || !step) return null;

  const totalSteps = tour.steps.length;
  const stepNum = stepIndex + 1;

  const GAP = 7;
  const spotTop  = rect.top    - GAP;
  const spotLeft = rect.left   - GAP;
  const spotW    = rect.width  + GAP * 2;
  const spotH    = rect.height + GAP * 2;

  const TIP_W = 280;
  const TIP_H = 210;
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
      {/* dim overlay — click to dismiss */}
      <div
        onClick={dismiss}
        style={{ position: "fixed", inset: 0, zIndex: 600, cursor: "pointer" }}
      />

      {/* spotlight ring */}
      <div
        style={{
          position: "fixed",
          top: spotTop, left: spotLeft,
          width: spotW, height: spotH,
          borderRadius: 12,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.52)",
          border: "2.5px solid rgba(0,113,227,0.9)",
          pointerEvents: "none",
          zIndex: 601,
          animation: "kk-tour-ring 2s ease-in-out infinite",
        }}
      />

      {/* tooltip */}
      <div
        style={{
          position: "fixed",
          top: tipTop, left: tipLeft,
          width: TIP_W,
          zIndex: 602,
          background: "var(--kk-surface)",
          borderRadius: 16,
          padding: "18px 20px",
          boxShadow: "0 16px 48px rgba(0,0,0,0.20), 0 2px 8px rgba(0,0,0,0.08)",
          border: "1px solid var(--kk-line)",
          animation: "kk-demo-card-in 0.3s cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
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

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--kk-ink-mute)" }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", display: "inline-block", flexShrink: 0,
              background: "rgba(0,113,227,0.25)",
              boxShadow: "0 0 0 3px rgba(0,113,227,0.35)",
              animation: "kk-pulse-subtle 1.6s ease-in-out infinite",
            }} />
            {step.hint}
          </div>
          <button
            onClick={dismiss}
            style={{ fontSize: 11, color: "var(--kk-ink-faint)", background: "none", border: "none", padding: "2px 4px", cursor: "pointer" }}
          >
            Skip tour
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
