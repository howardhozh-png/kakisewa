"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function Bar({ width, visible }: { width: number; visible: boolean }) {
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
          transition: width === 100 ? "width 220ms ease, opacity 300ms ease 200ms" : "width 120ms linear",
          width: `${width}%`,
          borderRadius: "0 3px 3px 0",
          boxShadow: "0 0 10px color-mix(in srgb, var(--kk-theme-dark) 60%, transparent)",
          opacity: width === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}

function ProgressBarCore() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevKey = useRef<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startProgress() {
    if (hideRef.current) { clearTimeout(hideRef.current); hideRef.current = null; }
    if (tickRef.current) clearInterval(tickRef.current);
    setVisible(true);
    setWidth(8);
    let w = 8;
    tickRef.current = setInterval(() => {
      w = Math.min(w + Math.random() * 10 + 3, 82);
      setWidth(w);
    }, 150);
  }

  function finishProgress() {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    setWidth(100);
    hideRef.current = setTimeout(() => { setVisible(false); setWidth(0); }, 500);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const a = (e.target as HTMLElement).closest("a[href]");
      if (!a) return;
      const href = (a as HTMLAnchorElement).getAttribute("href")!;
      if (href.startsWith("#") || /^https?:\/\//.test(href) || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      startProgress();
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  useEffect(() => {
    const key = pathname + searchParams.toString();
    if (prevKey.current === null) { prevKey.current = key; return; }
    if (prevKey.current !== key) { prevKey.current = key; finishProgress(); }
  }, [pathname, searchParams]);

  return <Bar width={width} visible={visible} />;
}

export function TopProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBarCore />
    </Suspense>
  );
}
