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
    setWidth(8);
    let w = 8;
    tickRef.current = setInterval(() => {
      w = Math.min(w + Math.random() * 10 + 4, 82);
      setWidth(w);
    }, 150);
  }

  function finishProgress() {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    setWidth(100);
    hideRef.current = setTimeout(() => { setVisible(false); setWidth(0); }, 400);
  }

  // Start bar when any internal link is clicked (capture phase = fires before Next.js intercepts)
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

  // Finish when pathname changes (navigation completed)
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
      style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 99999, pointerEvents: "none" }}
    >
      <div
        style={{
          height: "100%",
          background: "var(--kk-theme-dark)",
          width: `${width}%`,
          transition: width >= 100 ? "width 180ms ease" : "width 120ms linear",
          borderRadius: "0 3px 3px 0",
          boxShadow: "0 0 10px color-mix(in srgb, var(--kk-theme-dark) 55%, transparent)",
        }}
      />
    </div>
  );
}
