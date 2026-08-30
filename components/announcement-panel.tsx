"use client";

import { useState } from "react";
import { Megaphone, X, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Announcement } from "@/lib/types";

interface AnnouncementPanelProps {
  announcements: Announcement[];          // all unread (for unread count)
  allAnnouncements: Announcement[];       // full history for display
}

export function AnnouncementBell({ unreadCount, announcements, allAnnouncements }: AnnouncementPanelProps & { unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [localDismissed, setLocalDismissed] = useState<Set<string>>(new Set());

  const displayList = allAnnouncements.filter(a => a.published_at);
  const localUnread = unreadCount - localDismissed.size;
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
        <DialogContent style={{ maxWidth: 480, padding: 0, borderRadius: 20, overflow: "hidden" }}>
          <div style={{ padding: "20px 20px 0", borderBottom: "1px solid var(--kk-line)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <DialogTitle style={{ fontSize: 16, fontWeight: 700, color: "var(--kk-ink)", margin: 0 }}>
                What&apos;s new
              </DialogTitle>
              <button onClick={() => setOpen(false)} aria-label="Close" style={{ color: "var(--kk-ink-faint)", padding: 4 }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
          </div>

          <div style={{ maxHeight: "60vh", overflowY: "auto", padding: "4px 0 20px" }}>
            {displayList.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--kk-ink-faint)", padding: "20px 20px", textAlign: "center" }}>
                No announcements yet.
              </p>
            ) : (
              displayList.map(ann => {
                const isUnread = !localDismissed.has(ann.id) && announcements.some(a => a.id === ann.id);
                return (
                  <div
                    key={ann.id}
                    style={{
                      padding: "14px 20px",
                      borderBottom: "1px solid var(--kk-line)",
                      background: isUnread ? "var(--kk-blue-soft, #EFF6FF)" : "transparent",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {isUnread && (
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--kk-blue)", display: "block", marginBottom: 2 }}>
                            New
                          </span>
                        )}
                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--kk-ink)", margin: 0, lineHeight: 1.35 }}>{ann.title}</p>
                      </div>
                      <span style={{ fontSize: 11, color: "var(--kk-ink-faint)", flexShrink: 0, marginTop: 2 }}>
                        {new Date(ann.published_at!).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--kk-ink-mute)", margin: "0 0 10px", lineHeight: 1.55 }}>{ann.body}</p>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {ann.cta_url && ann.cta_label && (
                        <a href={ann.cta_url} style={{ fontSize: 12, fontWeight: 600, color: "var(--kk-blue)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                          {ann.cta_label} <ExternalLink style={{ width: 11, height: 11 }} />
                        </a>
                      )}
                      {isUnread && (
                        <button
                          onClick={() => archive(ann.id)}
                          disabled={dismissing === ann.id}
                          style={{ fontSize: 12, color: "var(--kk-ink-faint)", background: "none", border: "none", padding: 0, cursor: "pointer", opacity: dismissing === ann.id ? 0.5 : 1 }}
                        >
                          {dismissing === ann.id ? "Archiving..." : "Archive"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
