"use client";

import { useState, useRef, useEffect } from "react";
import {
  Clock, ChevronDown, ChevronUp, Loader2, Play, Pause, X, Plus, Info,
  Laptop, QrCode, Wifi, Timer,
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
  waCount: number;
  waCap: number;
  onCapChange: (n: number) => void;
}

type Tab = "schedule" | "queue";

// ─── helpers ──────────────────────────────────────────────────────────────────

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function fmt2(n: number) { return String(Math.max(0, n)).padStart(2, "0"); }

export function calcMaxPerDay(cfg: WaBlastConfig): number {
  const windows = mergedWindows(cfg.windows);
  const totalMin = windows.reduce((s, w) => s + Math.max(toMin(w.end) - toMin(w.start), 0), 0);
  return totalMin > 0 && cfg.interval_minutes > 0
    ? Math.floor(totalMin / cfg.interval_minutes) * cfg.daily_cap
    : 0;
}

function mergedWindows(windows: { start: string; end: string }[]) {
  return windows.slice().sort((a, b) => toMin(a.start) - toMin(b.start));
}

function validateWindows(windows: { start: string; end: string }[]): string | null {
  for (let i = 0; i < windows.length; i++) {
    const s = toMin(windows[i].start);
    const e = toMin(windows[i].end);
    if (e <= s) return `Window ${i + 1}: end time must be after start time`;
  }
  const sorted = mergedWindows(windows);
  for (let i = 0; i < sorted.length - 1; i++) {
    const e = toMin(sorted[i].end);
    const s2 = toMin(sorted[i + 1].start);
    if (e > s2) {
      return `Windows overlap — adjust or remove a duplicate window`;
    }
  }
  return null;
}

// ─── time input (free H + M number fields) ────────────────────────────────────

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value.split(":").map(Number);

  function setH(raw: string) {
    const n = Math.max(0, Math.min(23, parseInt(raw) || 0));
    onChange(`${fmt2(n)}:${fmt2(m)}`);
  }
  function setM(raw: string) {
    const n = Math.max(0, Math.min(59, parseInt(raw) || 0));
    onChange(`${fmt2(h)}:${fmt2(n)}`);
  }

  const inputStyle: React.CSSProperties = {
    width: 28, fontSize: 13, fontWeight: 600, textAlign: "center",
    background: "transparent", border: "none", outline: "none",
    color: "var(--kk-ink)", padding: 0, MozAppearance: "textfield",
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 1,
      background: "var(--kk-bg)", borderRadius: 9,
      padding: "4px 8px", border: "1px solid var(--kk-line)",
    }}>
      <input type="number" min={0} max={23} value={h}
        onChange={(e) => setH(e.target.value)}
        style={inputStyle} />
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink-mute)" }}>:</span>
      <input type="number" min={0} max={59} value={m}
        onChange={(e) => setM(e.target.value)}
        style={inputStyle} />
    </div>
  );
}

// ─── setup info panel ─────────────────────────────────────────────────────────

function SetupInfo({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: <Laptop style={{ width: 15, height: 15 }} />,
      title: "Keep your laptop awake",
      body: "The blaster runs locally on your machine. Sleep mode stops it. Disable sleep or plug in while blasting.",
    },
    {
      icon: <QrCode style={{ width: 15, height: 15 }} />,
      title: "First-time WhatsApp setup",
      body: "Open Terminal and run: node scripts/blaster.mjs\nA QR code appears. Scan it in WhatsApp: Settings → Linked Devices → Link a device.",
    },
    {
      icon: <Wifi style={{ width: 15, height: 15 }} />,
      title: "Session is saved",
      body: "After first scan, auth is stored in scripts/blaster-auth/. No re-scan unless you log out of the linked device.",
    },
    {
      icon: <Timer style={{ width: 15, height: 15 }} />,
      title: "How it sends",
      body: "The blaster polls your queue every minute. It only fires during your configured time windows. Press Ctrl+C to stop; re-run the same command to resume.",
    },
  ];

  return (
    <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.08)", padding: "12px 14px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--kk-ink-faint)" }}>
          How to use WA Auto-Blast
        </span>
        <button type="button" onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--kk-ink-faint)", display: "flex", padding: 0 }}>
          <X style={{ width: 13, height: 13 }} />
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: "rgba(0,113,227,0.08)", color: "var(--kk-blue)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{s.icon}</div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--kk-ink)", marginBottom: 2 }}>{s.title}</p>
              <p style={{ fontSize: 11, color: "var(--kk-ink-mute)", lineHeight: 1.5, whiteSpace: "pre-line" }}>{s.body}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 12, padding: "8px 10px", borderRadius: 8,
        background: "rgba(0,113,227,0.05)", border: "1px solid rgba(0,113,227,0.12)",
      }}>
        <p style={{ fontSize: 11, fontFamily: "monospace", color: "var(--kk-blue)", margin: 0 }}>
          $ node scripts/blaster.mjs
        </p>
      </div>
    </div>
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
      <div style={{ padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <Clock style={{ width: 26, height: 26, color: "var(--kk-ink-faint)", opacity: 0.35 }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink-mute)", margin: 0 }}>Queue is empty</p>
        <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", textAlign: "center", maxWidth: 240, margin: 0 }}>
          Filter the table, select leads, then tap "Add to WA Blast" in the bar below.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", padding: "8px 14px 4px", fontWeight: 500, margin: 0 }}>
        {queue.length} lead{queue.length !== 1 ? "s" : ""} — sent in order
      </p>
      <div style={{ maxHeight: 224, overflowY: "auto" }}>
        {queue.map((item, i) => {
          const lead = leadMap.get(item.owner_lead_id);
          const name = lead?.owner_name ?? "Unknown";
          const sub = lead?.property_name
            ? (lead.unit ? `${lead.unit} · ${lead.property_name}` : lead.property_name)
            : item.phone;
          return (
            <div key={item.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "7px 14px", borderTop: "0.5px solid rgba(0,0,0,0.07)",
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--kk-ink-faint)", minWidth: 16, textAlign: "right" }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                <p style={{ fontSize: 11, color: "var(--kk-ink-mute)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</p>
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
  const winErr = validateWindows(cfg.windows);

  function setWindow(i: number, field: "start" | "end", val: string) {
    onChange({ ...cfg, windows: cfg.windows.map((w, idx) => idx === i ? { ...w, [field]: val } : w) });
  }

  function addWindow() {
    const last = cfg.windows[cfg.windows.length - 1];
    const lastEnd = last ? toMin(last.end) : 12 * 60;
    const newStart = fmt2(Math.floor(lastEnd / 60)) + ":" + fmt2(lastEnd % 60);
    const newEndMin = Math.min(lastEnd + 120, 23 * 60);
    const newEnd = fmt2(Math.floor(newEndMin / 60)) + ":" + fmt2(newEndMin % 60);
    onChange({ ...cfg, windows: [...cfg.windows, { start: newStart, end: newEnd }] });
  }

  function removeWindow(i: number) {
    if (cfg.windows.length <= 1) return;
    onChange({ ...cfg, windows: cfg.windows.filter((_, idx) => idx !== i) });
  }

  return (
    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Send windows */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--kk-ink-faint)", margin: "0 0 8px" }}>
          Send windows (MYT)
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {cfg.windows.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <TimeInput value={w.start} onChange={(v) => setWindow(i, "start", v)} />
              <span style={{ fontSize: 12, color: "var(--kk-ink-faint)" }}>–</span>
              <TimeInput value={w.end} onChange={(v) => setWindow(i, "end", v)} />
              {cfg.windows.length > 1 && (
                <button type="button" onClick={() => removeWindow(i)}
                  style={{ width: 20, height: 20, borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(255,59,48,0.12)", color: "#FF3B30", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X style={{ width: 10, height: 10 }} />
                </button>
              )}
            </div>
          ))}

          {/* Validation error */}
          {winErr && (
            <p style={{ fontSize: 11, color: "#DC2626", margin: "2px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
              <X style={{ width: 11, height: 11, flexShrink: 0 }} /> {winErr}
            </p>
          )}

          <button type="button" onClick={addWindow}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--kk-blue)", background: "none", border: "none", cursor: "pointer", padding: 0, width: "fit-content", marginTop: 2 }}>
            <Plus style={{ width: 13, height: 13 }} />
            Add window
          </button>
        </div>
      </div>

      {/* Interval */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--kk-ink-faint)", margin: "0 0 8px" }}>
          Interval
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 12, color: "var(--kk-ink-mute)" }}>every</span>
            <input
              type="number" min={1} max={120}
              value={cfg.interval_minutes}
              onChange={(e) => onChange({ ...cfg, interval_minutes: Math.max(1, Math.min(120, parseInt(e.target.value) || 1)) })}
              style={{
                width: 46, fontSize: 13, fontWeight: 600, textAlign: "center",
                background: "var(--kk-bg)", border: "1px solid var(--kk-line)", borderRadius: 9,
                padding: "4px 6px", outline: "none", color: "var(--kk-ink)",
              }}
            />
            <span style={{ fontSize: 12, color: "var(--kk-ink-mute)" }}>min</span>
          </div>

          <span style={{ color: "var(--kk-line)", fontSize: 14, lineHeight: 1 }}>·</span>

          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <input
              type="number" min={1} max={20}
              value={cfg.daily_cap}
              onChange={(e) => onChange({ ...cfg, daily_cap: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })}
              style={{
                width: 40, fontSize: 13, fontWeight: 600, textAlign: "center",
                background: "var(--kk-bg)", border: "1px solid var(--kk-line)", borderRadius: 9,
                padding: "4px 6px", outline: "none", color: "var(--kk-ink)",
              }}
            />
            <span style={{ fontSize: 12, color: "var(--kk-ink-mute)" }}>per send</span>
          </div>

          {!winErr && (
            <div style={{
              marginLeft: "auto", display: "flex", alignItems: "center", gap: 4,
              background: "rgba(0,113,227,0.07)", borderRadius: 8, padding: "3px 10px",
            }}>
              <span style={{ fontSize: 11, color: "var(--kk-ink-mute)" }}>Max</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--kk-blue)", fontVariantNumeric: "tabular-nums" }}>{max}</span>
              <span style={{ fontSize: 11, color: "var(--kk-ink-mute)" }}>/day</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={onToggleActive}
          style={{
            display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
            padding: "6px 14px", borderRadius: 20, cursor: "pointer",
            ...(cfg.is_active
              ? { background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.20)", color: "#DC2626" }
              : { background: "rgba(52,199,89,0.09)", border: "1px solid rgba(52,199,89,0.25)", color: "var(--kk-green-ink)" }
            ),
          }}>
          {cfg.is_active ? <Pause style={{ width: 11, height: 11 }} /> : <Play style={{ width: 11, height: 11 }} />}
          {cfg.is_active ? "Pause" : "Activate"}
        </button>

        <button type="button" onClick={onSave} disabled={saving || !!winErr}
          style={{
            display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
            padding: "6px 16px", borderRadius: 20, border: "none", cursor: winErr ? "not-allowed" : "pointer",
            background: winErr ? "rgba(0,0,0,0.12)" : "var(--kk-blue)",
            color: winErr ? "var(--kk-ink-mute)" : "#fff",
            opacity: saving ? 0.6 : 1,
          }}>
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

export function WaBlastPanel({ initialConfig, queue, leads, onRemove, waCount, waCap, onCapChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("schedule");
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<WaBlastConfig>(initialConfig);
  const [showInfo, setShowInfo] = useState(false);
  const [editingCap, setEditingCap] = useState(false);
  const [capDraft, setCapDraft] = useState(String(waCap));
  const capInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editingCap) capInputRef.current?.focus(); }, [editingCap]);

  const isActive = cfg.is_active;
  const queueSize = queue.length;
  const max = calcMaxPerDay(cfg);

  // Daily counter colours
  const pct = Math.min((waCount / waCap) * 100, 100);
  const warn = Math.round(waCap * 0.75);
  const ctrColor = waCount >= waCap ? "#DC2626" : waCount >= warn ? "#D97706" : "#1F8B4C";

  const accentBorder = isActive ? "rgba(52,199,89,0.22)" : "rgba(0,0,0,0.10)";

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

  function commitCap() {
    const n = parseInt(capDraft, 10);
    if (n > 0) onCapChange(n);
    setEditingCap(false);
  }

  return (
    <div style={{ borderRadius: 14, border: `1px solid ${accentBorder}`, background: "var(--kk-surface)", overflow: "hidden", marginBottom: 12 }}>

      {/* ── header (always visible) ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>

        {/* left: blast info — clickable to expand */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{ flex: 1, display: "flex", alignItems: "center", gap: 7, padding: "9px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", minWidth: 0 }}
        >
          <Clock style={{ width: 13, height: 13, color: isActive ? "var(--kk-green)" : "var(--kk-blue)", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--kk-ink)", whiteSpace: "nowrap" }}>WA Auto-Blast</span>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
            padding: "2px 6px", borderRadius: 99, flexShrink: 0,
            background: isActive ? "rgba(52,199,89,0.13)" : "rgba(0,0,0,0.06)",
            color: isActive ? "var(--kk-green-ink)" : "var(--kk-ink-mute)",
          }}>
            {isActive ? "Active" : "Paused"}
          </span>
          <span style={{ fontSize: 11, color: "var(--kk-ink-mute)", whiteSpace: "nowrap" }}>
            {queueSize > 0 ? `${queueSize} queued` : "Empty"}
          </span>
          {max > 0 && (
            <span style={{ fontSize: 11, color: "var(--kk-ink-faint)", whiteSpace: "nowrap" }}>
              · <strong style={{ color: "var(--kk-ink)" }}>{max}</strong>/day
            </span>
          )}
          <span style={{ color: "var(--kk-ink-faint)", display: "flex", alignItems: "center", flexShrink: 0 }}>
            {expanded ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
          </span>
        </button>

        {/* right: daily counter + info */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderLeft: "0.5px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
          {/* compact progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 44, height: 3, borderRadius: 99, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: ctrColor, borderRadius: 99, transition: "width 0.4s" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: ctrColor, fontVariantNumeric: "tabular-nums" }}>{waCount}</span>
              <span style={{ fontSize: 11, color: "var(--kk-ink-faint)" }}>/</span>
              {editingCap ? (
                <input
                  ref={capInputRef}
                  type="text"
                  inputMode="numeric"
                  value={capDraft}
                  onChange={(e) => setCapDraft(e.target.value.replace(/\D/g, ""))}
                  onBlur={commitCap}
                  onKeyDown={(e) => { if (e.key === "Enter") commitCap(); if (e.key === "Escape") setEditingCap(false); }}
                  style={{ width: 30, fontSize: 11, fontWeight: 700, textAlign: "center", background: "#fff", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 5, color: "var(--kk-ink)", outline: "none", padding: "0 2px" }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => { setCapDraft(String(waCap)); setEditingCap(true); }}
                  style={{ fontSize: 11, fontWeight: 700, color: "var(--kk-ink-mute)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >{waCap}</button>
              )}
              <span style={{ fontSize: 10, color: "var(--kk-ink-faint)" }}>sent</span>
            </div>
          </div>

          {/* info button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowInfo((v) => !v); if (!expanded) setExpanded(true); }}
            style={{
              width: 22, height: 22, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              background: showInfo ? "rgba(0,113,227,0.12)" : "rgba(0,0,0,0.05)",
              color: showInfo ? "var(--kk-blue)" : "var(--kk-ink-faint)",
            }}
            title="Setup guide"
          >
            <Info style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>

      {/* ── expanded body ── */}
      {expanded && (
        <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.07)" }}>

          {/* setup info (if open) */}
          {showInfo && <SetupInfo onClose={() => setShowInfo(false)} />}

          {/* tab bar */}
          <div style={{ display: "flex", borderBottom: "0.5px solid rgba(0,0,0,0.07)" }}>
            {(["schedule", "queue"] as Tab[]).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                style={{
                  padding: "7px 14px", fontSize: 12, fontWeight: tab === t ? 700 : 500,
                  background: "none", border: "none", cursor: "pointer",
                  color: tab === t ? "var(--kk-blue)" : "var(--kk-ink-mute)",
                  borderBottom: tab === t ? "2px solid var(--kk-blue)" : "2px solid transparent",
                  marginBottom: -1, textTransform: "capitalize",
                }}>
                {t === "queue" ? `Queue (${queueSize})` : "Schedule"}
              </button>
            ))}
          </div>

          {tab === "schedule"
            ? <ScheduleTab cfg={cfg} saving={saving} onChange={setCfg} onToggleActive={handleToggleActive} onSave={handleSave} />
            : <QueueTab queue={queue} leads={leads} onRemove={onRemove} />
          }
        </div>
      )}
    </div>
  );
}
