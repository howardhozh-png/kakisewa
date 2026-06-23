"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { getCalendarEventDatesForMonth } from "@/lib/actions";
import type { DayButtonProps } from "react-day-picker";

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

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
  const [open, setOpen] = useState(false);
  const [eventDates, setEventDates] = useState<Set<string>>(new Set());
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() =>
    value ? new Date(value + "T00:00:00") : new Date()
  );

  useEffect(() => {
    const converted = isoToDMY(value);
    if (converted !== display) setDisplay(converted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const fetchEventDates = useCallback(async (month: Date) => {
    const key = toMonthKey(month);
    const dates = await getCalendarEventDatesForMonth(key);
    setEventDates(new Set(dates));
  }, []);

  useEffect(() => {
    if (open) fetchEventDates(displayedMonth);
  }, [open, displayedMonth, fetchEventDates]);

  const selectedDate = value && value.match(/^\d{4}-\d{2}-\d{2}$/)
    ? new Date(value + "T00:00:00")
    : undefined;

  function handleSelect(date: Date | undefined) {
    setOpen(false);
    if (!date) return;
    const iso = toISO(date);
    onChange(iso);
    setDisplay(isoToDMY(iso));
  }

  const DotDayButton = useMemo(() => {
    return function DotDayButton({ day, modifiers, children, ...props }: DayButtonProps) {
      const hasEvent = eventDates.has(toISO(day.date));
      return (
        <button {...props} style={{ position: "relative", ...props.style }}>
          {children}
          {hasEvent && (
            <span style={{
              position: "absolute",
              bottom: 2,
              left: "50%",
              transform: "translateX(-50%)",
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "var(--kk-blue)",
              opacity: 0.7,
              pointerEvents: "none",
            }} />
          )}
        </button>
      );
    };
  }, [eventDates]);

  return (
    <div className="relative">
      <input
        type="text"
        value={display}
        placeholder={placeholder}
        className={className}
        style={{ ...style, paddingRight: 36 }}
        required={required}
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

      {name && <input type="hidden" name={name} value={value || ""} />}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--kk-ink-faint)", background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 0 }}
            tabIndex={-1}
            aria-label="Open date picker"
          >
            <CalendarDays className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selectedDate}
            month={displayedMonth}
            onMonthChange={(m) => setDisplayedMonth(m)}
            onSelect={handleSelect}
            components={{ DayButton: DotDayButton }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
