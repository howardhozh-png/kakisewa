"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, X } from "lucide-react";
import { TOURS } from "@/lib/tours";

const TOUR = TOURS["wa-blast"];
const NEVER_KEY = TOUR.storageKey;

export function WaBlastFeatureModal() {
  const router = useRouter();
  // null = not yet checked, true = show, false = hidden this session
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const neverShow = localStorage.getItem(NEVER_KEY);
      setVisible(!neverShow);
    } catch {
      setVisible(true);
    }
  }, []);

  function remindLater() {
    setVisible(false); // hides for this page load only, does not persist
  }

  function neverShow() {
    try { localStorage.setItem(NEVER_KEY, "1"); } catch {}
    setVisible(false);
  }

  function startTour() {
    neverShow(); // completing the tour counts as done
    const firstStep = TOUR.steps[0];
    router.push(`${TOUR.startPath}?tour=${TOUR.id}&step=${firstStep.key}`);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="New feature announcement"
      style={{
        borderRadius: 14,
        border: "1.5px solid rgba(0,113,227,0.18)",
        background: "rgba(0,113,227,0.04)",
        padding: "14px 16px",
        marginBottom: 20,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      {/* icon */}
      <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(0,113,227,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        <Zap style={{ width: 16, height: 16, color: "var(--kk-blue)" }} />
      </div>

      {/* content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap", marginBottom: 3 }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--kk-blue)" }}>
            New
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--kk-ink)" }}>
            WA AutoBlast
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--kk-ink-mute)", margin: "0 0 10px", lineHeight: 1.55 }}>
          Automatically send WhatsApp messages to your property leads in order, on your own schedule.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={startTour}
            style={{
              fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 20,
              background: "var(--kk-blue)", color: "#fff", border: "none", cursor: "pointer",
            }}
          >
            Show me how
          </button>
          <button
            onClick={remindLater}
            style={{
              fontSize: 12, fontWeight: 500, padding: "5px 10px", borderRadius: 20,
              background: "none", color: "var(--kk-ink-mute)", border: "1px solid rgba(0,0,0,0.10)", cursor: "pointer",
            }}
          >
            Remind me later
          </button>
          <button
            onClick={neverShow}
            style={{
              fontSize: 12, fontWeight: 500, padding: "5px 10px", borderRadius: 20,
              background: "none", color: "var(--kk-ink-faint)", border: "none", cursor: "pointer",
            }}
          >
            Never show again
          </button>
        </div>
      </div>

      {/* close (same as remind later) */}
      <button
        onClick={remindLater}
        aria-label="Dismiss"
        style={{ color: "var(--kk-ink-faint)", background: "none", border: "none", padding: 4, cursor: "pointer", flexShrink: 0 }}
      >
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}
