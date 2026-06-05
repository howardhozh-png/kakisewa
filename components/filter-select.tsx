"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Option { value: string; label: string; }

export function FilterSelect({
  value,
  onChange,
  options,
  minWidth = 140,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  minWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", minWidth, flexShrink: 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-2 text-[13px] px-3 py-2.5 rounded-full w-full min-h-[40px]"
        style={{
          background: open ? "var(--kk-ink)" : "var(--kk-surface-2)",
          border: open ? "none" : "1px solid var(--kk-line)",
          color: open ? "#fff" : "var(--kk-ink)",
          minWidth,
        }}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown
          className="w-3.5 h-3.5 shrink-0 transition-transform"
          style={{
            color: open ? "#fff" : "var(--kk-ink-mute)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 mt-1 rounded-2xl py-1"
          style={{
            top: "100%",
            zIndex: 9999,
            background: "var(--kk-ink)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.22)",
            minWidth: "max-content",
          }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className="flex items-center justify-between gap-3 w-full px-4 py-3 text-[13px] text-left transition-colors min-h-[44px]"
              style={{
                color: o.value === value ? "#fff" : "rgba(255,255,255,0.65)",
                fontWeight: o.value === value ? 600 : 400,
                background: "transparent",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              {o.label}
              {o.value === value && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "#fff" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
