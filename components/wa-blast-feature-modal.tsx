"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TOURS } from "@/lib/tours";

const TOUR = TOURS["wa-blast"];
const NEVER_KEY = TOUR.storageKey;

export function WaBlastFeatureModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const neverShow = localStorage.getItem(NEVER_KEY);
      if (!neverShow) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  function skipForNow() {
    setOpen(false); // session dismiss only — comes back next visit
  }

  function neverShow() {
    try { localStorage.setItem(NEVER_KEY, "1"); } catch {}
    setOpen(false);
  }

  function startTour() {
    try { localStorage.setItem(NEVER_KEY, "1"); } catch {}
    setOpen(false);
    const firstStep = TOUR.steps[0];
    router.push(`${TOUR.startPath}?tour=${TOUR.id}&step=${firstStep.key}`);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) skipForNow(); }}>
      <DialogContent
        style={{
          maxWidth: 520,
          padding: 0,
          borderRadius: 20,
          overflow: "hidden",
          gap: 0,
        }}
      >
        {/* close button */}
        <button
          onClick={skipForNow}
          aria-label="Skip for now"
          style={{
            position: "absolute", top: 14, right: 14, zIndex: 10,
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--kk-ink-mute)",
          }}
        >
          <X style={{ width: 14, height: 14 }} />
        </button>

        {/* hero strip */}
        <div style={{
          background: "linear-gradient(135deg, rgba(0,113,227,0.10) 0%, rgba(0,113,227,0.04) 100%)",
          borderBottom: "1px solid rgba(0,113,227,0.12)",
          padding: "28px 28px 24px",
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.1em", color: "var(--kk-blue)",
            display: "block", marginBottom: 8,
          }}>
            New feature
          </span>
          <DialogTitle style={{ fontSize: 22, fontWeight: 800, color: "var(--kk-ink)", margin: "0 0 10px", lineHeight: 1.2 }}>
            WA AutoBlast is live
          </DialogTitle>
          <p style={{ fontSize: 14, color: "var(--kk-ink-mute)", margin: 0, lineHeight: 1.6, maxWidth: 380 }}>
            Send WhatsApp messages to your property leads automatically, one by one, on your own schedule.
          </p>
        </div>

        {/* feature list */}
        <div style={{ padding: "22px 28px 0" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              {
                emoji: "📬",
                title: "Works while you sleep",
                body: "Set a schedule once. Messages go out in order during your sending windows automatically.",
              },
              {
                emoji: "📋",
                title: "Every contact tracked",
                body: "See who was messaged and exactly when, right in your leads table.",
              },
              {
                emoji: "⏸️",
                title: "Pause any time",
                body: "Full control. Activate, pause, or change the schedule whenever you need.",
              },
            ].map(({ emoji, title, body }) => (
              <div key={title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 16,
                }}>
                  {emoji}
                </span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink)", margin: "0 0 2px" }}>{title}</p>
                  <p style={{ fontSize: 12, color: "var(--kk-ink-mute)", margin: 0, lineHeight: 1.55 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* actions */}
        <div style={{
          padding: "22px 28px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}>
          <button
            onClick={skipForNow}
            style={{
              fontSize: 13, fontWeight: 500, color: "var(--kk-ink-faint)",
              background: "none", border: "none", cursor: "pointer", padding: "8px 4px",
            }}
          >
            Skip for now
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={neverShow}
              style={{
                fontSize: 13, fontWeight: 500, padding: "9px 16px", borderRadius: 20,
                background: "rgba(0,0,0,0.05)", color: "var(--kk-ink-mute)",
                border: "none", cursor: "pointer",
              }}
            >
              Never show again
            </button>
            <button
              onClick={startTour}
              style={{
                fontSize: 13, fontWeight: 700, padding: "9px 20px", borderRadius: 20,
                background: "var(--kk-blue)", color: "#fff",
                border: "none", cursor: "pointer",
              }}
            >
              Show me how →
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
