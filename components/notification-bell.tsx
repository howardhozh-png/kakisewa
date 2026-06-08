"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, UserX, X, ClipboardCheck, RefreshCw, Star, CalendarClock, ChevronDown, BellRing } from "lucide-react";
import type { NotificationItem } from "@/app/api/notifications/route";

const LS_READ_KEY = "kk_notif_read_ids";
const LS_PUSH_KEY = "kk_push_subscribed";
const VISIBLE_COUNT = 5;

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(LS_READ_KEY) ?? "[]")); }
  catch { return new Set(); }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(LS_READ_KEY, JSON.stringify([...ids]));
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
};

const TYPE_COLOR: Record<NotificationItem["type"], string> = {
  contract_expiry:   "#f59e0b",
  tenant_leaving:    "#DC2626",
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
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);
  const [pushGranted, setPushGranted] = useState(false);
  const [pushEnabling, setPushEnabling] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const alreadySubscribed = localStorage.getItem(LS_PUSH_KEY) === "1";
    setPushGranted(alreadySubscribed || Notification.permission === "granted");

    setReadIds(getReadIds());
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const { items: fetched } = await res.json() as { items: NotificationItem[] };
      setItems(fetched);
      const ids = getReadIds();
      const unread = fetched.filter((n) => !ids.has(n.id)).length;
      setBadge(unread);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const unreadCount = items.filter((i) => !readIds.has(i.id)).length;
  const visible = showAll ? items : items.slice(0, VISIBLE_COUNT);

  function handleItemClick(item: NotificationItem) {
    const newIds = new Set(readIds);
    newIds.add(item.id);
    setReadIds(newIds);
    saveReadIds(newIds);
    setBadge(items.filter((i) => !newIds.has(i.id)).length);
    setOpen(false);
    if (item.href) router.push(item.href);
  }

  async function enablePush() {
    setPushEnabling(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushEnabling(false);
        return;
      }
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

  const showPushPrompt = isStandalone && !pushGranted && Notification.permission !== "denied";

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
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
        {!loading && unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-[9px] font-black"
            style={{ minWidth: 16, height: 16, padding: "0 3px", background: "#DC2626", color: "#fff", lineHeight: 1 }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
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
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => {
                    const all = new Set(items.map((i) => i.id));
                    setReadIds(all);
                    saveReadIds(all);
                    setBadge(0);
                  }}
                  className="text-[12px] font-medium"
                  style={{ color: "var(--kk-accent)" }}
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Push notification setup prompt */}
          {showPushPrompt && (
            <div
              className="mx-3 mt-3 rounded-2xl px-3.5 py-3 flex items-start gap-3"
              style={{ background: "color-mix(in srgb, var(--kk-accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--kk-accent) 20%, transparent)" }}
            >
              <div
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "var(--kk-accent)" }}
              >
                <BellRing className="w-4 h-4" style={{ color: "#fff" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold leading-snug" style={{ color: "var(--kk-ink)" }}>
                  Get notified without opening the app
                </p>
                <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "var(--kk-ink-mute)" }}>
                  Expiring contracts, owner responses and more — straight to your lock screen.
                </p>
                <button
                  onClick={enablePush}
                  disabled={pushEnabling}
                  className="mt-2 px-3 py-1 rounded-full text-[11px] font-semibold"
                  style={{ background: "var(--kk-accent)", color: "#fff" }}
                >
                  {pushEnabling ? "Enabling…" : "Enable notifications"}
                </button>
              </div>
            </div>
          )}

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
                {visible.map((item) => {
                  const isUnread = !readIds.has(item.id);
                  const Icon = ICONS[item.type];
                  const color = TYPE_COLOR[item.type];
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="w-full flex items-start text-left transition-colors hover:bg-[var(--kk-surface-2)]"
                      style={{ background: isUnread ? `color-mix(in srgb, ${color} 6%, transparent)` : undefined }}
                    >
                      {/* Unread dot — left edge */}
                      <div className="flex items-center justify-center shrink-0" style={{ width: 16, paddingTop: 18 }}>
                        {isUnread && (
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                        )}
                      </div>

                      {/* Icon */}
                      <div
                        className="shrink-0 mt-3 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: `${color}22` }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0 py-3 pl-3 pr-4">
                        <p
                          className="text-[13px] leading-snug"
                          style={{ color: "var(--kk-ink)", fontWeight: isUnread ? 700 : 500 }}
                        >
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

                {items.length > VISIBLE_COUNT && (
                  <button
                    onClick={() => setShowAll((s) => !s)}
                    className="w-full py-2.5 text-[12px] font-semibold flex items-center justify-center gap-1.5"
                    style={{ color: "var(--kk-accent)", borderTop: "1px solid var(--kk-line)" }}
                  >
                    {showAll ? "Show less" : `View ${items.length - VISIBLE_COUNT} more`}
                    <ChevronDown
                      className="w-3.5 h-3.5 transition-transform"
                      style={{ transform: showAll ? "rotate(180deg)" : "none" }}
                    />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
