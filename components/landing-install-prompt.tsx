"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type Platform = "ios" | "android" | null;
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as { MSStream?: unknown }).MSStream) return "ios";
  if (/Android/.test(ua)) return "android";
  return null;
}

const STEPS_ANDROID = [
  {
    icon: (
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
      </svg>
    ),
    text: "Tap the menu (⋮) in Chrome",
    sub: "Three dots in the top-right corner of your browser",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><path d="M17.5 14v6M14.5 17h6" />
      </svg>
    ),
    text: "Tap \"Add to Home screen\"",
    sub: "Or Chrome may show a banner at the bottom automatically",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    text: "Tap \"Add\" to confirm",
    sub: "kakisewa opens like a native app, no App Store needed",
  },
];

const STEPS_IOS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    ),
    text: "Tap the Share button ↑",
    sub: "The box-with-arrow icon at the bottom-centre of Safari",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
      </svg>
    ),
    text: "Scroll down, tap \"Add to Home Screen\"",
    sub: "If you don't see it immediately, swipe up on the share sheet",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    text: "Tap \"Add\" to confirm",
    sub: "kakisewa will appear on your home screen, launches without a browser",
  },
];

export function LandingInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);
  const [showSteps, setShowSteps] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.innerWidth >= 1024) return;

    const p = detectPlatform();
    if (!p) return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    setPlatform(p);

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const t = setTimeout(() => setVisible(true), 1500);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  function close() {
    setVisible(false);
    setShowSteps(false);
  }

  function handleCta() {
    if (platform === "android" && deferredPrompt.current) {
      // Trigger native dialog immediately AND show steps as backup
      deferredPrompt.current.prompt();
    }
    setShowSteps(true);
  }

  if (!visible) return null;

  const steps = platform === "ios" ? STEPS_IOS : STEPS_ANDROID;

  return (
    <div
      className="fixed inset-0 z-[99990] flex items-end pointer-events-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={close}
      />

      {/* Sheet */}
      <div
        className="relative w-full pointer-events-auto rounded-t-3xl px-6 pt-5 pb-8"
        style={{
          background: "#1C1C1E",
          boxShadow: "0 -16px 48px rgba(0,0,0,0.6)",
          animation: "kkSlideUp 340ms cubic-bezier(0.34,1.2,0.64,1) both",
        }}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(255,255,255,0.18)" }} />

        {/* Close */}
        <button
          onClick={close}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.6)" }} />
        </button>

        {!showSteps ? (
          /* ── Landing view ── */
          <>
            <div className="flex items-center gap-4 mb-5">
              <div className="shrink-0 rounded-2xl flex items-center justify-center" style={{ width: 56, height: 56, background: "#fff" }}>
                <svg viewBox="0 0 24 24" width={36} height={36} fill="none">
                  <path
                    d="M6 3 L6 21 L17 21 M6 12 L17 4"
                    stroke="#000000"
                    strokeWidth="2.8"
                    strokeLinecap="butt"
                    strokeLinejoin="miter"
                  />
                </svg>
              </div>
              <div>
                <p className="text-[18px] font-bold leading-tight" style={{ color: "#fff" }}>
                  No download required
                </p>
                <p className="text-[13px] mt-1 leading-snug" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Add kakisewa to your home screen as an app
                </p>
              </div>
            </div>

            <button
              onClick={handleCta}
              className="w-full py-4 rounded-2xl text-[16px] font-bold transition-opacity hover:opacity-90 active:opacity-75"
              style={{ background: "#34C759", color: "#fff" }}
            >
              Add to Home Screen →
            </button>
          </>
        ) : (
          /* ── Step-by-step ── */
          <>
            <p className="text-[17px] font-bold mb-1" style={{ color: "#fff" }}>
              {platform === "ios" ? "Add kakisewa to Safari" : "Add kakisewa to Home Screen"}
            </p>
            <p className="text-[13px] mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
              {platform === "ios"
                ? "Follow these 3 steps in Safari:"
                : "If the dialog didn't open, follow these steps:"}
            </p>

            <div className="space-y-4 mb-7">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(52,199,89,0.15)", color: "#34C759" }}
                  >
                    {step.icon}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold" style={{ color: "#fff" }}>{step.text}</p>
                    <p className="text-[12px] mt-0.5 leading-snug" style={{ color: "rgba(255,255,255,0.4)" }}>{step.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={close}
              className="w-full py-4 rounded-2xl text-[16px] font-bold transition-opacity hover:opacity-90"
              style={{ background: "#34C759", color: "#fff" }}
            >
              Got it
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes kkSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
