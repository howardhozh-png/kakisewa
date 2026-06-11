"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export function TopProgressBar() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [barVisible, setBarVisible] = useState(false);
  const [spinnerVisible, setSpinnerVisible] = useState(false);
  const prevPathname = useRef<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const barHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinnerHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startProgress() {
    if (barHideRef.current) { clearTimeout(barHideRef.current); barHideRef.current = null; }
    if (spinnerHideRef.current) { clearTimeout(spinnerHideRef.current); spinnerHideRef.current = null; }
    if (tickRef.current) clearInterval(tickRef.current);
    // flushSync forces a paint BEFORE Next.js's link handler fires navigation.
    // Without this, prefetched routes commit in the same JS tick as the click,
    // React batches startProgress + finishProgress and the spinner never renders.
    flushSync(() => {
      setBarVisible(true);
      setSpinnerVisible(true);
      setWidth(8);
    });
    let w = 8;
    tickRef.current = setInterval(() => {
      w = Math.min(w + Math.random() * 10 + 4, 82);
      setWidth(w);
    }, 150);
  }

  function finishProgress() {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    setWidth(100);
    barHideRef.current = setTimeout(() => { setBarVisible(false); setWidth(0); }, 400);
    // 600ms gives enough time to cover RSC streaming without being too long on fast pages
    spinnerHideRef.current = setTimeout(() => setSpinnerVisible(false), 600);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const a = (e.target as HTMLElement).closest("a[href]");
      if (!a) return;
      const href = (a as HTMLAnchorElement).getAttribute("href")!;
      if (!href || href.startsWith("#") || /^https?:\/\//.test(href) || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      startProgress();
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  useEffect(() => {
    if (prevPathname.current === null) {
      prevPathname.current = pathname;
      return;
    }
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      finishProgress();
    }
  }, [pathname]);

  return (
    <>
      {/* Top progress bar */}
      {barVisible && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            zIndex: 100001,
            pointerEvents: "none",
            background: "color-mix(in srgb, var(--kk-theme-dark) 20%, transparent)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${width}%`,
              background: "var(--kk-theme-dark)",
              transition: width >= 100 ? "width 200ms ease" : "width 140ms linear",
              borderRadius: "0 3px 3px 0",
            }}
          />
        </div>
      )}

      {/* Centered spinner — stays visible through RSC streaming until content renders */}
      {spinnerVisible && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99995,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.35)",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "var(--kk-surface)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: "var(--kk-theme-dark)" }} />
          </div>
        </div>
      )}
    </>
  );
}
