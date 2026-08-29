"use client";

import { useState, useEffect } from "react";
import { X, Megaphone } from "lucide-react";
import type { Announcement } from "@/lib/types";

const SNOOZE_KEY = (id: string) => `kk_ann_snooze_${id}`;

export function AnnouncementCard({ announcements }: { announcements: Announcement[] }) {
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [current, setCurrent] = useState<Announcement | null>(null);

  useEffect(() => {
    // Pick the first announcement not snoozed this session
    const ann = announcements.find(a => !sessionStorage.getItem(SNOOZE_KEY(a.id)));
    if (ann) { setCurrent(ann); setVisible(true); }
  }, [announcements]);

  if (!visible || !current) return null;

  function snooze() {
    if (!current) return;
    sessionStorage.setItem(SNOOZE_KEY(current.id), "1");
    setVisible(false);
    // Try next unshown announcement
    const next = announcements.find(a => a.id !== current!.id && !sessionStorage.getItem(SNOOZE_KEY(a.id)));
    if (next) { setCurrent(next); setVisible(true); }
  }

  async function dismiss() {
    if (!current || dismissing) return;
    setDismissing(true);
    await fetch(`/api/announcements/${current.id}/dismiss`, { method: "POST" });
    sessionStorage.setItem(SNOOZE_KEY(current.id), "1");
    setVisible(false);
    const next = announcements.find(a => a.id !== current!.id && !sessionStorage.getItem(SNOOZE_KEY(a.id)));
    if (next) { setCurrent(next); setVisible(true); }
    setDismissing(false);
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(calc(100vw - 32px), 420px)",
        background: "var(--kk-surface)",
        border: "1px solid var(--kk-line)",
        borderRadius: 18,
        boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
        zIndex: 800,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        animation: "kk-slide-up 0.28s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      <style>{`@keyframes kk-slide-up{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--kk-blue)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Megaphone style={{ width: 16, height: 16, color: "#fff" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--kk-blue)", margin: "0 0 2px" }}>
            New feature
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--kk-ink)", margin: 0, lineHeight: 1.35 }}>
            {current.title}
          </p>
        </div>
        <button onClick={snooze} aria-label="Close" style={{ flexShrink: 0, color: "var(--kk-ink-faint)", padding: 2, marginTop: -2 }}>
          <X style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* Body */}
      <p style={{ fontSize: 13, color: "var(--kk-ink-mute)", margin: 0, lineHeight: 1.55 }}>
        {current.body}
      </p>

      {/* Action row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {current.cta_url && current.cta_label && (
          <a
            href={current.cta_url}
            style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: "var(--kk-blue)", borderRadius: 10, padding: "7px 16px", textDecoration: "none", flexShrink: 0 }}
          >
            {current.cta_label}
          </a>
        )}
        <button
          onClick={dismiss}
          disabled={dismissing}
          style={{ fontSize: 12, color: "var(--kk-ink-faint)", background: "none", border: "none", padding: "4px 0", cursor: "pointer", opacity: dismissing ? 0.5 : 1 }}
        >
          {dismissing ? "Dismissing..." : "Don't show again"}
        </button>
      </div>
    </div>
  );
}
