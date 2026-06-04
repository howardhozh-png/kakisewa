"use client";

import { useState, useRef } from "react";
import { GripVertical } from "lucide-react";

const ITEMS = [
  {
    before: "Closes a deal. Earns nothing when it renews.",
    afterBold: "Every renewal = half a month's rent.",
    afterRest: " Tracked automatically.",
  },
  {
    before: "No idea which contracts expire next month. Or next year.",
    afterBold: "60-day alert.",
    afterRest: " You follow up before anyone else does.",
  },
  {
    before: "Zero visibility into income 6, 12, 24 months from now.",
    afterBold: "See your full pipeline 1–3 years ahead.",
    afterRest: " Plan, don't react.",
  },
  {
    before: "Texts owners. No brand. No tracking. Low reply rate.",
    afterBold: "Branded profile.",
    afterRest: " Owners know who you are before they reply.",
  },
  {
    before: "Sends tenant profiles one by one. Looks like spam.",
    afterBold: "One tenant pack link.",
    afterRest: " Owners take you seriously instantly.",
  },
];

export function ComparisonSlider() {
  const [splitPct, setSplitPct] = useState(50);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function onMove(clientX: number) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 15), 85);
    setSplitPct(pct);
  }

  return (
    <div className="max-w-[960px] mx-auto">
      <div className="text-center mb-14">
        <p className="uppercase font-semibold mb-5" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.14em" }}>
          The income gap
        </p>
        <h2 className="serif mx-auto" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.022em", maxWidth: "28ch" }}>
          How agents work{" "}
          <span style={{ color: "#DC2626" }}>today</span>{" "}
          vs{" "}
          <span style={{ color: "var(--kk-green)" }}>with kakisewa</span>
        </h2>
        <p className="mt-4 text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>
          Drag to compare
        </p>
      </div>

      <div
        ref={containerRef}
        className="relative flex rounded-2xl overflow-hidden select-none"
        style={{ cursor: dragging ? "ew-resize" : "default", border: "1px solid var(--kk-line)" }}
        onMouseMove={e => dragging && onMove(e.clientX)}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        onTouchMove={e => { dragging && onMove(e.touches[0].clientX); }}
        onTouchEnd={() => setDragging(false)}
      >
        {/* Left: Agents Today */}
        <div
          className="flex-shrink-0 overflow-hidden flex flex-col"
          style={{ width: `${splitPct}%`, background: "#141414" }}
        >
          <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: "2px solid #ef4444" }}>
            <span className="font-bold uppercase tracking-widest" style={{ fontSize: 10, color: "#ef4444" }}>
              Agents today
            </span>
          </div>
          {ITEMS.map((item, i) => (
            <div
              key={i}
              className="px-6 py-5 flex items-start gap-3 flex-shrink-0"
              style={{ borderBottom: i < ITEMS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
            >
              <span style={{ color: "#ef4444", fontWeight: 900, flexShrink: 0, marginTop: 2, fontSize: "1.05em" }}>✗</span>
              <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                {item.before}
              </p>
            </div>
          ))}
        </div>

        {/* Divider handle */}
        <div
          className="relative z-10 flex-shrink-0 flex items-center justify-center"
          style={{ width: 3, background: "rgba(0,0,0,0.08)", cursor: "ew-resize" }}
          onMouseDown={e => { e.preventDefault(); setDragging(true); }}
          onTouchStart={() => setDragging(true)}
        >
          <button
            className="absolute flex items-center justify-center rounded-full shadow-xl"
            style={{
              width: 36, height: 36,
              background: "#fff",
              border: "1.5px solid rgba(0,0,0,0.12)",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              flexShrink: 0,
            }}
            onMouseDown={e => { e.preventDefault(); setDragging(true); }}
          >
            <GripVertical className="w-4 h-4" style={{ color: "#888" }} />
          </button>
        </div>

        {/* Right: With KakiSewa */}
        <div
          className="flex-shrink-0 overflow-hidden flex flex-col"
          style={{ width: `${100 - splitPct}%`, background: "#fff" }}
        >
          <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: "2px solid var(--kk-green)" }}>
            <span className="font-bold uppercase tracking-widest" style={{ fontSize: 10, color: "var(--kk-green)" }}>
              With kakisewa
            </span>
          </div>
          {ITEMS.map((item, i) => (
            <div
              key={i}
              className="px-6 py-5 flex items-start gap-3 flex-shrink-0"
              style={{ borderBottom: i < ITEMS.length - 1 ? "1px solid var(--kk-line)" : "none" }}
            >
              <span style={{ color: "var(--kk-green)", fontWeight: 900, flexShrink: 0, marginTop: 2, fontSize: "1.05em" }}>✓</span>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--kk-ink)" }}>
                <strong>{item.afterBold}</strong>{item.afterRest}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
