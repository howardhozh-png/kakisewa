"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

export function TopProgressBar() {
  const pathname = usePathname();
  const [value, setValue] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPathname = useRef<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startProgress() {
    if (hideRef.current) { clearTimeout(hideRef.current); hideRef.current = null; }
    if (tickRef.current) clearInterval(tickRef.current);
    setVisible(true);
    setValue(8);
    let v = 8;
    tickRef.current = setInterval(() => {
      v = Math.min(v + Math.random() * 10 + 4, 82);
      setValue(v);
    }, 150);
  }

  function finishProgress() {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    setValue(100);
    hideRef.current = setTimeout(() => { setVisible(false); setValue(0); }, 400);
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
    <ProgressPrimitive.Root
      aria-hidden
      value={value}
      style={{ position: "fixed", top: 64, left: 0, right: 0, zIndex: 99997, pointerEvents: "none" }}
    >
      <ProgressPrimitive.Track
        style={{
          width: "100%",
          height: 4,
          background: "color-mix(in srgb, var(--kk-theme-dark) 18%, transparent)",
          overflow: "hidden",
          borderRadius: 0,
        }}
      >
        <ProgressPrimitive.Indicator
          style={{
            height: "100%",
            background: "var(--kk-theme-dark)",
            transition: value >= 100 ? "width 180ms ease" : "width 120ms linear",
          }}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}
