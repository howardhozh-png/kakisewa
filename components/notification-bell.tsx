"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, MessageCircle, AlertCircle, UserX, X, ClipboardCheck, RefreshCw, Star } from "lucide-react";
import type { NotificationItem } from "@/app/api/notifications/route";

const LS_KEY = "kk_notif_read_at";

function getLastReadAt(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(LS_KEY) ?? "0", 10);
}

function markAllRead() {
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_KEY, Date.now().toString());
  }
}

function setBadge(count: number) {
  if (typeof navigator === "undefined") return;
  // Direct API (Chrome desktop/Android)
  if ("setAppBadge" in navigator) {
    if (count > 0) {
      (navigator as Navigator & { setAppBadge(n: number): Promise<void> }).setAppBadge(count).catch(() => {});
    } else {
      (navigator as Navigator & { clearAppBadge(): Promise<void> }).clearAppBadge?.().catch(() => {});
    }
  }
  // iOS Safari PWA requires the SW to call setAppBadge
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "SET_BADGE", count });
  }
}

const ICONS: Record<NotificationItem["type"], React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  wa_reminder:       MessageCircle,
  action_needed:     AlertCircle,
  tenant_leaving:    UserX,
  owner_leaving:     UserX,
  owner_intake:      ClipboardCheck,
  owner_renewal:     RefreshCw,
  owner_pack_ranked: Star,
};

const TYPE_COLOR: Record<NotificationItem["type"], string> = {
  wa_reminder:       "#25D366",
  action_needed:     "#f59e0b",
  tenant_leaving:    "#DC2626",
  owner_leaving:     "#DC2626",
  owner_intake:      "#0A84FF",
  owner_renewal:     "#30D158",
  owner_pack_ranked: "#FF9F0A",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const { items: fetched } = await res.json() as { items: NotificationItem[]; unreadCount: number };
      setItems(fetched);
      const lastRead = getLastReadAt();
      const newCount = fetched.filter(n => new Date(n.createdAt).getTime() > lastRead).length;
      setUnread(newCount);
      setBadge(newCount);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Re-check every 5 min while tab is open
  useEffect(() => {
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function handleOpen() {
    setOpen((o) => {
      if (!o) {
        markAllRead();
        setUnread(0);
        setBadge(0);
      }
      return !o;
    });
  }

  function handleItemClick(item: NotificationItem) {
    setOpen(false);
    if (item.href) {
      window.location.href = item.href;
    }
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors"
        style={{
          background: open ? "var(--kk-accent)" : "color-mix(in srgb, var(--kk-topnav-ink) 10%, transparent)",
          border: "1px solid",
          borderColor: open ? "transparent" : "color-mix(in srgb, var(--kk-topnav-ink) 22%, transparent)",
          color: open ? "#fff" : "var(--kk-topnav-ink)",
        }}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {!loading && unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-[9px] font-black"
            style={{ minWidth: 16, height: 16, padding: "0 3px", background: "#DC2626", color: "#fff", lineHeight: 1 }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            top: (btnRef.current?.getBoundingClientRect().bottom ?? 64) + 8,
            right: 16,
            zIndex: 99999,
            width: 340,
            maxHeight: "80vh",
            background: "var(--kk-surface)",
            border: "1px solid var(--kk-line)",
            borderRadius: 20,
            boxShadow: "0 16px 48px rgba(0,0,0,0.16)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--kk-line)" }}>
            <p className="text-[14px] font-bold" style={{ color: "var(--kk-ink)" }}>Notifications</p>
            <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Items */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="px-4 py-8 text-center text-[13px]" style={{ color: "var(--kk-ink-faint)" }}>Loading…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--kk-ink-faint)", opacity: 0.3 }} />
                <p className="text-[13px]" style={{ color: "var(--kk-ink-faint)" }}>All caught up</p>
              </div>
            ) : (
              <div className="py-1.5">
                {items.map((item) => {
                  const Icon = ICONS[item.type];
                  const color = TYPE_COLOR[item.type];
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--kk-surface-2)]"
                    >
                      {/* Icon dot */}
                      <div className="shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: `${color}18` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold leading-snug" style={{ color: "var(--kk-ink)" }}>
                          {item.title}
                        </p>
                        <p className="text-[12px] mt-0.5 leading-snug" style={{ color: "var(--kk-ink-mute)" }}>
                          {item.body}
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>
                          {timeAgo(item.createdAt)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
