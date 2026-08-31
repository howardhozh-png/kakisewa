"use client";

import { useState } from "react";
import { Megaphone, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Announcement } from "@/lib/types";

interface AnnouncementPanelProps {
  announcements: Announcement[];
  allAnnouncements: Announcement[];
}

function NotificationRow({
  ann,
  isUnread,
  onDismiss,
  dismissing,
}: {
  ann: Announcement;
  isUnread: boolean;
  onDismiss: (id: string) => void;
  dismissing: string | null;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  const dateLabel = ann.published_at
    ? new Date(ann.published_at).toLocaleDateString("en-MY", { day: "numeric", month: "short" })
    : "";

  function handleClick() {
    if (ann.cta_url) {
      // internal paths navigate directly; external open in new tab
      if (ann.cta_url.startsWith("/")) {
        router.push(ann.cta_url);
      } else {
        window.open(ann.cta_url, "_blank", "noopener");
      }
    }
  }

  return (
    <div
      role={ann.cta_url ? "button" : undefined}
      tabIndex={ann.cta_url ? 0 : undefined}
      onClick={ann.cta_url ? handleClick : undefined}
      onKeyDown={ann.cta_url ? (e) => { if (e.key === "Enter" || e.key === " ") handleClick(); } : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--kk-line)",
        cursor: ann.cta_url ? "pointer" : "default",
        background: hovered
          ? "rgba(0,113,227,0.04)"
          : isUnread
            ? "rgba(0,113,227,0.03)"
            : "transparent",
        transform: hovered ? "scale(1.005)" : "scale(1)",
        transition: "background 0.15s, transform 0.15s, box-shadow 0.15s",
        boxShadow: hovered ? "0 2px 12px rgba(0,0,0,0.06)" : "none",
        borderRadius: hovered ? 10 : 0,
        position: "relative",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      {/* unread dot */}
      {isUnread && (
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "var(--kk-blue)", flexShrink: 0, marginTop: 5,
        }} />
      )}
      {!isUnread && <span style={{ width: 7, flexShrink: 0 }} />}

      {/* content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink)", lineHeight: 1.3 }}>
            {ann.title}
          </span>
          <span style={{ fontSize: 11, color: "var(--kk-ink-faint)", flexShrink: 0 }}>{dateLabel}</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--kk-ink-mute)", margin: 0, lineHeight: 1.55,
          display: "-webkit-box", WebkitLineClamp: hovered ? 10 : 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
          transition: "all 0.2s",
        }}>
          {ann.body}
        </p>
        {ann.cta_label && hovered && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--kk-blue)", display: "block", marginTop: 6 }}>
            {ann.cta_label} →
          </span>
        )}
      </div>

      {/* dismiss */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(ann.id); }}
        disabled={dismissing === ann.id}
        aria-label="Dismiss"
        style={{
          width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
          background: hovered ? "rgba(0,0,0,0.07)" : "transparent",
          border: "none", cursor: "pointer", padding: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--kk-ink-faint)", opacity: dismissing === ann.id ? 0.4 : (hovered ? 1 : 0),
          transition: "opacity 0.15s, background 0.15s",
          pointerEvents: hovered ? "auto" : "none",
          marginTop: 1,
        }}
      >
        <X style={{ width: 11, height: 11 }} />
      </button>
    </div>
  );
}

export function AnnouncementBell({ unreadCount, announcements, allAnnouncements }: AnnouncementPanelProps & { unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [localDismissed, setLocalDismissed] = useState<Set<string>>(new Set());

  const displayList = allAnnouncements.filter(a => a.published_at);
  const localUnread = Math.max(0, unreadCount - localDismissed.size);
  const showBadge = localUnread > 0;

  async function archive(id: string) {
    if (dismissing) return;
    setDismissing(id);
    await fetch(`/api/announcements/${id}/dismiss`, { method: "POST" });
    setLocalDismissed(prev => new Set([...prev, id]));
    setDismissing(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`Feature announcements${showBadge ? `, ${localUnread} unread` : ""}`}
        className="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors"
        style={{ background: "color-mix(in srgb, var(--kk-topnav-ink) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--kk-topnav-ink) 22%, transparent)", color: "var(--kk-topnav-ink)", flexShrink: 0 }}
      >
        <Megaphone style={{ width: 16, height: 16 }} />
        {showBadge && (
          <span style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: "50%", background: "var(--kk-red)", border: "2px solid var(--kk-topnav-bg)" }} />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ maxWidth: 400, padding: 0, borderRadius: 18, overflow: "hidden", gap: 0 }}>
          {/* header */}
          <div style={{ padding: "16px 16px 14px", borderBottom: "1px solid var(--kk-line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <DialogTitle style={{ fontSize: 15, fontWeight: 700, color: "var(--kk-ink)", margin: 0 }}>
              What&apos;s new
            </DialogTitle>
            <button onClick={() => setOpen(false)} aria-label="Close" style={{ color: "var(--kk-ink-faint)", padding: 4, background: "none", border: "none", cursor: "pointer" }}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* list */}
          <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
            {displayList.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--kk-ink-faint)", padding: "28px 20px", textAlign: "center" }}>
                Nothing new right now.
              </p>
            ) : (
              displayList.map(ann => {
                const isUnread = !localDismissed.has(ann.id) && announcements.some(a => a.id === ann.id);
                return (
                  <NotificationRow
                    key={ann.id}
                    ann={ann}
                    isUnread={isUnread}
                    onDismiss={archive}
                    dismissing={dismissing}
                  />
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
