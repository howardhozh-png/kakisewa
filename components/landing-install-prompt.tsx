"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const DISMISSED_KEY = "kk-landing-install-dismissed";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isDismissed() {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;
    return Date.now() - parseInt(raw, 10) < DISMISS_TTL_MS;
  } catch { return false; }
}

function dismiss() {
  try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* */ }
}

type Platform = "ios" | "android" | null;

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as { MSStream?: unknown }).MSStream) return "ios";
  if (/Android/.test(ua)) return "android";
  return null;
}

export function LandingInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt?: () => void } | null>(null);
  const [iosStep, setIosStep] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    if (!p) return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    if (isDismissed()) return;
    setPlatform(p);

    // Capture Android install event
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt?: () => void });
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const t = setTimeout(() => setVisible(true), 2000);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  function close() {
    setVisible(false);
    dismiss();
  }

  async function handleInstall() {
    if (platform === "android" && deferredPrompt?.prompt) {
      deferredPrompt.prompt();
      close();
    } else if (platform === "ios") {
      setIosStep(true);
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[99990] flex items-end pointer-events-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={close}
      />

      {/* Sheet */}
      <div
        className="relative w-full pointer-events-auto rounded-t-3xl px-6 pt-5 pb-8"
        style={{
          background: "#1C1C1E",
          boxShadow: "0 -12px 40px rgba(0,0,0,0.5)",
          animation: "slideUp 320ms cubic-bezier(0.34,1.3,0.64,1) both",
        }}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(255,255,255,0.2)" }} />

        {/* Close */}
        <button
          onClick={close}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.7)" }} />
        </button>

        {!iosStep ? (
          <>
            {/* Icon + headline */}
            <div className="flex items-center gap-4 mb-5">
              <div
                className="shrink-0 rounded-2xl flex items-center justify-center"
                style={{ width: 56, height: 56, background: "#fff" }}
              >
                <svg viewBox="0 0 24 24" width={36} height={36} fill="#1C1C1E">
                  <rect x="3.5" y="3" width="4" height="18" rx="0.5" />
                  <path d="M7.5 12 L18.5 3 L21 5.5 L10 14.5 Z" />
                  <path d="M7.5 12 L10 9.5 L21 18.5 L18.5 21 Z" />
                </svg>
              </div>
              <div>
                <p className="text-[18px] font-bold leading-tight" style={{ color: "#fff" }}>
                  kakisewa works like an app
                </p>
                <p className="text-[13px] mt-0.5 leading-snug" style={{ color: "rgba(255,255,255,0.55)" }}>
                  No App Store. Just add it to your home screen.
                </p>
              </div>
            </div>

            {/* Feature chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {["No browser bar", "Launches instantly", "Works offline"].map((f) => (
                <span
                  key={f}
                  className="text-[12px] font-medium px-3 py-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.7)" }}
                >
                  {f}
                </span>
              ))}
            </div>

            <button
              onClick={handleInstall}
              className="w-full py-4 rounded-2xl text-[16px] font-bold transition-opacity hover:opacity-90 active:opacity-80"
              style={{ background: "#34C759", color: "#fff" }}
            >
              {platform === "android" ? "Add to Home Screen →" : "Show me how →"}
            </button>
          </>
        ) : (
          /* iOS step-by-step */
          <>
            <p className="text-[17px] font-bold mb-5" style={{ color: "#fff" }}>
              Add kakisewa to your home screen
            </p>
            <div className="space-y-4 mb-7">
              {[
                {
                  num: "1",
                  text: "Tap the Share button",
                  sub: "The box with an arrow pointing up at the bottom of Safari",
                  icon: (
                    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  ),
                },
                {
                  num: "2",
                  text: "Tap \"Add to Home Screen\"",
                  sub: "Scroll down in the share sheet to find this option",
                  icon: (
                    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <path d="M17.5 14v6M14.5 17h6" />
                    </svg>
                  ),
                },
                {
                  num: "3",
                  text: "Tap \"Add\" to confirm",
                  sub: "kakisewa will appear on your home screen like any app",
                  icon: (
                    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ),
                },
              ].map((step) => (
                <div key={step.num} className="flex items-start gap-4">
                  <div
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(52,199,89,0.18)", color: "#34C759" }}
                  >
                    {step.icon}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold" style={{ color: "#fff" }}>{step.text}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{step.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={close}
              className="w-full py-4 rounded-2xl text-[16px] font-bold"
              style={{ background: "#34C759", color: "#fff" }}
            >
              Got it
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
