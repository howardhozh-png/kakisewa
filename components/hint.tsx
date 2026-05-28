"use client";

import { useState, useRef, useEffect } from "react";

interface HintProps {
  text: string;
  side?: "top" | "bottom" | "left" | "right";
}

export function Hint({ text, side = "top" }: HintProps) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!show) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setShow(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [show]);

  const tipStyles: Record<string, React.CSSProperties> = {
    top:    { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top:    "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    left:   { right:  "calc(100% + 8px)", top:  "50%", transform: "translateY(-50%)" },
    right:  { left:   "calc(100% + 8px)", top:  "50%", transform: "translateY(-50%)" },
  };

  const arrowStyles: Record<string, React.CSSProperties> = {
    top:    { top: "100%",    left: "50%", transform: "translateX(-50%)", borderTop:    "5px solid var(--kk-ink)", borderLeft: "5px solid transparent", borderRight: "5px solid transparent" },
    bottom: { bottom: "100%", left: "50%", transform: "translateX(-50%)", borderBottom: "5px solid var(--kk-ink)", borderLeft: "5px solid transparent", borderRight: "5px solid transparent" },
    left:   { left:   "100%", top:  "50%", transform: "translateY(-50%)", borderLeft:   "5px solid var(--kk-ink)", borderTop:  "5px solid transparent", borderBottom: "5px solid transparent" },
    right:  { right:  "100%", top:  "50%", transform: "translateY(-50%)", borderRight:  "5px solid var(--kk-ink)", borderTop:  "5px solid transparent", borderBottom: "5px solid transparent" },
  };

  return (
    <span ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow((s) => !s)}
        className="w-[15px] h-[15px] rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 select-none"
        style={{
          background: "var(--kk-surface-2)",
          color: "var(--kk-ink-faint)",
          border: "1.5px solid var(--kk-line-strong)",
          lineHeight: 1,
        }}
        aria-label="Help"
      >
        ?
      </button>

      {show && (
        <span
          className="absolute z-[9999] pointer-events-none"
          style={tipStyles[side]}
        >
          <span
            className="block px-3 py-2 rounded-xl text-[12px] leading-snug"
            style={{
              background: "var(--kk-ink)",
              color: "#fff",
              boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
              width: 220,
              whiteSpace: "normal",
            }}
          >
            {text}
          </span>
          <span className="absolute w-0 h-0" style={arrowStyles[side]} />
        </span>
      )}
    </span>
  );
}
