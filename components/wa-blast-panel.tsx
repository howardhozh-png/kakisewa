"use client";

import { useState } from "react";
import {
  Clock, ChevronDown, ChevronUp, Loader2, Play, Pause, X, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { saveWaBlastConfig, removeOwnerWaBlast } from "@/lib/actions";
import type { WaBlastConfig, WaBlastQueueItem } from "@/lib/db";
import type { OwnerLead } from "@/lib/types";

interface Props {
  initialConfig: WaBlastConfig;
  queue: WaBlastQueueItem[];
  leads: OwnerLead[];
  onRemove: (ownerId: string) => void;
}

type Tab = "queue" | "schedule";

function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function maxPerDay(cfg: WaBlastConfig): number {
  const totalMin = cfg.windows.reduce((sum, w) => {
    const diff = timeToMin(w.end) - timeToMin(w.start);
    return sum + Math.max(diff, 0);
  }, 0);
  if (totalMin <= 0 || cfg.interval_minutes <= 0) return 0;
  return Math.floor(totalMin / cfg.interval_minutes) * cfg.daily_cap;
}

// ─── Queue tab ────────────────────────────────────────────────────────────────

function QueueTab({
  queue,
  leads,
  onRemove,
}: {
  queue: WaBlastQueueItem[];
  leads: OwnerLead[];
  onRemove: (ownerId: string) => void;
}) {
  const [removing, setRemoving] = useState<string | null>(null);
  const leadMap = new Map(leads.map((l) => [l.id, l]));

  async function handleRemove(item: WaBlastQueueItem) {
    setRemoving(item.owner_lead_id);
    try {
      await removeOwnerWaBlast(item.owner_lead_id);
      onRemove(item.owner_lead_id);
    } finally {
      setRemoving(null);
    }
  }

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <Clock className="w-8 h-8 opacity-20" style={{ color: "var(--kk-ink)" }} />
        <p className="text-[13px] font-medium" style={{ color: "var(--kk-ink-mute)" }}>Queue is empty</p>
        <p className="text-[12px] text-center max-w-xs" style={{ color: "var(--kk-ink-faint)" }}>
          Filter the table, select leads, then tap "Add to WA Blast" in the action bar below.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>
          {queue.length} lead{queue.length !== 1 ? "s" : ""} will be sent in order
        </span>
      </div>
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--kk-line)", maxHeight: 300, overflowY: "auto" }}
      >
        {queue.map((item, i) => {
          const lead = leadMap.get(item.owner_lead_id);
          const name = lead?.owner_name ?? "Unknown lead";
          const prop = lead?.property_name
            ? lead.unit ? `${lead.property_name}, ${lead.unit}` : lead.property_name
            : null;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 px-3 py-2.5"
              style={{
                borderBottom: i < queue.length - 1 ? "1px solid var(--kk-line)" : "none",
                background: "var(--kk-surface)",
              }}
            >
              <span
                className="text-[10px] font-semibold tabular-nums w-5 text-center shrink-0"
                style={{ color: "var(--kk-ink-faint)" }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: "var(--kk-ink)" }}>{name}</p>
                {prop && (
                  <p className="text-[11px] truncate" style={{ color: "var(--kk-ink-mute)" }}>{prop}</p>
                )}
              </div>
              <span className="text-[11px] tabular-nums shrink-0" style={{ color: "var(--kk-ink-faint)" }}>
                {item.phone}
              </span>
              <button
                type="button"
                disabled={removing === item.owner_lead_id}
                onClick={() => handleRemove(item)}
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ background: "rgba(255,59,48,0.10)", color: "#FF3B30" }}
                title="Remove from queue"
              >
                {removing === item.owner_lead_id
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <X className="w-3 h-3" />
                }
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Schedule tab ─────────────────────────────────────────────────────────────

function ScheduleTab({
  cfg,
  saving,
  onChange,
  onToggleActive,
  onSave,
}: {
  cfg: WaBlastConfig;
  saving: boolean;
  onChange: (next: WaBlastConfig) => void;
  onToggleActive: () => void;
  onSave: () => void;
}) {
  const max = maxPerDay(cfg);

  function setWindow(i: number, field: "start" | "end", val: string) {
    const windows = cfg.windows.map((w, idx) => idx === i ? { ...w, [field]: val } : w);
    onChange({ ...cfg, windows });
  }

  function addWindow() {
    onChange({ ...cfg, windows: [...cfg.windows, { start: "09:00", end: "12:00" }] });
  }

  function removeWindow(i: number) {
    if (cfg.windows.length <= 1) return;
    onChange({ ...cfg, windows: cfg.windows.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-4">

      {/* Time windows */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--kk-ink-faint)" }}>
          Send windows (MYT)
        </p>
        <div className="space-y-2">
          {cfg.windows.map((w, i) => (
            <div key={i} className="flex items-center gap-2 flex-wrap">
              <input
                type="time"
                value={w.start}
                onChange={(e) => setWindow(i, "start", e.target.value)}
                className="text-[13px] font-medium rounded-lg px-2.5 py-1.5 outline-none"
                style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
              />
              <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>to</span>
              <input
                type="time"
                value={w.end}
                onChange={(e) => setWindow(i, "end", e.target.value)}
                className="text-[13px] font-medium rounded-lg px-2.5 py-1.5 outline-none"
                style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
              />
              {cfg.windows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeWindow(i)}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
                  style={{ background: "rgba(255,59,48,0.10)", color: "#FF3B30" }}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addWindow}
            className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", color: "var(--kk-blue)" }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add window
          </button>
        </div>
      </div>

      {/* Interval + per send */}
      <div className="flex items-end gap-6 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--kk-ink-faint)" }}>Interval</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>every</span>
            <input
              type="number"
              min={1}
              max={120}
              value={cfg.interval_minutes}
              onChange={(e) => onChange({ ...cfg, interval_minutes: Math.max(1, parseInt(e.target.value) || 1) })}
              className="text-[13px] font-medium text-center rounded-lg px-2 py-1.5 outline-none"
              style={{ width: 54, background: "var(--kk-surface)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
            />
            <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>min</span>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--kk-ink-faint)" }}>Per send</p>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={20}
              value={cfg.daily_cap}
              onChange={(e) => onChange({ ...cfg, daily_cap: Math.max(1, parseInt(e.target.value) || 1) })}
              className="text-[13px] font-medium text-center rounded-lg px-2 py-1.5 outline-none"
              style={{ width: 54, background: "var(--kk-surface)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
            />
            <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>msg</span>
          </div>
        </div>

        {/* Max/day calc */}
        <div
          className="rounded-lg px-3 py-2"
          style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}
        >
          <p className="text-[11px]" style={{ color: "var(--kk-ink-mute)" }}>Max per day</p>
          <p className="text-[18px] font-bold" style={{ color: "var(--kk-blue)", lineHeight: 1.2 }}>{max}</p>
          <p className="text-[10px]" style={{ color: "var(--kk-ink-faint)" }}>messages</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <button
          type="button"
          onClick={onToggleActive}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-80"
          style={cfg.is_active
            ? { background: "rgba(255,59,48,0.10)", border: "1px solid rgba(255,59,48,0.25)", color: "#DC2626" }
            : { background: "rgba(52,199,89,0.10)", border: "1px solid rgba(52,199,89,0.30)", color: "var(--kk-green-ink)" }
          }
        >
          {cfg.is_active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {cfg.is_active ? "Pause blaster" : "Activate blaster"}
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: "var(--kk-blue)", color: "#fff" }}
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          Save schedule
        </button>

        <span className="text-[11px] ml-auto" style={{ color: "var(--kk-ink-faint)" }}>
          Run: <code style={{ fontFamily: "monospace", fontSize: 10 }}>node scripts/blaster.mjs</code>
        </span>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function WaBlastPanel({ initialConfig, queue, leads, onRemove }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("queue");
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<WaBlastConfig>(initialConfig);

  const isActive = cfg.is_active;
  const queueSize = queue.length;
  const max = maxPerDay(cfg);
  const dotColor = isActive ? "var(--kk-green)" : "var(--kk-blue)";
  const borderColor = isActive ? "rgba(52,199,89,0.30)" : "rgba(0,113,227,0.22)";
  const bgColor = isActive ? "rgba(52,199,89,0.05)" : "rgba(0,113,227,0.05)";

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

  return (
    <div className="rounded-xl mb-4" style={{ background: bgColor, border: `1px solid ${borderColor}` }}>

      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <Clock className="w-4 h-4 shrink-0" style={{ color: dotColor }} />
        <span className="text-[12px] font-semibold" style={{ color: "var(--kk-ink)" }}>WA Auto-Blast</span>
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
          {queueSize > 0 ? `${queueSize} in queue` : "Queue empty"}
        </span>
        {max > 0 && (
          <span className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>
            · up to <strong style={{ color: "var(--kk-ink)" }}>{max}</strong>/day
          </span>
        )}
        <span className="ml-auto shrink-0" style={{ color: "var(--kk-ink-faint)" }}>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${borderColor}` }}>

          {/* Tabs */}
          <div className="flex" style={{ borderBottom: `1px solid ${borderColor}` }}>
            {(["queue", "schedule"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="px-4 py-2.5 text-[12px] font-semibold capitalize transition-colors"
                style={{
                  color: tab === t ? "var(--kk-blue)" : "var(--kk-ink-mute)",
                  borderBottom: tab === t ? "2px solid var(--kk-blue)" : "2px solid transparent",
                  background: "none",
                  marginBottom: -1,
                }}
              >
                {t === "queue" ? `Queue (${queueSize})` : "Schedule"}
              </button>
            ))}
          </div>

          <div className="p-4">
            {tab === "queue" ? (
              <QueueTab queue={queue} leads={leads} onRemove={onRemove} />
            ) : (
              <ScheduleTab
                cfg={cfg}
                saving={saving}
                onChange={setCfg}
                onToggleActive={handleToggleActive}
                onSave={handleSave}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
