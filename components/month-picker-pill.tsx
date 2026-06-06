"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface Props {
  value: string; // "YYYY-MM"
  onChange: (value: string) => void;
}

export function MonthPickerPill({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [vy, vm] = value.split("-").map(Number);
  const [navYear, setNavYear] = useState(vy);

  function handleOpenChange(o: boolean) {
    if (o) setNavYear(vy);
    setOpen(o);
  }

  function select(m: number) {
    onChange(`${navYear}-${String(m).padStart(2, "0")}`);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 12,
            border: "1px solid var(--kk-line)", background: "var(--kk-surface-2)",
            color: "var(--kk-ink)", outline: "none", fontWeight: 500,
            cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          {MONTHS[vm - 1]} {vy}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="p-3 w-[180px]"
        style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", borderRadius: 14, boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}
      >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <button onClick={() => setNavYear(y => y - 1)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 8px", borderRadius: 6, color: "var(--kk-ink)", fontSize: 16, lineHeight: 1 }}>‹</button>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--kk-ink)" }}>{navYear}</span>
            <button onClick={() => setNavYear(y => y + 1)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 8px", borderRadius: 6, color: "var(--kk-ink)", fontSize: 16, lineHeight: 1 }}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
            {MONTHS.map((name, i) => {
              const selected = navYear === vy && i + 1 === vm;
              return (
                <button
                  key={i}
                  onClick={() => select(i + 1)}
                  style={{
                    fontSize: 11, fontWeight: selected ? 600 : 400,
                    padding: "6px 0", borderRadius: 8, border: "none",
                    cursor: "pointer",
                    background: selected ? "var(--kk-ink)" : "transparent",
                    color: selected ? "#fff" : "var(--kk-ink)",
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </PopoverContent>
    </Popover>
  );
}
