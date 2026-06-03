"use client";

import { useEffect, useRef, useState } from "react";

const DISMISSED_KEY = "kk-pwa-dismissed";
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaRegister() {
  // Never render during SSR
  if (typeof window === "undefined") return null;
  return <PwaRegisterInner />;
}

function PwaRegisterInner() {
  const [showAndroid, setShowAndroid] = useState(false);
  const [androidVisible, setAndroidVisible] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration failed — non-fatal
      });
    }

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as { MSStream?: unknown }).MSStream;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;

    if (isIOS && !isStandalone && !isDismissed()) {
      setShowIOS(true);
      const timer = setTimeout(() => {
        setShowIOS(false);
        dismiss();
      }, 8000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      if (isDismissed()) return;
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setShowAndroid(true);
      // Trigger slide-up on next frame
      requestAnimationFrame(() => setAndroidVisible(true));
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Android bottom sheet
  if (showAndroid) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Install kakisewa"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "#1C1C1E",
          borderRadius: "16px 16px 0 0",
          padding: "20px 24px calc(28px + env(safe-area-inset-bottom))",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.4)",
          transform: androidVisible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: 32,
              height: 32,
              background: "#1C1C1E",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 24 24" width={20} height={20} fill="white">
              <rect x="3.5" y="3" width="4" height="18" rx="0.5" />
              <path d="M7.5 12 L18.5 3 L21 5.5 L10 14.5 Z" />
              <path d="M7.5 12 L10 9.5 L21 18.5 L18.5 21 Z" />
            </svg>
          </div>
          <div>
            <div
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: "-0.015em",
                lineHeight: 1.2,
              }}
            >
              Add kakisewa to your home screen
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: 13,
                marginTop: 3,
                lineHeight: 1.4,
              }}
            >
              Get the full app experience — no browser, no URL bar.
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={async () => {
            const prompt = deferredPrompt.current;
            if (!prompt) return;
            await prompt.prompt();
            await prompt.userChoice;
            deferredPrompt.current = null;
            setAndroidVisible(false);
            setTimeout(() => setShowAndroid(false), 320);
            dismiss();
          }}
          style={{
            width: "100%",
            padding: "14px",
            background: "#34C759",
            color: "#FFFFFF",
            fontWeight: 600,
            fontSize: 16,
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            letterSpacing: "-0.015em",
          }}
        >
          Add to Home Screen
        </button>

        <button
          onClick={() => {
            setAndroidVisible(false);
            setTimeout(() => setShowAndroid(false), 320);
            dismiss();
          }}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.50)",
            fontSize: 14,
            cursor: "pointer",
            padding: "4px",
            alignSelf: "center",
          }}
        >
          Not now
        </button>
      </div>
    );
  }

  // iOS floating pill
  if (showIOS) {
    return (
      <div
        role="status"
        style={{
          position: "fixed",
          bottom: "1.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          background: "#FFFFFF",
          borderRadius: 999,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          whiteSpace: "nowrap",
          fontSize: 14,
          fontWeight: 500,
          color: "#1D1D1F",
        }}
      >
        <span>Tap</span>
        {/* iOS share icon */}
        <svg
          viewBox="0 0 24 24"
          width={18}
          height={18}
          fill="none"
          stroke="#007AFF"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8.59 5.41 12 2l3.41 3.41M12 2v13" />
          <path d="M6 9H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1h-2" />
        </svg>
        <span>then &apos;Add to Home Screen&apos;</span>
      </div>
    );
  }

  return null;
}
