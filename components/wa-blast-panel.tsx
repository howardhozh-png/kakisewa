"use client";

import { useState } from "react";
import { Clock, ChevronDown, ChevronUp, Loader2, Play, Pause, X, Plus } from "lucide-react";
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

// ─── time helpers ─────────────────────────────────────────────────────────────

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function calcMaxPerDay(cfg: WaBlastConfig): number {
  const totalMin = cfg.windows.reduce((sum, w) => sum + Math.max(toMin(w.end) - toMin(w.start), 0), 0);
  return totalMin > 0 && cfg.interval_minutes > 0
    ? Math.floor(totalMin / cfg.interval_minutes) * cfg.daily_cap
    : 0;
}

function fmt2(n: number) { return String(n).padStart(2, "0"); }

function parseT(t: string) {
  const [h, m] = t.split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}

// ─── compact select atoms ─────────────────────────────────────────────────────

const SEL_STYLE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--kk-ink)",
  background: "var(--kk-bg)",
  border: "none",
  borderRadius: 7,
  padding: "3px 6px",
  cursor: "pointer",
  outline: "none",
  appearance: "none",
  WebkitAppearance: "none",
  textAlign: "center",
};

function HourSel({ val, onChange }: { val: number; onChange: (n: number) => void }) {
  return (
    <select value={val} onChange={(e) => onChange(+e.target.value)} style={SEL_STYLE}>
      {Array.from({ length: 24 }, (_, i) => (
        <option key={i} value={i}>{fmt2(i)}</option>
      ))}
    </select>
  );
}

const MINS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function MinSel({ val, onChange }: { val: number; onChange: (n: number) => void }) {
  const snapped = MINS.reduce((a, b) => Math.abs(b - val) < Math.abs(a - val) ? b : a);
  return (
    <select value={snapped} onChange={(e) => onChange(+e.target.value)} style={SEL_STYLE}>
      {MINS.map((m) => (
        <option key={m} value={m}>{fmt2(m)}</option>
      ))}
    </select>
  );
}

// ─── queue tab ────────────────────────────────────────────────────────────────

function QueueTab({ queue, leads, onRemove }: {
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
      <div className="flex flex-col items-center justify-center gap-1" style={{ padding: "24px 16px" }}>
        <Clock style={{ width: 28, height: 28, color: "var(--kk-ink-faint)", opacity: 0.4 }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink-mute)", marginTop: 6 }}>Queue is empty</p>
        <p style={{ fontSize: 12, color: "var(--kk-ink-faint)", textAlign: "center", maxWidth: 240 }}>
          Filter the table below, select leads, then tap "Add to WA Blast".
        </p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", padding: "8px 14px 4px", fontWeight: 500 }}>
        {queue.length} lead{queue.length !== 1 ? "s" : ""} — sent in order
      </p>
      <div style={{ maxHeight: 220, overflowY: "auto" }}>
        {queue.map((item, i) => {
          const lead = leadMap.get(item.owner_lead_id);
          const name = lead?.owner_name ?? "Unknown";
          const sub = lead?.property_name
            ? (lead.unit ? `${lead.unit} · ${lead.property_name}` : lead.property_name)
            : item.phone;
          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 14px",
                borderTop: "0.5px solid rgba(0,0,0,0.07)",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--kk-ink-faint)", minWidth: 16, textAlign: "right" }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                <p style={{ fontSize: 11, color: "var(--kk-ink-mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</p>
              </div>
              <span style={{ fontSize: 11, color: "var(--kk-ink-faint)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{item.phone}</span>
              <button
                type="button"
                disabled={removing === item.owner_lead_id}
                onClick={() => handleRemove(item)}
                style={{
                  width: 22, height: 22, borderRadius: "50%", border: "none", cursor: "pointer",
                  background: "rgba(255,59,48,0.10)", color: "#FF3B30",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  opacity: removing === item.owner_lead_id ? 0.4 : 1,
                }}
              >
                {removing === item.owner_lead_id
                  ? <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} />
                  : <X style={{ width: 11, height: 11 }} />
                }
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── schedule tab ─────────────────────────────────────────────────────────────

function ScheduleTab({ cfg, saving, onChange, onToggleActive, onSave }: {
  cfg: WaBlastConfig;
  saving: boolean;
  onChange: (next: WaBlastConfig) => void;
  onToggleActive: () => void;
  onSave: () => void;
}) {
  const max = calcMaxPerDay(cfg);

  function setWindow(i: number, field: "start" | "end", h: number, m: number) {
    const val = `${fmt2(h)}:${fmt2(m)}`;
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

  const INTERVAL_OPTS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
  const CAP_OPTS = [1, 2, 3, 5, 10];

  return (
    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Send windows */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--kk-ink-faint)", marginBottom: 8 }}>
          Send windows (MYT)
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {cfg.windows.map((w, i) => {
            const s = parseT(w.start), e = parseT(w.end);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 2, background: "var(--kk-bg)", borderRadius: 9, padding: "4px 8px", border: "1px solid var(--kk-line)" }}>
                  <HourSel val={s.h} onChange={(h) => setWindow(i, "start", h, s.m)} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink-mute)" }}>:</span>
                  <MinSel val={s.m} onChange={(m) => setWindow(i, "start", s.h, m)} />
                </div>
                <span style={{ fontSize: 12, color: "var(--kk-ink-faint)" }}>–</span>
                <div style={{ display: "flex", alignItems: "center", gap: 2, background: "var(--kk-bg)", borderRadius: 9, padding: "4px 8px", border: "1px solid var(--kk-line)" }}>
                  <HourSel val={e.h} onChange={(h) => setWindow(i, "end", h, e.m)} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink-mute)" }}>:</span>
                  <MinSel val={e.m} onChange={(m) => setWindow(i, "end", e.h, m)} />
                </div>
                {cfg.windows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWindow(i)}
                    style={{ width: 20, height: 20, borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(255,59,48,0.12)", color: "#FF3B30", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <X style={{ width: 10, height: 10 }} />
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={addWindow}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--kk-blue)", background: "none", border: "none", cursor: "pointer", padding: 0, width: "fit-content" }}
          >
            <Plus style={{ width: 13, height: 13 }} />
            Add window
          </button>
        </div>
      </div>

      {/* Interval row */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--kk-ink-faint)", marginBottom: 8 }}>
          Interval
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 12, color: "var(--kk-ink-mute)" }}>every</span>
            <select
              value={cfg.interval_minutes}
              onChange={(e) => onChange({ ...cfg, interval_minutes: +e.target.value })}
              style={{ ...SEL_STYLE, background: "var(--kk-bg)", border: "1px solid var(--kk-line)", borderRadius: 9, padding: "4px 8px" }}
            >
              {INTERVAL_OPTS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <span style={{ fontSize: 12, color: "var(--kk-ink-mute)" }}>min</span>
          </div>

          <span style={{ fontSize: 12, color: "var(--kk-line)" }}>·</span>

          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <select
              value={cfg.daily_cap}
              onChange={(e) => onChange({ ...cfg, daily_cap: +e.target.value })}
              style={{ ...SEL_STYLE, background: "var(--kk-bg)", border: "1px solid var(--kk-line)", borderRadius: 9, padding: "4px 8px" }}
            >
              {CAP_OPTS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <span style={{ fontSize: 12, color: "var(--kk-ink-mute)" }}>per send</span>
          </div>

          <div
            style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(0,113,227,0.07)", borderRadius: 8, padding: "3px 10px", marginLeft: "auto" }}
          >
            <span style={{ fontSize: 11, color: "var(--kk-ink-mute)" }}>Max</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--kk-blue)", fontVariantNumeric: "tabular-nums" }}>{max}</span>
            <span style={{ fontSize: 11, color: "var(--kk-ink-mute)" }}>/day</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onToggleActive}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 20, cursor: "pointer",
            ...(cfg.is_active
              ? { background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.20)", color: "#DC2626" }
              : { background: "rgba(52,199,89,0.09)", border: "1px solid rgba(52,199,89,0.25)", color: "var(--kk-green-ink)" }
            ),
          }}
        >
          {cfg.is_active ? <Pause style={{ width: 11, height: 11 }} /> : <Play style={{ width: 11, height: 11 }} />}
          {cfg.is_active ? "Pause" : "Activate"}
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 12, fontWeight: 600, padding: "6px 16px", borderRadius: 20, border: "none", cursor: "pointer",
            background: "var(--kk-blue)", color: "#fff", opacity: saving ? 0.6 : 1,
          }}
        >
          {saving && <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} />}
          Save
        </button>

        <span style={{ fontSize: 10, color: "var(--kk-ink-faint)", marginLeft: "auto" }}>
          <code style={{ fontFamily: "monospace" }}>node scripts/blaster.mjs</code>
        </span>
      </div>
    </div>
  );
}

// ─── main panel ───────────────────────────────────────────────────────────────

export function WaBlastPanel({ initialConfig, queue, leads, onRemove }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("queue");
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<WaBlastConfig>(initialConfig);

  const isActive = cfg.is_active;
  const queueSize = queue.length;
  const max = calcMaxPerDay(cfg);

  const accentBorder = isActive ? "rgba(52,199,89,0.25)" : "rgba(0,113,227,0.15)";
  const accentBg     = isActive ? "rgba(52,199,89,0.04)" : "rgba(0,113,227,0.04)";

  async function handleSave() {
    setSaving(true);
    try {
      const res = await saveWaBlastConfig(cfg);
      if (res.ok) toast.success("Schedule saved.");
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
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${accentBorder}`,
        background: isActive ? "rgba(52,199,89,0.03)" : "var(--kk-surface)",
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      {/* ── collapsed header ── */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <Clock style={{ width: 14, height: 14, color: isActive ? "var(--kk-green)" : "var(--kk-blue)", flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink)" }}>WA Auto-Blast</span>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
          padding: "2px 7px", borderRadius: 99,
          background: isActive ? "rgba(52,199,89,0.13)" : "rgba(0,0,0,0.06)",
          color: isActive ? "var(--kk-green-ink)" : "var(--kk-ink-mute)",
        }}>
          {isActive ? "Active" : "Paused"}
        </span>
        <span style={{ fontSize: 12, color: "var(--kk-ink-mute)" }}>
          {queueSize > 0 ? `${queueSize} queued` : "Empty"}
        </span>
        {max > 0 && (
          <span style={{ fontSize: 12, color: "var(--kk-ink-faint)" }}>
            · <strong style={{ color: "var(--kk-ink)", fontVariantNumeric: "tabular-nums" }}>{max}</strong>/day
          </span>
        )}
        <span style={{ marginLeft: "auto", color: "var(--kk-ink-faint)", display: "flex", alignItems: "center" }}>
          {expanded
            ? <ChevronUp style={{ width: 14, height: 14 }} />
            : <ChevronDown style={{ width: 14, height: 14 }} />
          }
        </span>
      </button>

      {/* ── expanded body ── */}
      {expanded && (
        <div style={{ borderTop: `0.5px solid ${accentBorder}` }}>

          {/* tab bar */}
          <div style={{ display: "flex", borderBottom: `0.5px solid ${accentBorder}` }}>
            {(["queue", "schedule"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  padding: "8px 14px", fontSize: 12, fontWeight: tab === t ? 700 : 500, background: "none", border: "none", cursor: "pointer",
                  color: tab === t ? "var(--kk-blue)" : "var(--kk-ink-mute)",
                  borderBottom: tab === t ? "2px solid var(--kk-blue)" : "2px solid transparent",
                  marginBottom: -1,
                  textTransform: "capitalize",
                }}
              >
                {t === "queue" ? `Queue (${queueSize})` : "Schedule"}
              </button>
            ))}
          </div>

          {tab === "queue"
            ? <QueueTab queue={queue} leads={leads} onRemove={onRemove} />
            : <ScheduleTab cfg={cfg} saving={saving} onChange={setCfg} onToggleActive={handleToggleActive} onSave={handleSave} />
          }
        </div>
      )}
    </div>
  );
}
