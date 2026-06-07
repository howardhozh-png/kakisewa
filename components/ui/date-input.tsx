"use client";

import { useState, useEffect, useRef } from "react";
import { CalendarDays } from "lucide-react";

function isoToDMY(iso: string): string {
  if (!iso || !iso.match(/^\d{4}-\d{2}-\d{2}$/)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function dmyToIso(dmy: string): string {
  const parts = dmy.split("/");
  if (parts.length === 3 && parts[2].length === 4) {
    const [d, m, y] = parts;
    const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    const ts = new Date(iso).getTime();
    if (!isNaN(ts)) return iso;
  }
  return "";
}

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (iso: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  required?: boolean;
  name?: string;
}

export function DateInput({ value, onChange, className, style, placeholder = "DD/MM/YYYY", required, name }: Props) {
  const [display, setDisplay] = useState(() => isoToDMY(value));
  const nativeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const converted = isoToDMY(value);
    if (converted !== display) setDisplay(converted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      <input
        type="text"
        value={display}
        placeholder={placeholder}
        className={className}
        style={{ ...style, paddingRight: 36 }}
        required={required}
        name={name}
        onChange={(e) => {
          const raw = e.target.value;
          setDisplay(raw);
          const iso = dmyToIso(raw);
          if (iso) onChange(iso);
          else if (!raw) onChange("");
        }}
        onBlur={() => {
          const iso = dmyToIso(display);
          if (iso) {
            setDisplay(isoToDMY(iso));
            onChange(iso);
          } else if (!display.trim()) {
            onChange("");
          }
        }}
      />

      {/* Native date input — truly hidden, triggered programmatically by the button below */}
      <input
        ref={nativeRef}
        type="date"
        value={value || ""}
        onChange={(e) => {
          const iso = e.target.value;
          onChange(iso);
          setDisplay(isoToDMY(iso));
        }}
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none", border: "none", padding: 0, margin: 0 }}
      />

      {/* Calendar icon button — opens the native date picker on click */}
      <button
        type="button"
        className="absolute right-2.5 top-1/2 -translate-y-1/2"
        style={{ color: "var(--kk-ink-faint)", background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 0 }}
        onClick={() => { nativeRef.current?.showPicker?.(); nativeRef.current?.click(); }}
        tabIndex={-1}
        aria-label="Open date picker"
      >
        <CalendarDays className="w-4 h-4" />
      </button>
    </div>
  );
}
