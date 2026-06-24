"use client";

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

function parseTime(t: string): { h: string; m: string; p: string } | null {
  if (!t) return null;
  const parts = t.split(" ");
  if (parts.length !== 2) return null;
  const [h, m] = parts[0].split(":");
  return { h, m: (m ?? "00").padStart(2, "0"), p: parts[1] };
}

// Shared style for the three native <select> segments
const SEG: React.CSSProperties = {
  border: "none",
  background: "transparent",
  fontSize: 14,
  color: "var(--kk-ink)",
  cursor: "pointer",
  outline: "none",
  padding: "0 2px",
  fontFamily: "inherit",
  appearance: "none",
  WebkitAppearance: "none",
  minWidth: 0,
};

interface Props {
  value: string;           // "" means no time; otherwise "H:MM AM/PM"
  onChange: (v: string) => void;
  style?: React.CSSProperties;
}

export function TimeSegmentInput({ value, onChange, style }: Props) {
  const parsed = parseTime(value);

  const containerBase: React.CSSProperties = {
    border: "1.5px solid",
    borderRadius: 10,
    padding: "10px 13px",
    background: "var(--kk-surface)",
    display: "flex",
    alignItems: "center",
    gap: 0,
    cursor: "text",
    ...style,
  };

  function update(h: string, m: string, p: string) {
    onChange(`${h}:${m} ${p}`);
  }

  if (!parsed) {
    return (
      <div style={{ ...containerBase, borderColor: "var(--kk-line)" }}>
        <button
          type="button"
          onClick={() => onChange("9:00 AM")}
          style={{ fontSize: 14, color: "var(--kk-ink-faint)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
        >
          No time set
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...containerBase, borderColor: "var(--kk-blue)" }}>
      {/* Hour */}
      <select value={parsed.h} onChange={(e) => update(e.target.value, parsed.m, parsed.p)} style={SEG}>
        {HOURS.map((h) => <option key={h} value={String(h)}>{h}</option>)}
      </select>

      <span style={{ fontSize: 14, color: "var(--kk-ink-mute)", fontWeight: 700, margin: "0 1px", userSelect: "none" }}>:</span>

      {/* Minute */}
      <select value={parsed.m} onChange={(e) => update(parsed.h, e.target.value, parsed.p)} style={SEG}>
        {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>

      {/* AM/PM */}
      <select value={parsed.p} onChange={(e) => update(parsed.h, parsed.m, e.target.value)} style={{ ...SEG, marginLeft: 6 }}>
        <option>AM</option>
        <option>PM</option>
      </select>

      {/* Clear button */}
      <button
        type="button"
        onClick={() => onChange("")}
        style={{ marginLeft: "auto", color: "var(--kk-ink-faint)", background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1, paddingLeft: 10, paddingRight: 0 }}
        title="Clear time"
      >
        ×
      </button>
    </div>
  );
}
