"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

const SESSION_KEY = "kk_push_nudge_dismissed";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

interface Props {
  hasPushEnabled: boolean;
}

export function PushNudge({ hasPushEnabled }: Props) {
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false); // controls slide-up animation
  const [enabling, setEnabling] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const isTest = new URLSearchParams(window.location.search).get("test_nudge") === "1";

    // Only show in standalone PWA mode (or when ?test_nudge=1 bypasses all checks)
    if (!isTest) {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!standalone) return;

      // Already subscribed
      if (hasPushEnabled) return;

      // User explicitly blocked notifications — don't nag
      if (typeof Notification !== "undefined" && Notification.permission === "denied") return;

      // Already dismissed this session
      if (sessionStorage.getItem(SESSION_KEY)) return;
    }

    // Delay 2s so the page settles before the sheet appears (instant in test mode)
    const delay = isTest ? 0 : 2000;
    const timer = setTimeout(() => {
      setShow(true);
      requestAnimationFrame(() => setVisible(true));
    }, delay);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
    setTimeout(() => setShow(false), 320);
  }

  async function enablePush() {
    if (typeof Notification === "undefined") return;
    setEnabling(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        dismiss();
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
      localStorage.setItem("kk_push_subscribed", "1");
      setDone(true);
      setTimeout(dismiss, 1500);
    } catch {
      dismiss();
    } finally {
      setEnabling(false);
    }
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enable push notifications"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9000,
        background: "#1C1C1E",
        borderRadius: "16px 16px 0 0",
        padding: "20px 24px calc(28px + env(safe-area-inset-bottom))",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.4)",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Dismiss button */}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.4)",
          cursor: "pointer",
          padding: 4,
          lineHeight: 0,
        }}
      >
        <X style={{ width: 16, height: 16 }} />
      </button>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            background: "rgba(255,255,255,0.1)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Bell style={{ width: 20, height: 20, color: "#fff" }} />
        </div>
        <div>
          <div style={{ color: "#fff", fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2 }}>
            {done ? "Notifications enabled" : "Stay on top of your pipeline"}
          </div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginTop: 3, lineHeight: 1.4 }}>
            {done
              ? "You'll get alerts for renewals, tenant replies, and more."
              : "Get alerts when contracts expire, tenants reply, or owners fill in their forms."}
          </div>
        </div>
      </div>

      {!done && (
        <>
          <button
            onClick={enablePush}
            disabled={enabling}
            style={{
              width: "100%",
              padding: 14,
              background: "#0071E3",
              color: "#fff",
              fontWeight: 600,
              fontSize: 16,
              borderRadius: 12,
              border: "none",
              cursor: enabling ? "default" : "pointer",
              opacity: enabling ? 0.7 : 1,
              letterSpacing: "-0.015em",
            }}
          >
            {enabling ? "Enabling..." : "Enable notifications"}
          </button>

          <button
            onClick={dismiss}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.45)",
              fontSize: 14,
              cursor: "pointer",
              padding: 4,
              alignSelf: "center",
            }}
          >
            Not now
          </button>
        </>
      )}
    </div>
  );
}
