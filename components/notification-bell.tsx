"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, UserX, X, ClipboardCheck, RefreshCw, Star, CalendarClock, BellRing, FileText, MessageSquare, Building2, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationItem } from "@/app/api/notifications/route";

const LS_PUSH_KEY = "kk_push_subscribed";

// Namespace read IDs by user so switching accounts doesn't bleed read state.
function readKey(userId: string) { return `kk_notif_read_${userId}`; }

function getReadIds(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(readKey(userId)) ?? "[]")); }
  catch { return new Set(); }
}

function saveReadIds(userId: string, ids: Set<string>) {
  localStorage.setItem(readKey(userId), JSON.stringify([...ids]));
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function setBadge(count: number) {
  if (typeof navigator === "undefined") return;
  if ("setAppBadge" in navigator) {
    if (count > 0) {
      (navigator as Navigator & { setAppBadge(n: number): Promise<void> }).setAppBadge(count).catch(() => {});
    } else {
      (navigator as Navigator & { clearAppBadge(): Promise<void> }).clearAppBadge?.().catch(() => {});
    }
  }
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "SET_BADGE", count });
  }
}

const ICONS: Record<NotificationItem["type"], React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  contract_expiry:   CalendarClock,
  tenant_leaving:    UserX,
  owner_intake:      ClipboardCheck,
  owner_renewal:     RefreshCw,
  owner_pack_ranked: Star,
  tenant_intake:        FileText,
  tenant_renewal:       RefreshCw,
  wa_reply:             MessageSquare,
  wa_reply_owner:       MessageSquare,
  property_available:   Building2,
  property_pack_ranked: Package,
};

const TYPE_COLOR: Record<NotificationItem["type"], string> = {
  contract_expiry:   "#f59e0b",
  tenant_leaving:    "#DC2626",
  owner_intake:      "#0A84FF",
  owner_renewal:     "#30D158",
  owner_pack_ranked: "#FF9F0A",
  tenant_intake:        "#AF52DE",
  tenant_renewal:       "#30D158",
  wa_reply:             "#25D366",
  wa_reply_owner:       "#25D366",
  property_available:   "#0A84FF",
  property_pack_ranked: "#FF9F0A",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w}w`;
  const mo = Math.floor(d / 30);
  return `${mo}mo`;
}

export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);
  const [pushGranted, setPushGranted] = useState(false);
  const [pushEnabling, setPushEnabling] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    setPushGranted(
      localStorage.getItem(LS_PUSH_KEY) === "1" ||
        (typeof Notification !== "undefined" && Notification.permission === "granted"),
    );

    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);

    // Get user ID to namespace localStorage read IDs per account
    createClient().auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? "";
      setUserId(uid);
      if (uid) setReadIds(getReadIds(uid));
    });

    return () => window.removeEventListener("resize", check);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const { items: fetched } = (await res.json()) as { items: NotificationItem[] };
      setItems(fetched);
      const ids = userId ? getReadIds(userId) : new Set<string>();
      setBadge(fetched.filter((n) => !ids.has(n.id)).length);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  // Close on outside click (desktop only)
  useEffect(() => {
    if (!open || isMobile) return;
    function onDown(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, isMobile]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const unreadCount = items.filter((i) => !readIds.has(i.id)).length;
  const tabItems = tab === "unread" ? items.filter((i) => !readIds.has(i.id)) : items;
  const showPushPrompt =
    isStandalone && !pushGranted && typeof Notification !== "undefined" && Notification.permission !== "denied";

  function markAllRead() {
    const all = new Set(items.map((i) => i.id));
    setReadIds(all);
    if (userId) saveReadIds(userId, all);
    setBadge(0);
  }

  function handleItemClick(item: NotificationItem) {
    const newIds = new Set(readIds);
    newIds.add(item.id);
    setReadIds(newIds);
    if (userId) saveReadIds(userId, newIds);
    setBadge(items.filter((i) => !newIds.has(i.id)).length);
    setOpen(false);
    if (item.href) router.push(item.href);
  }

  async function enablePush() {
    if (typeof Notification === "undefined") return;
    setPushEnabling(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setPushEnabling(false); return; }
      const reg = await navigator.serviceWorker.ready;
      const key = urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key as unknown as ArrayBuffer,
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      localStorage.setItem(LS_PUSH_KEY, "1");
      setPushGranted(true);
    } catch {
      // permission denied or SW not ready
    } finally {
      setPushEnabling(false);
    }
  }

  const panelContent = (
    <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px 16px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 700, color: "var(--kk-ink)" }}>Notifications</p>
        <button
          onClick={() => setOpen(false)}
          style={{
            width: 28,
            height: 28,
            border: "none",
            borderRadius: 6,
            background: "var(--kk-surface-2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--kk-ink-mute)",
          }}
          aria-label="Close notifications"
        >
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          padding: "10px 16px 0",
          borderBottom: "1px solid var(--kk-line)",
          flexShrink: 0,
          gap: 0,
        }}
      >
        {(["all", "unread"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontSize: 13,
              fontWeight: tab === t ? 600 : 400,
              color: tab === t ? "var(--kk-ink)" : "var(--kk-ink-mute)",
              background: "none",
              border: "none",
              borderBottom: tab === t ? "2px solid var(--kk-ink)" : "2px solid transparent",
              padding: "0 2px 9px",
              marginRight: 16,
              cursor: "pointer",
              transition: "color 0.1s",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {t === "all" ? "All" : "Unread"}
            {t === "unread" && unreadCount > 0 && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  background: "#DC2626",
                  color: "#fff",
                  borderRadius: 100,
                  padding: "1px 4px",
                  lineHeight: 1.5,
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        ))}
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              marginLeft: "auto",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--kk-accent)",
              background: "none",
              border: "none",
              cursor: "pointer",
              paddingBottom: 9,
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Push prompt */}
      {showPushPrompt && tab === "all" && (
        <div
          style={{
            margin: "10px 12px 0",
            borderRadius: 12,
            padding: "12px",
            background: "color-mix(in srgb, var(--kk-accent) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kk-accent) 20%, transparent)",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--kk-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BellRing style={{ width: 15, height: 15, color: "#fff" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--kk-ink)", lineHeight: 1.3 }}>
              Get notified without opening the app
            </p>
            <p style={{ fontSize: 11, color: "var(--kk-ink-mute)", lineHeight: 1.4, marginTop: 2 }}>
              Expiring contracts, owner responses and more — straight to your lock screen.
            </p>
            <button
              onClick={enablePush}
              disabled={pushEnabling}
              style={{
                marginTop: 8,
                padding: "4px 12px",
                borderRadius: 100,
                fontSize: 11,
                fontWeight: 600,
                background: "var(--kk-accent)",
                color: "#fff",
                border: "none",
                cursor: pushEnabling ? "not-allowed" : "pointer",
                opacity: pushEnabling ? 0.7 : 1,
              }}
            >
              {pushEnabling ? "Enabling…" : "Enable notifications"}
            </button>
          </div>
        </div>
      )}

      {/* Notification list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "var(--kk-ink-faint)" }}>
            Loading…
          </div>
        ) : tabItems.length === 0 ? (
          <div style={{ padding: "48px 16px", textAlign: "center" }}>
            <Bell
              style={{ width: 32, height: 32, margin: "0 auto 8px", color: "var(--kk-ink-faint)", opacity: 0.25, display: "block" }}
            />
            <p style={{ fontSize: 13, color: "var(--kk-ink-faint)" }}>
              {tab === "unread" ? "No unread notifications" : "All caught up"}
            </p>
          </div>
        ) : (
          <div style={{ paddingTop: 4, paddingBottom: 4 }}>
            {tabItems.map((item) => {
              const isUnread = !readIds.has(item.id);
              const Icon = ICONS[item.type];
              const color = TYPE_COLOR[item.type];
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "flex-start",
                    padding: "10px 16px 10px 12px",
                    background: isUnread
                      ? `color-mix(in srgb, ${color} 5%, transparent)`
                      : "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--kk-surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = isUnread
                      ? `color-mix(in srgb, ${color} 5%, transparent)`
                      : "transparent";
                  }}
                >
                  {/* Unread dot */}
                  <div
                    style={{
                      width: 14,
                      flexShrink: 0,
                      display: "flex",
                      justifyContent: "center",
                      paddingTop: 7,
                    }}
                  >
                    {isUnread && (
                      <div
                        style={{ width: 6, height: 6, borderRadius: "50%", background: color }}
                      />
                    )}
                  </div>

                  {/* Type icon */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: `${color}22`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon style={{ width: 13, height: 13, color }} />
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0, paddingLeft: 10 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: isUnread ? 700 : 500,
                        color: "var(--kk-ink)",
                        lineHeight: 1.35,
                      }}
                    >
                      {item.title}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--kk-ink-mute)",
                        lineHeight: 1.4,
                        marginTop: 2,
                      }}
                    >
                      {item.body}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", marginTop: 4 }}>
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
  );

  const panelStyle: React.CSSProperties = {
    background: "var(--kk-surface)",
    border: "1px solid var(--kk-line)",
    borderRadius: 16,
    boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors"
        style={{
          background: open
            ? "var(--kk-accent)"
            : "color-mix(in srgb, var(--kk-topnav-ink) 10%, transparent)",
          border: "1px solid",
          borderColor: open
            ? "transparent"
            : "color-mix(in srgb, var(--kk-topnav-ink) 22%, transparent)",
          color: open ? "#fff" : "var(--kk-topnav-ink)",
        }}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="w-4 h-4" />
        {!loading && unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-[9px] font-black"
            style={{
              minWidth: 16,
              height: 16,
              padding: "0 3px",
              background: "#DC2626",
              color: "#fff",
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Desktop panel */}
      {open && !isMobile && (
        <div
          ref={panelRef}
          style={{
            ...panelStyle,
            position: "fixed",
            top: (btnRef.current?.getBoundingClientRect().bottom ?? 64) + 8,
            right: 16,
            zIndex: 99999,
            width: 360,
            maxHeight: "min(80vh, 560px)",
          }}
        >
          {panelContent}
        </div>
      )}

      {/* Mobile bottom sheet via portal */}
      {open && isMobile && mounted &&
        createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 99999 }}>
            <div
              onClick={() => setOpen(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }}
            />
            <div
              style={{
                ...panelStyle,
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                borderRadius: "20px 20px 0 0",
                maxHeight: "80vh",
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  background: "var(--kk-line)",
                  margin: "12px auto 0",
                  flexShrink: 0,
                }}
              />
              {panelContent}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
