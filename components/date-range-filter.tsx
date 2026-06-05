"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface Props {
  label?: string;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}

function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso + "T00:00:00");
  return isNaN(d.getTime()) ? undefined : d;
}

function dateToIso(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function DateRangeFilter({ label = "Available from", from, to, onFrom, onTo }: Props) {
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const [draft, setDraft] = useState<DateRange | undefined>(undefined);
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear]   = useState(today.getFullYear());

  const btnRef = useRef<HTMLButtonElement>(null);

  // Sync draft + month/year when panel opens
  useEffect(() => {
    if (open) {
      const f = isoToDate(from);
      const t = isoToDate(to);
      setDraft(f || t ? { from: f, to: t } : undefined);
      const anchor = f ?? today;
      setMonth(anchor.getMonth());
      setYear(anchor.getFullYear());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const panel = document.querySelector("[data-drpanel]");
      if (!panel?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, []);

  function handleToggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const panelW = Math.min(320, window.innerWidth - 16);
      const left = Math.min(r.left, window.innerWidth - panelW - 8);
      setPos({ top: r.bottom + 8, left: Math.max(8, left) });
    }
    setOpen(o => !o);
  }

  function handleApply() {
    onFrom(draft?.from ? dateToIso(draft.from) : "");
    onTo(draft?.to ? dateToIso(draft.to) : "");
    setOpen(false);
  }

  function handleClear() {
    setDraft(undefined);
    onFrom(""); onTo("");
    setOpen(false);
  }

  const active = from || to;
  const displayLabel = from && to
    ? `${format(new Date(from + "T00:00:00"), "d MMM")} – ${format(new Date(to + "T00:00:00"), "d MMM")}`
    : from ? `From ${format(new Date(from + "T00:00:00"), "d MMM")}`
    : to   ? `Until ${format(new Date(to + "T00:00:00"), "d MMM")}`
    : label;

  const displayMonth = new Date(year, month, 1);
  const yearRange = Array.from({ length: 10 }, (_, i) => today.getFullYear() - 1 + i);

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
            background: "var(--kk-surface)",
            border: "1px solid var(--kk-line)",
            borderRadius: 20,
            boxShadow: "0 16px 40px rgba(0,0,0,0.14)",
            padding: "16px 16px 12px",
            width: Math.min(320, window.innerWidth - 16),
          }}
        >
          {/* Month / Year dropdowns */}
          <div className="flex items-center gap-2 mb-3">
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="flex-1 text-[13px] font-medium px-3 py-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: "var(--kk-surface-2)",
                border: "1px solid var(--kk-line)",
                color: "var(--kk-ink)",
                outline: "none",
              }}
            >
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="text-[13px] font-medium px-3 py-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: "var(--kk-surface-2)",
                border: "1px solid var(--kk-line)",
                color: "var(--kk-ink)",
                outline: "none",
              }}
            >
              {yearRange.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Calendar */}
          <Calendar
            mode="range"
            selected={draft}
            onSelect={setDraft}
            month={displayMonth}
            onMonthChange={d => { setMonth(d.getMonth()); setYear(d.getFullYear()); }}
          />

          {/* Footer */}
          <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--kk-line)" }}>
            <button
              onClick={handleClear}
              className="flex-1 text-[13px] py-2 rounded-full font-medium"
              style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
            >
              Clear
            </button>
            <button
              onClick={handleApply}
              className="flex-1 text-[13px] py-2 rounded-full font-semibold"
              style={{ background: "var(--kk-ink)", color: "#fff" }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </>
  );
}
