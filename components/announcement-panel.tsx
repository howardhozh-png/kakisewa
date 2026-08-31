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

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
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

  function handleClick() {
    if (!ann.cta_url) return;
    if (isUnread) onDismiss(ann.id);
    if (ann.cta_url.startsWith("/")) router.push(ann.cta_url);
    else window.open(ann.cta_url, "_blank", "noopener");
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        cursor: ann.cta_url ? "pointer" : "default",
        background: hovered ? "rgba(0,0,0,0.045)" : isUnread ? "rgba(0,113,227,0.035)" : "transparent",
        transition: "background 0.12s",
        userSelect: "none",
      }}
    >
      {/* feature icon */}
      <div style={{
        width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
        background: "rgba(0,113,227,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Megaphone style={{ width: 20, height: 20, color: "var(--kk-blue)" }} />
      </div>

      {/* text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: isUnread ? 700 : 500,
          color: "var(--kk-ink)", margin: "0 0 2px", lineHeight: 1.4,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {ann.title}
        </p>
        <p style={{
          fontSize: 12, color: "var(--kk-ink-mute)", margin: "0 0 3px", lineHeight: 1.4,
          display: "-webkit-box", WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {ann.body}
        </p>
        {ann.published_at && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--kk-blue)" }}>
            {relativeTime(ann.published_at)}
          </span>
        )}
      </div>

      {/* right: unread dot or dismiss X on hover */}
      <div style={{ width: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {hovered ? (
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(ann.id); }}
            disabled={dismissing === ann.id}
            aria-label="Dismiss"
            style={{
              width: 20, height: 20, borderRadius: "50%",
              background: "rgba(0,0,0,0.10)", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--kk-ink-mute)", opacity: dismissing === ann.id ? 0.4 : 1,
            }}
          >
            <X style={{ width: 10, height: 10 }} />
          </button>
        ) : isUnread ? (
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--kk-blue)", display: "block" }} />
        ) : null}
      </div>
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
        <DialogContent style={{ maxWidth: 380, padding: 0, borderRadius: 18, overflow: "hidden", gap: 0 }}>
          <div style={{ padding: "16px 16px 14px", borderBottom: "1px solid var(--kk-line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <DialogTitle style={{ fontSize: 16, fontWeight: 700, color: "var(--kk-ink)", margin: 0 }}>
              Notifications
            </DialogTitle>
            <button onClick={() => setOpen(false)} aria-label="Close" style={{ color: "var(--kk-ink-faint)", padding: 4, background: "none", border: "none", cursor: "pointer" }}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
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
