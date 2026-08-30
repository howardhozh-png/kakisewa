"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TOURS } from "@/lib/tours";

const TOUR = TOURS["wa-blast"];

export function WaBlastFeatureModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(TOUR.storageKey);
      if (!seen) setOpen(true);
    } catch {}
  }, []);

  function dismiss() {
    try { localStorage.setItem(TOUR.storageKey, "1"); } catch {}
    setOpen(false);
  }

  function startTour() {
    try { } catch {}
    setOpen(false);
    const firstStep = TOUR.steps[0];
    router.push(`${TOUR.startPath}?tour=${TOUR.id}&step=${firstStep.key}`);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent style={{ maxWidth: 400, padding: 0, borderRadius: 20, overflow: "hidden" }}>
        {/* header */}
        <div style={{ padding: "20px 20px 16px", background: "rgba(0,113,227,0.05)", borderBottom: "1px solid rgba(0,113,227,0.12)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(0,113,227,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Zap style={{ width: 18, height: 18, color: "var(--kk-blue)" }} />
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--kk-blue)", display: "block", marginBottom: 2 }}>New feature</span>
                <DialogTitle style={{ fontSize: 16, fontWeight: 700, color: "var(--kk-ink)", margin: 0, lineHeight: 1.2 }}>
                  WA AutoBlast is here
                </DialogTitle>
              </div>
            </div>
            <button onClick={dismiss} aria-label="Close" style={{ color: "var(--kk-ink-faint)", padding: 4, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* body */}
        <div style={{ padding: "18px 20px 20px" }}>
          <p style={{ fontSize: 14, color: "var(--kk-ink-mute)", lineHeight: 1.65, margin: "0 0 16px" }}>
            Send WhatsApp messages to your property leads automatically, one by one, on your own schedule. Set your message once and let it run while you focus on closing.
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              "Messages go out in order during your sending windows",
              "Every contact is tracked with timestamp",
              "Pause or resume any time",
            ].map((item) => (
              <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--kk-ink)" }}>
                <span style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(52,199,89,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <svg viewBox="0 0 10 8" width="10" height="8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="var(--kk-green-ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={startTour}
              style={{ flex: 1, padding: "10px 16px", borderRadius: 12, background: "var(--kk-blue)", color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" }}
            >
              Show me how it works
            </button>
            <button
              onClick={dismiss}
              style={{ padding: "10px 16px", borderRadius: 12, background: "rgba(0,0,0,0.05)", color: "var(--kk-ink-mute)", fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer" }}
            >
              Skip
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
