"use client";

import { useEffect, useState } from "react";
import { X, Share, Smartphone } from "lucide-react";

const LS_DISMISSED = "kk_install_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallBanner() {
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(LS_DISMISSED) === "1") return;

    // Already installed (standalone mode)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIos(ios);
    setShow(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(LS_DISMISSED, "1");
    setShow(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") dismiss();
    else setInstalling(false);
  }

  if (!show) return null;

  return (
    <div
      style={{
        background: "var(--kk-surface)",
        borderBottom: "1px solid var(--kk-line)",
        padding: "12px 16px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: "var(--kk-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Smartphone className="w-4 h-4" style={{ color: "#fff" }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)", lineHeight: 1.3 }}>
          Get the full app experience
        </p>

        {isIos ? (
          <p style={{ fontSize: 12, color: "var(--kk-ink-mute)", marginTop: 3, lineHeight: 1.5 }}>
            Tap{" "}
            <Share
              style={{
                display: "inline",
                width: 12,
                height: 12,
                verticalAlign: "middle",
                marginBottom: 1,
                color: "var(--kk-ink)",
              }}
            />{" "}
            then <strong style={{ color: "var(--kk-ink)" }}>"Add to Home Screen"</strong> to enable push notifications and offline access.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 12, color: "var(--kk-ink-mute)", marginTop: 3, lineHeight: 1.5 }}>
              Install KakiSewa for push notifications and offline access.
            </p>
            {deferredPrompt && (
              <button
                onClick={install}
                disabled={installing}
                style={{
                  marginTop: 8,
                  background: "var(--kk-accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 20,
                  padding: "5px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: installing ? 0.7 : 1,
                }}
              >
                {installing ? "Installing…" : "Install app"}
              </button>
            )}
          </>
        )}
      </div>

      <button
        onClick={dismiss}
        style={{ color: "var(--kk-ink-faint)", flexShrink: 0, padding: 2 }}
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
