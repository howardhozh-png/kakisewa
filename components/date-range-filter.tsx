"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarDays } from "lucide-react";

interface Props {
  label?: string;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}

export function DateRangeFilter({ label = "Available from", from, to, onFrom, onTo }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  // Draft state — only committed on "Done"
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo]     = useState(to);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Sync draft when panel opens
  useEffect(() => {
    if (open) { setDraftFrom(from); setDraftTo(to); }
  }, [open]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const panel = document.querySelector("[data-drpanel]");
      if (!panel?.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onMouseDown); document.removeEventListener("keydown", onKey); };
  }, []);

  function handleToggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const panelWidth = Math.min(280, window.innerWidth - 16);
      const left = Math.min(r.left, window.innerWidth - panelWidth - 8);
      setPos({ top: r.bottom + 8, left: Math.max(8, left) });
    }
    setOpen((o) => !o);
  }

  function handleDone() {
    onFrom(draftFrom);
    onTo(draftTo);
    setOpen(false);
  }

  function handleClear() {
    setDraftFrom("");
    setDraftTo("");
    onFrom("");
    onTo("");
    setOpen(false);
  }

  const active = from || to;
  const displayLabel = from && to ? `${from} – ${to}` : from ? `From ${from}` : to ? `Until ${to}` : label;

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="flex items-center gap-2 text-[13px] px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap"
        style={{
          background: active ? "var(--kk-ink)" : "var(--kk-surface-2)",
          border: active ? "none" : "1px solid var(--kk-line)",
          color: active ? "#fff" : "var(--kk-ink)",
        }}
      >
        <CalendarDays className="w-3.5 h-3.5 shrink-0" />
        <span>{displayLabel}</span>
      </button>

      {open && (
        <div
          data-drpanel
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 99999,
            background: "#fff",
            border: "1px solid var(--kk-line)",
            borderRadius: 20,
            boxShadow: "0 16px 40px rgba(0,0,0,0.14)",
            padding: 20,
            width: Math.min(280, window.innerWidth - 16),
          }}
        >
          <p className="text-[11px] font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kk-ink-faint)" }}>
            {label}: date range
          </p>
          <div className="flex flex-col gap-2.5">
            <div>
              <label className="text-[11px] mb-1 block" style={{ color: "var(--kk-ink-mute)" }}>From</label>
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="w-full text-[13px] px-3 py-2 rounded-xl"
                style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
              />
            </div>
            <div>
              <label className="text-[11px] mb-1 block" style={{ color: "var(--kk-ink-mute)" }}>To</label>
              <input
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="w-full text-[13px] px-3 py-2 rounded-xl"
                style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
              />
            </div>
            <div className="flex gap-2 mt-1">
              <button
                onClick={handleClear}
                className="flex-1 text-[13px] text-center py-2 rounded-xl"
                style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
              >
                Clear dates
              </button>
              <button
                onClick={handleDone}
                className="flex-1 text-[13px] text-center py-2 rounded-xl font-semibold"
                style={{ background: "var(--kk-ink)", color: "#fff" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
