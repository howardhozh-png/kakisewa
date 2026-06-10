"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { CanonicalField } from "@/lib/tenancy-csv-import";

export interface MappingOption {
  value: CanonicalField | "skip";
  label: string;
}

interface Props {
  value: CanonicalField | "skip" | null;
  onChange: (value: CanonicalField | "skip" | null) => void;
  options: MappingOption[];
}

export function ColumnMappingCombobox({ value, onChange, options }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayValue = open ? query : (selectedOption?.label ?? "");

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()) || o.value.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative", minWidth: 200 }}>
      <div
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
        style={{
          display: "flex",
          alignItems: "center",
          border: `1px solid ${open ? "var(--kk-theme-dark)" : "var(--kk-border)"}`,
          borderRadius: 8,
          background: "var(--kk-surface)",
          cursor: "text",
          padding: "0 8px 0 10px",
          height: 34,
          gap: 4,
        }}
      >
        <input
          ref={inputRef}
          value={displayValue}
          placeholder="Select or type a field..."
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 13,
            color: value ? "var(--kk-ink)" : "var(--kk-ink-mute)",
            fontFamily: "inherit",
          }}
        />
        <ChevronDown
          size={14}
          color="var(--kk-ink-mute)"
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }}
        />
      </div>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          background: "var(--kk-surface)",
          border: "1px solid var(--kk-border)",
          borderRadius: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.14)",
          zIndex: 100,
          maxHeight: 224,
          overflowY: "auto",
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--kk-ink-mute)" }}>
              No match
            </div>
          ) : (
            filtered.map((option, i) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(option.value);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 12px",
                  border: "none",
                  borderTop: option.value === "skip" && i > 0 ? "1px solid var(--kk-border)" : "none",
                  background: value === option.value ? "rgba(0,0,0,0.05)" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 13,
                  color: option.value === "skip" ? "var(--kk-ink-mute)" : "var(--kk-ink)",
                  fontFamily: "inherit",
                }}
              >
                <span style={{ flex: 1 }}>{option.label}</span>
                {value === option.value && <Check size={13} color="var(--kk-theme-dark)" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
