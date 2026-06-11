"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevKey = useRef(pathname + searchParams.toString());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startProgress() {
    if (tickRef.current) clearInterval(tickRef.current);
    if (hideRef.current) clearTimeout(hideRef.current);
    setVisible(true);
    setWidth(0);
    let w = 0;
    tickRef.current = setInterval(() => {
      w = Math.min(w + Math.random() * 12 + 4, 82);
      setWidth(w);
    }, 120);
  }

  function finishProgress() {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    setWidth(100);
    hideRef.current = setTimeout(() => { setVisible(false); setWidth(0); }, 350);
  }

  // Intercept clicks on internal links to start the bar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || /^https?:\/\//.test(href) || href.startsWith("mailto:")) return;
      startProgress();
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Finish when pathname changes (navigation complete)
  useEffect(() => {
    const key = pathname + searchParams.toString();
    if (prevKey.current !== key) {
      prevKey.current = key;
      finishProgress();
    }
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 99999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          background: "var(--kk-theme-dark)",
          transition: width === 100 ? "width 200ms ease" : "width 120ms linear",
          width: `${width}%`,
          borderRadius: "0 3px 3px 0",
          boxShadow: "0 0 8px color-mix(in srgb, var(--kk-theme-dark) 55%, transparent)",
        }}
      />
    </div>
  );
}

export function TopProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBarInner />
    </Suspense>
  );
}
