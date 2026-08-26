"use client";

import { useState } from "react";
import { Clock, ChevronDown, ChevronUp, Loader2, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { saveWaBlastConfig } from "@/lib/actions";
import type { WaBlastConfig } from "@/lib/db";

interface Props {
  initialConfig: WaBlastConfig;
  queueSize: number;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function maxPerDay(config: WaBlastConfig): number {
  const w = config.windows[0];
  if (!w) return 0;
  const [sh, sm] = w.start.split(":").map(Number);
  const [eh, em] = w.end.split(":").map(Number);
  const windowMin = (eh * 60 + em) - (sh * 60 + sm);
  if (windowMin <= 0) return 0;
  return Math.floor(windowMin / config.interval_minutes) * config.daily_cap;
}

export function WaBlastPanel({ initialConfig, queueSize }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<WaBlastConfig>(initialConfig);
  const [liveQueue, setLiveQueue] = useState(queueSize);

  // Use liveQueue when a bulk add comes in from the parent table
  // The panel re-renders when the page re-fetches (router.refresh)
  // so liveQueue stays in sync automatically.

  const max = maxPerDay(cfg);
  const isActive = cfg.is_active;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await saveWaBlastConfig(cfg);
      if (res.ok) toast.success("Blast schedule saved.");
      else toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    const next = { ...cfg, is_active: !cfg.is_active };
    setCfg(next);
    await saveWaBlastConfig(next);
    toast.success(next.is_active ? "Blaster activated." : "Blaster paused.");
  }

  function setWindow(field: "start" | "end", val: string) {
    setCfg((c) => ({ ...c, windows: [{ ...c.windows[0], [field]: val }] }));
  }

  const borderColor = isActive ? "rgba(52,199,89,0.35)" : "rgba(0,113,227,0.22)";
  const bgColor = isActive ? "rgba(52,199,89,0.06)" : "rgba(0,113,227,0.05)";
  const dotColor = isActive ? "var(--kk-green)" : "var(--kk-blue)";

  return (
    <div
      className="rounded-xl mb-4"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
    >
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <Clock className="w-4 h-4 shrink-0" style={{ color: dotColor }} />

        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-semibold" style={{ color: "var(--kk-ink)" }}>
            WA Auto-Blast
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{
              background: isActive ? "rgba(52,199,89,0.15)" : "rgba(0,0,0,0.06)",
              color: isActive ? "var(--kk-green-ink)" : "var(--kk-ink-mute)",
            }}
          >
            {isActive ? "Active" : "Paused"}
          </span>

          <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>
            {liveQueue > 0
              ? `${liveQueue} lead${liveQueue !== 1 ? "s" : ""} in queue`
              : "Queue empty"}
          </span>

          {max > 0 && (
            <span className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>
              · up to <span style={{ color: "var(--kk-ink)", fontWeight: 600 }}>{max}</span>/day
            </span>
          )}
        </div>

        <div className="shrink-0 ml-auto" style={{ color: "var(--kk-ink-faint)" }}>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded config */}
      {expanded && (
        <div
          className="px-4 pb-4"
          style={{ borderTop: `1px solid ${borderColor}` }}
        >
          <div className="pt-3 flex flex-wrap gap-4 items-end">

            {/* Time window */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--kk-ink-faint)" }}>
                Send window (MYT)
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={cfg.windows[0]?.start ?? "08:00"}
                  onChange={(e) => setWindow("start", e.target.value)}
                  className="text-[13px] font-medium rounded-lg px-2.5 py-1.5 outline-none"
                  style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                />
                <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>to</span>
                <input
                  type="time"
                  value={cfg.windows[0]?.end ?? "22:00"}
                  onChange={(e) => setWindow("end", e.target.value)}
                  className="text-[13px] font-medium rounded-lg px-2.5 py-1.5 outline-none"
                  style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                />
              </div>
            </div>

            {/* Interval */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--kk-ink-faint)" }}>
                Interval
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>every</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={cfg.interval_minutes}
                  onChange={(e) => setCfg((c) => ({ ...c, interval_minutes: Math.max(1, parseInt(e.target.value) || 1) }))}
                  className="text-[13px] font-medium text-center rounded-lg px-2 py-1.5 outline-none"
                  style={{ width: 54, background: "var(--kk-surface)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                />
                <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>min</span>
              </div>
            </div>

            {/* Per send */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--kk-ink-faint)" }}>
                Per send
              </p>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={cfg.daily_cap}
                  onChange={(e) => setCfg((c) => ({ ...c, daily_cap: Math.max(1, parseInt(e.target.value) || 1) }))}
                  className="text-[13px] font-medium text-center rounded-lg px-2 py-1.5 outline-none"
                  style={{ width: 54, background: "var(--kk-surface)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                />
                <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>msg</span>
              </div>
            </div>

            {/* Calculation */}
            <div
              className="flex-1 min-w-[160px] rounded-lg px-3 py-2"
              style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}
            >
              <p className="text-[11px]" style={{ color: "var(--kk-ink-mute)" }}>Based on this setup</p>
              <p className="text-[15px] font-bold mt-0.5" style={{ color: "var(--kk-ink)" }}>
                Up to <span style={{ color: "var(--kk-blue)" }}>{max}</span> messages/day
              </p>
            </div>
          </div>

          {/* Action row */}
          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={handleToggleActive}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-80"
              style={isActive
                ? { background: "rgba(255,59,48,0.10)", border: "1px solid rgba(255,59,48,0.25)", color: "#DC2626" }
                : { background: "rgba(52,199,89,0.10)", border: "1px solid rgba(52,199,89,0.30)", color: "var(--kk-green-ink)" }
              }
            >
              {isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isActive ? "Pause blaster" : "Activate blaster"}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: "var(--kk-blue)", color: "#fff" }}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Save schedule
            </button>

            <span className="text-[11px] ml-auto" style={{ color: "var(--kk-ink-faint)" }}>
              Run: <code className="font-mono" style={{ fontSize: 10 }}>node scripts/blaster.mjs</code>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
