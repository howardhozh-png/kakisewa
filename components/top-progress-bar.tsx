"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function TopProgressBar() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPathname = useRef<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startProgress() {
    if (hideRef.current) { clearTimeout(hideRef.current); hideRef.current = null; }
    if (tickRef.current) clearInterval(tickRef.current);
    setVisible(true);
    setWidth(10);
    let w = 10;
    tickRef.current = setInterval(() => {
      w = Math.min(w + Math.random() * 12 + 5, 85);
      setWidth(w);
    }, 120);
  }

  function finishProgress() {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    setWidth(100);
    hideRef.current = setTimeout(() => { setVisible(false); setWidth(0); }, 300);
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
          transition: width >= 100 ? "width 200ms ease" : "width 120ms linear",
          borderRadius: "0 2px 2px 0",
        }}
      />
    </div>
  );
}
