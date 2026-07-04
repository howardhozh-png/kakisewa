"use client";

import { useEffect, useRef, useState } from "react";

const SKIP_KEY = "kk_pwa_gate_skip_until";
const SKIP_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaGate() {
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Only show on mobile (touch device, no fine pointer / mouse)
    if (window.matchMedia("(pointer: fine)").matches) return;
    if (window.innerWidth > 1024) return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const skipUntil = localStorage.getItem(SKIP_KEY);
    if (skipUntil && Date.now() < parseInt(skipUntil, 10)) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    if (!ios) {
      const handler = (e: Event) => {
        e.preventDefault();
        deferredPrompt.current = e as BeforeInstallPromptEvent;
      };
      window.addEventListener("beforeinstallprompt", handler);
      // Small delay so beforeinstallprompt fires first
      setTimeout(() => {
        setShow(true);
        requestAnimationFrame(() => setVisible(true));
      }, 800);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    } else {
      setTimeout(() => {
        setShow(true);
        requestAnimationFrame(() => setVisible(true));
      }, 800);
    }
  }, []);

  function skip() {
    localStorage.setItem(SKIP_KEY, String(Date.now() + SKIP_TTL_MS));
    setVisible(false);
    setTimeout(() => setShow(false), 340);
  }

  async function install() {
    const prompt = deferredPrompt.current;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferredPrompt.current = null;
    if (outcome === "accepted") {
      setVisible(false);
      setTimeout(() => setShow(false), 340);
    }
  }

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "flex-end",
        opacity: visible ? 1 : 0,
        transition: "opacity 340ms ease",
      }}
    >
      <div
        style={{
          width: "100%",
          background: "var(--kk-surface)",
          borderRadius: "20px 20px 0 0",
          padding: "28px 24px",
          paddingBottom: "calc(32px + env(safe-area-inset-bottom))",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 340ms cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {/* App icon + headline */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192.png"
            width={52}
            height={52}
            alt="kakisewa"
            style={{ borderRadius: 12, flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--kk-ink)", lineHeight: 1.2, letterSpacing: "-0.015em" }}>
              Add kakisewa to your Home Screen
            </div>
            <div style={{ fontSize: 13, color: "var(--kk-ink-mute)", marginTop: 3, lineHeight: 1.4 }}>
              {isIOS
                ? "Required for push notifications and faster loading."
                : "Get push notifications and the full app experience."}
            </div>
          </div>
        </div>

        {isIOS ? (
          <>
            {/* iOS step-by-step */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {[
                {
                  n: 1,
                  text: (
                    <span>
                      Tap the{" "}
                      <span style={{ display: "inline-flex", verticalAlign: "middle", margin: "0 2px" }}>
                        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#007AFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8.59 5.41 12 2l3.41 3.41M12 2v13" />
                          <path d="M6 9H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1h-2" />
                        </svg>
                      </span>{" "}
                      <strong>Share</strong> button in Safari
                    </span>
                  ),
                },
                { n: 2, text: <span>Scroll down and tap <strong>Add to Home Screen</strong></span> },
                { n: 3, text: <span>Tap <strong>Add</strong> to confirm</span> },
              ].map(({ n, text }) => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 99,
                    background: "var(--kk-ink)", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                  }}>
                    {n}
                  </div>
                  <div style={{ fontSize: 14, color: "var(--kk-ink)", lineHeight: 1.4 }}>{text}</div>
                </div>
              ))}
            </div>
            <button onClick={skip} style={{
              width: "100%", padding: "14px",
              background: "none", border: "1.5px solid var(--kk-line)",
              borderRadius: 12, fontSize: 15, fontWeight: 600,
              color: "var(--kk-ink-mute)", cursor: "pointer", marginBottom: 8,
            }}>
              I&apos;ll do this later
            </button>
          </>
        ) : (
          <>
            {/* Android — trigger native install */}
            <button onClick={install} style={{
              width: "100%", padding: "14px",
              background: "var(--kk-blue)", border: "none",
              borderRadius: 12, fontSize: 15, fontWeight: 600,
              color: "#fff", cursor: "pointer", marginBottom: 12,
              letterSpacing: "-0.015em",
            }}>
              Add to Home Screen
            </button>
            <button onClick={skip} style={{
              display: "block", width: "100%", padding: "8px",
              background: "none", border: "none",
              fontSize: 14, color: "var(--kk-ink-mute)", cursor: "pointer",
              textAlign: "center",
            }}>
              I&apos;ll do this later
            </button>
          </>
        )}
      </div>
    </div>
  );
}
