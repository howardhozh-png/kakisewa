"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { saveNotifPrefs } from "@/lib/actions";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

interface Props {
  hasPushEnabled: boolean;
}

export function PushTopBanner({ hasPushEnabled }: Props) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (hasPushEnabled) return;
    // Push isn't available in the browser at all on this platform.
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;
    // iOS Safari only exposes Notification/Push once the site is added to
    // the home screen — that's an OS restriction, not a general web one.
    // Desktop and Android support push directly in a normal browser tab.
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!standalone) return;
    }
    setShow(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!show || dismissed) return null;

  async function enablePush() {
    if (typeof Notification === "undefined") return;
    setEnabling(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setDismissed(true); return; }
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
      // Re-subscribing the browser alone doesn't resume sends — the cron
      // and real-time push triggers check notif_push, not subscription
      // existence, so a previously-toggled-off user needs this flipped too.
      await saveNotifPrefs({ notif_push: true });
      localStorage.setItem("kk_push_subscribed", "1");
      setDone(true);
      setTimeout(() => setDismissed(true), 2000);
    } catch {
      setDismissed(true);
    } finally {
      setEnabling(false);
    }
  }

  return (
    <div
      style={{
        background: done ? "var(--kk-green-soft, #F0FFF4)" : "var(--kk-ink, #1D1D1F)",
        borderBottom: done ? "1px solid rgba(52,199,89,0.15)" : "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "8px 40px",
        fontSize: 13,
        fontWeight: 500,
        color: done ? "var(--kk-green-ink, #1F8B4C)" : "#fff",
        position: "relative",
        minHeight: 36,
      }}
    >
      <Bell style={{ width: 13, height: 13, flexShrink: 0 }} />
      <span>
        {done
          ? "Notifications enabled. You will get renewal alerts."
          : "Turn on notifications to never miss a renewal."}
      </span>
      {!done && (
        <button
          onClick={enablePush}
          disabled={enabling}
          style={{
            background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 99, color: "#fff", fontSize: 12, fontWeight: 600,
            padding: "3px 12px", cursor: enabling ? "default" : "pointer",
            opacity: enabling ? 0.6 : 1, whiteSpace: "nowrap", flexShrink: 0,
          }}
        >
          {enabling ? "Enabling..." : "Enable"}
        </button>
      )}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          position: "absolute", right: 10,
          background: "none", border: "none", cursor: "pointer",
          color: done ? "var(--kk-green-ink)" : "#fff", opacity: 0.4,
          lineHeight: 0, padding: 6,
        }}
      >
        <X style={{ width: 13, height: 13 }} />
      </button>
    </div>
  );
}
