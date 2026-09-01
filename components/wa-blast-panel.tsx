"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Clock, ChevronDown, ChevronUp, Loader2, Play, Pause, PauseCircle, X, Plus,
  Laptop, QrCode, Wifi, Timer, CheckCircle2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { toast } from "sonner";
import { saveWaBlastConfig, removeOwnerWaBlast, acknowledgeWaSent, clearWaBlastQueue, clearAllWaSent } from "@/lib/actions";
import type { WaBlastConfig, WaBlastQueueItem, WaBlastSentItem, WaSession } from "@/lib/db";
import type { OwnerLead } from "@/lib/types";

interface Props {
  initialConfig: WaBlastConfig;
  queue: WaBlastQueueItem[];
  sentQueue: WaBlastSentItem[];
  leads: OwnerLead[];
  onRemove: (ownerId: string) => void;
  onAcknowledge: (id: string) => void;
  onClearAll?: () => void;
  waCount: number;
  waCap: number;
  onCapChange: (n: number) => void;
  initialWaSession: WaSession | null;
  openQueueSignal?: number;
  onLeadClick?: (leadId: string) => boolean | void;
  onClearSent?: () => void;
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
      return `Windows overlap. Adjust or remove a duplicate window.`;
    }
  }
  return null;
}

// ─── number input with draft (allows clearing to retype) ─────────────────────

function NumberInput({ value, onChange, min, max, width }: {
  value: number; onChange: (v: number) => void; min: number; max: number; width: number;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);

  function commit(raw: string) {
    const n = parseInt(raw, 10);
    const clamped = isNaN(n) ? min : Math.max(min, Math.min(max, n));
    onChange(clamped);
    setDraft(String(clamped));
  }

  return (
    <input
      type="number" min={min} max={max}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      style={{
        width, fontSize: 13, fontWeight: 600, textAlign: "center",
        background: "#F5F5F7", border: "1px solid #D1D1D6", borderRadius: 9,
        padding: "4px 6px", outline: "none", color: "#1D1D1F",
      }}
    />
  );
}

// ─── time input — two bounded selects (HH + MM) ───────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINS  = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

// Custom scroll picker — shows 5 items at a time
function TimePart({ options, value, onChange }: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view when popover opens.
  // PopoverContent mounts in a portal after the open state change, so defer to next tick.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (!listRef.current) return;
      const idx = options.indexOf(value);
      const ITEM_H = 32;
      listRef.current.scrollTop = Math.max(0, idx * ITEM_H - ITEM_H * 2);
    }, 10);
    return () => clearTimeout(t);
  }, [open, value, options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" style={{
          fontSize: 13, fontWeight: 600, color: "var(--kk-ink)",
          background: "none", border: "none", outline: "none",
          cursor: "pointer", padding: "2px 4px", minWidth: 24, textAlign: "center",
        }}>
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" sideOffset={6} style={{
        width: 64, padding: 4, borderRadius: 10,
      }}>
        <div ref={listRef} style={{ maxHeight: 160, overflowY: "auto", overflowX: "hidden" }}>
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "center",
                fontSize: 13, fontWeight: opt === value ? 700 : 400,
                color: opt === value ? "var(--kk-blue)" : "var(--kk-ink)",
                background: opt === value ? "rgba(0,113,227,0.08)" : "none",
                border: "none", borderRadius: 6, padding: "6px 0",
                cursor: "pointer", height: 32, lineHeight: "20px",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hh, mm] = value.split(":") as [string, string];
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 1,
      background: "#F5F5F7", border: "1px solid #D1D1D6",
      borderRadius: 9, padding: "4px 6px",
    }}>
      <TimePart options={HOURS} value={hh} onChange={h => onChange(`${h}:${mm}`)} />
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)", userSelect: "none" }}>:</span>
      <TimePart options={MINS} value={mm} onChange={m => onChange(`${hh}:${m}`)} />
    </div>
  );
}

// ─── how to set up walkthrough dialog ────────────────────────────────────────

const STEP_DURATION = 5000;

const WT_STEPS = [
  {
    label: "Click 'Link WhatsApp'",
    desc: "In the Schedule tab, click 'Link WhatsApp'. A dialog opens with a command to run — copy it.",
    Visual: WtClickLink,
    duration: 3300,
  },
  {
    label: "Open Terminal (Mac) or PowerShell (Windows) and run the command",
    desc: "Paste the command from the Link WhatsApp dialog and press Enter. It sets everything up automatically — no downloads needed.",
    Visual: WtTerminal,
  },
  {
    label: "Scan the QR code with your phone",
    desc: "A QR code appears in the terminal. Open WhatsApp on your phone, go to Settings > Linked Devices > Link a device, and scan it.",
    Visual: WtLinkWa,
  },
  {
    label: "Set schedule and add leads",
    desc: "Set your send window (e.g. 10AM to 8PM), save it, then select leads from the table and click 'Add to WA Blast' in the action bar.",
    Visual: WtScheduleAndLeads,
  },
  {
    label: "Activate",
    desc: "Once WhatsApp shows 'Connected', hit Activate. Messages go out automatically within your schedule. Pause any time.",
    Visual: WtActivate,
  },
];

function WtClickLink() {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPulse(true), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.09)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: "0.5px solid rgba(0,0,0,0.07)" }}>
        <Clock style={{ width: 13, height: 13, color: "var(--kk-blue)" }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--kk-ink)" }}>WA Auto-Blast</span>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", padding: "2px 6px", borderRadius: 99, background: "rgba(0,0,0,0.06)", color: "var(--kk-ink-faint)" }}>Paused</span>
      </div>
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#F59E0B" }} />
          <span style={{ fontSize: 12, color: "var(--kk-ink-mute)" }}>WhatsApp: <strong>Not linked</strong></span>
        </div>
        <div style={{
          fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 20, cursor: "pointer",
          background: "rgba(0,113,227,0.09)", border: "1px solid rgba(0,113,227,0.22)", color: "var(--kk-blue)",
          display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
          boxShadow: pulse ? "0 0 0 4px rgba(0,113,227,0.18)" : "none",
          transition: "box-shadow 0.4s",
        }}>
          <QrCode style={{ width: 11, height: 11 }} /> Link WhatsApp
        </div>
      </div>
    </div>
  );
}

function WtSelectLeads() {
  const [ticked, setTicked] = useState(0);
  const [barUp, setBarUp] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setTicked(1), 400);
    const t2 = setTimeout(() => setTicked(2), 900);
    const t3 = setTimeout(() => setTicked(3), 1400);
    const t4 = setTimeout(() => setBarUp(true), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);
  const rows = [
    { name: "Ahmad Rashid", prop: "Kelana Jaya" },
    { name: "Siti Norziah", prop: "Mont Kiara" },
    { name: "David Lee", prop: "Damansara" },
  ];
  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ border: "1px solid rgba(0,0,0,0.09)", borderRadius: 10, overflow: "hidden" }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: i < 2 ? "0.5px solid rgba(0,0,0,0.06)" : "none" }}>
            <div style={{
              width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${ticked > i ? "var(--kk-blue)" : "rgba(0,0,0,0.2)"}`,
              background: ticked > i ? "var(--kk-blue)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
            }}>
              {ticked > i && <CheckCircle2 style={{ width: 10, height: 10, color: "#fff" }} />}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--kk-ink)", flex: 1 }}>{r.name}</span>
            <span style={{ fontSize: 11, color: "var(--kk-ink-faint)" }}>{r.prop}</span>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 8,
        transform: barUp ? "translateY(0)" : "translateY(48px)",
        transition: "transform 0.3s ease",
        background: "#1D1D1F", borderRadius: 12, padding: "8px 12px",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>3 selected</span>
        <div style={{ flex: 1 }} />
        <div style={{
          background: "var(--kk-blue)", borderRadius: 8, padding: "4px 10px",
          fontSize: 11, fontWeight: 700, color: "#fff",
          boxShadow: barUp ? "0 0 0 3px rgba(0,113,227,0.35)" : "none",
          transition: "box-shadow 0.5s 0.4s",
        }}>
          Add to WA Blast
        </div>
      </div>
    </div>
  );
}

function WtSchedule() {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSaved(true), 2200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ border: "1px solid rgba(0,0,0,0.09)", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--kk-ink-faint)" }}>Send windows (MYT)</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {["10 : 00", "20 : 00"].map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {i === 1 && <span style={{ fontSize: 12, color: "var(--kk-ink-faint)", marginRight: 4 }}>–</span>}
              <div style={{ background: "var(--kk-bg)", border: "1px solid var(--kk-line)", borderRadius: 8, padding: "5px 10px", fontSize: 14, fontWeight: 700, color: "var(--kk-ink)" }}>{t}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--kk-ink-mute)" }}>every</span>
          <div style={{ background: "var(--kk-bg)", border: "1px solid var(--kk-line)", borderRadius: 6, padding: "3px 8px", fontSize: 13, fontWeight: 700 }}>10</div>
          <span style={{ fontSize: 11, color: "var(--kk-ink-mute)" }}>min</span>
          <span style={{ fontSize: 11, color: "var(--kk-ink-faint)", marginLeft: 4 }}>Max 60/day</span>
        </div>
      </div>
      <button type="button" style={{
        alignSelf: "flex-start", background: saved ? "var(--kk-green)" : "var(--kk-blue)",
        color: "#fff", border: "none", borderRadius: 20, padding: "6px 18px",
        fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "background 0.4s",
        display: "flex", alignItems: "center", gap: 5,
      }}>
        {saved ? <><CheckCircle2 style={{ width: 11, height: 11 }} /> Saved</> : "Save"}
      </button>
    </div>
  );
}

function WtLinkWa() {
  const [done, setDone] = useState(false);
  // Fixed QR grid seeded deterministically so it doesn't re-randomize on re-render
  const qrCells = useRef(Array.from({ length: 64 }, (_, i) => [0,7,8,14,15,48,49,55,56,63,1,6,9,13,50,54,57,62].includes(i) || Math.sin(i * 7.3) > 0));
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 2500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ border: `1px solid ${done ? "rgba(52,199,89,0.3)" : "rgba(0,0,0,0.09)"}`, borderRadius: 10, overflow: "hidden", transition: "border-color 0.4s" }}>
      <div style={{ background: "linear-gradient(135deg,#25D366,#128C7E)", padding: "10px 14px" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>Link WhatsApp</p>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", margin: "2px 0 0" }}>
          {done ? "WhatsApp connected!" : "Scan the QR code with your phone"}
        </p>
      </div>
      {!done ? (
        <div style={{ padding: 12, display: "flex", justifyContent: "center" }}>
          <div style={{ width: 80, height: 80, background: "#1D1D1F", borderRadius: 6, display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 1, padding: 6 }}>
            {qrCells.current.map((on, i) => (
              <div key={i} style={{ background: on ? "#fff" : "transparent", borderRadius: 1 }} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: "14px 16px", background: "rgba(52,199,89,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 style={{ width: 18, height: 18, color: "var(--kk-green-ink)", flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-green-ink)", margin: 0 }}>WhatsApp connected!</p>
            <p style={{ fontSize: 11, color: "var(--kk-green-ink)", opacity: 0.8, margin: "1px 0 0" }}>All set. Auto-blast sends from your WhatsApp.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function WtTerminal() {
  const lines = [
    { t: 0, text: "$ cd ~/kakisewa && KAKI_TOKEN=\"eyJhb...\" node scripts/blaster.mjs", color: "#E8E8E8" },
    { t: 700, text: "Initializing WhatsApp session...", color: "#A0A0A0" },
    { t: 1600, text: "Session restored. No QR needed.", color: "#A0A0A0" },
    { t: 2400, text: "✓  Connected. Polling queue every 10 min.", color: "#34C759" },
  ];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timers = lines.map((l, i) => setTimeout(() => setShown(i + 1), l.t));
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div style={{ background: "#1D1D1F", borderRadius: 10, padding: "12px 14px", fontFamily: "monospace", display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
        {["#FF5F56","#FFBD2E","#27C93F"].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />)}
      </div>
      {lines.slice(0, shown).map((l, i) => (
        <p key={i} style={{ fontSize: 11, color: l.color, margin: 0, lineHeight: 1.6 }}>{l.text}</p>
      ))}
      {shown > 0 && shown < lines.length && (
        <span style={{ display: "inline-block", width: 7, height: 13, background: "#A0A0A0", animation: "kk-blink 1s step-end infinite" }} />
      )}
      <style>{`@keyframes kk-blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}

function WtScheduleAndLeads() {
  const [phase, setPhase] = useState<"schedule" | "leads">("schedule");
  useEffect(() => {
    const t = setTimeout(() => setPhase("leads"), 2400);
    return () => clearTimeout(t);
  }, []);
  return (
    <div>
      {phase === "schedule" && (
        <div style={{ border: "1px solid rgba(0,0,0,0.09)", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--kk-ink-faint)" }}>Send windows (MYT)</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {["10 : 00", "20 : 00"].map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {i === 1 && <span style={{ fontSize: 12, color: "var(--kk-ink-faint)", marginRight: 4 }}>–</span>}
                <div style={{ background: "var(--kk-bg)", border: "1px solid var(--kk-line)", borderRadius: 8, padding: "5px 10px", fontSize: 14, fontWeight: 700, color: "var(--kk-ink)" }}>{t}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--kk-ink-mute)" }}>every</span>
            <div style={{ background: "var(--kk-bg)", border: "1px solid var(--kk-line)", borderRadius: 6, padding: "3px 8px", fontSize: 13, fontWeight: 700 }}>10</div>
            <span style={{ fontSize: 11, color: "var(--kk-ink-mute)" }}>min per send</span>
            <div style={{ marginLeft: "auto", background: "var(--kk-blue)", color: "#fff", border: "none", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 700 }}>Save</div>
          </div>
        </div>
      )}
      {phase === "leads" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ border: "1px solid rgba(0,0,0,0.09)", borderRadius: 10, overflow: "hidden" }}>
            {[{ name: "Ahmad Rashid", prop: "Kelana Jaya" }, { name: "Siti Norziah", prop: "Mont Kiara" }].map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: i === 0 ? "0.5px solid rgba(0,0,0,0.06)" : "none" }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, border: "none", background: "var(--kk-blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircle2 style={{ width: 10, height: 10, color: "#fff" }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--kk-ink)", flex: 1 }}>{r.name}</span>
                <span style={{ fontSize: 11, color: "var(--kk-ink-faint)" }}>{r.prop}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "#1D1D1F", borderRadius: 12, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>2 selected</span>
            <div style={{ flex: 1 }} />
            <div style={{ background: "var(--kk-blue)", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#fff", boxShadow: "0 0 0 3px rgba(0,113,227,0.35)" }}>
              Add to WA Blast
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WtActivate() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setActive(true), 1400);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ border: `1px solid ${active ? "rgba(52,199,89,0.3)" : "rgba(0,0,0,0.1)"}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.5s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: active ? "rgba(52,199,89,0.04)" : "transparent", transition: "background 0.5s" }}>
        <Clock style={{ width: 13, height: 13, color: active ? "var(--kk-green)" : "var(--kk-blue)" }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--kk-ink)", flex: 1 }}>WA Auto-Blast</span>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
          padding: "2px 8px", borderRadius: 99,
          background: active ? "rgba(52,199,89,0.15)" : "rgba(0,0,0,0.06)",
          color: active ? "var(--kk-green-ink)" : "var(--kk-ink-faint)",
          transition: "all 0.5s", boxShadow: active ? "0 0 0 3px rgba(52,199,89,0.15)" : "none",
        }}>
          {active ? "Active" : "Paused"}
        </span>
      </div>
      <div style={{ padding: "10px 14px", borderTop: "0.5px solid rgba(0,0,0,0.07)", display: "flex", gap: 8 }}>
        <button type="button" style={{
          fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer",
          background: active ? "rgba(255,59,48,0.08)" : "rgba(52,199,89,0.09)",
          color: active ? "#DC2626" : "var(--kk-green-ink)",
          transition: "all 0.5s",
          display: "flex", alignItems: "center", gap: 5,
        }}>
          {active ? <><Pause style={{ width: 11, height: 11 }} /> Pause</> : <><Play style={{ width: 11, height: 11 }} /> Activate</>}
        </button>
      </div>
    </div>
  );
}

function HowToSetupDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = WT_STEPS.length;

  const next = useCallback(() => setStep(s => (s + 1) % total), [total]);
  const prev = useCallback(() => setStep(s => (s - 1 + total) % total), [total]);

  const stepDuration = WT_STEPS[step].duration ?? STEP_DURATION;

  useEffect(() => {
    if (!open || paused) return;
    const t = setTimeout(next, stepDuration);
    return () => clearTimeout(t);
  }, [open, step, paused, next, stepDuration]);

  useEffect(() => {
    if (!open) setStep(0);
  }, [open]);

  const { label, desc, Visual } = WT_STEPS[step];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <button type="button" style={{
          width: "100%", textAlign: "left", cursor: "pointer",
          background: "rgba(37,211,102,0.08)",
          border: "1px solid rgba(37,211,102,0.28)",
          borderRadius: 12, padding: "11px 13px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Play style={{ width: 14, height: 14, color: "#fff", marginLeft: 2 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink)", margin: 0 }}>How to set up WA Auto-Blast</p>
          </div>
          <ChevronRight style={{ width: 15, height: 15, color: "#25D366", flexShrink: 0 }} />
        </button>
      } />
      <DialogContent style={{ maxWidth: 400, padding: 0, borderRadius: 18, overflow: "hidden", border: "none" }}>
        {/* header */}
        <div style={{ padding: "16px 18px 12px", borderBottom: "0.5px solid rgba(0,0,0,0.07)" }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--kk-ink-faint)", margin: "0 0 4px" }}>
            Step {step + 1} of {total}
          </p>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--kk-ink)", margin: 0 }}>{label}</p>
        </div>

        {/* visual — fixed height so dialog never resizes between steps */}
        <div style={{ padding: "16px 18px 0" }}>
          <div key={step} style={{ height: 180, overflow: "hidden", marginBottom: 12 }}>
            <Visual />
          </div>
          <p style={{ fontSize: 13, color: "var(--kk-ink-mute)", lineHeight: 1.6, margin: "0 0 14px", minHeight: 78 }}>{desc}</p>
        </div>

        {/* progress bar */}
        <div style={{ height: 3, background: "rgba(0,0,0,0.06)", margin: "0 18px" }}>
          <div key={`${step}-${paused}`} style={{
            height: "100%", background: "var(--kk-blue)", borderRadius: 99,
            transformOrigin: "left",
            animation: paused ? "none" : `kk-wt-bar ${stepDuration}ms linear forwards`,
          }} />
        </div>
        <style>{`@keyframes kk-wt-bar{from{width:0%}to{width:100%}}`}</style>

        {/* controls */}
        <div style={{ display: "flex", alignItems: "center", padding: "10px 18px 16px", gap: 8 }}>
          <button type="button" onClick={prev}
            style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--kk-line)", background: "var(--kk-bg)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--kk-ink-mute)" }}>
            <ChevronLeft style={{ width: 14, height: 14 }} />
          </button>
          <button type="button" onClick={() => setPaused(v => !v)}
            style={{ fontSize: 11, fontWeight: 600, color: "var(--kk-ink-mute)", background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}>
            {paused ? "Resume" : "Pause"}
          </button>
          <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 5 }}>
            {WT_STEPS.map((_, i) => (
              <button key={i} type="button" onClick={() => { setStep(i); setPaused(false); }}
                style={{ width: i === step ? 16 : 6, height: 6, borderRadius: 99, border: "none", cursor: "pointer", padding: 0, background: i === step ? "var(--kk-blue)" : "rgba(0,0,0,0.12)", transition: "all 0.3s" }} />
            ))}
          </div>
          <button type="button" onClick={next}
            style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "var(--kk-blue)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── queue tab ────────────────────────────────────────────────────────────────

function fmtMYT(iso: string) {
  const d = new Date(iso);
  const myt = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  const hh = String(myt.getUTCHours()).padStart(2, "0");
  const mm = String(myt.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function QueueTab({ queue, sentQueue, leads, onRemove, onAcknowledge, onClearAll, onClearSent, onLeadClick }: {
  queue: WaBlastQueueItem[];
  sentQueue: WaBlastSentItem[];
  leads: OwnerLead[];
  onRemove: (ownerId: string) => void;
  onAcknowledge: (id: string) => void;
  onClearAll?: () => void;
  onClearSent?: () => void;
  onLeadClick?: (leadId: string) => boolean | void;
}) {
  const [removing, setRemoving] = useState<string | null>(null);
  const [acking, setAcking] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearingSent, setClearingSent] = useState(false);
  const [shakingLeadId, setShakingLeadId] = useState<string | null>(null);

  async function handleClearAll() {
    if (!onClearAll || clearing) return;
    setClearing(true);
    try {
      await clearWaBlastQueue();
      onClearAll();
    } finally {
      setClearing(false);
    }
  }

  async function handleClearSent() {
    if (!onClearSent || clearingSent) return;
    setClearingSent(true);
    try {
      await clearAllWaSent();
      onClearSent();
    } finally {
      setClearingSent(false);
    }
  }

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

  async function handleAck(item: WaBlastSentItem) {
    setAcking(item.id);
    try {
      await acknowledgeWaSent(item.id);
      onAcknowledge(item.id);
    } finally {
      setAcking(null);
    }
  }

  if (queue.length === 0 && sentQueue.length === 0) {
    return (
      <div id="tour-wa-blast-queue-content" style={{ padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <Clock style={{ width: 26, height: 26, color: "var(--kk-ink-faint)", opacity: 0.35 }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink-mute)", margin: 0 }}>Queue is empty</p>
        <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", textAlign: "center", maxWidth: 240, margin: 0 }}>
          Select leads from the table below, then click "Add to WA Blast" in the action bar.
        </p>
      </div>
    );
  }

  return (
    <div id="tour-wa-blast-queue-content">
      {/* Pending */}
      {queue.length > 0 && (
        <>
          <div id="tour-wa-blast-sent-header" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px 4px" }}>
            <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", fontWeight: 500, margin: 0, flexShrink: 0 }}>
              Sent in order
            </p>
            <div style={{
              padding: "3px 8px", borderRadius: 8,
              background: "rgba(0,113,227,0.06)", border: "1px solid rgba(0,113,227,0.14)",
              fontSize: 11, color: "var(--kk-ink-mute)", lineHeight: 1.4,
            }}>
              When message is sent, status takes a few moments to update.
            </div>
            <div style={{ flex: 1 }} />
            {onClearAll && (
              <button type="button" onClick={handleClearAll} disabled={clearing}
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color: "var(--kk-red)", background: "none", border: "none", cursor: "pointer", padding: 0, opacity: clearing ? 0.4 : 1, flexShrink: 0 }}>
                <X style={{ width: 10, height: 10 }} />
                Clear queue
              </button>
            )}
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
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
                  <button type="button" onClick={() => {
                    if (!lead || !onLeadClick) return;
                    const found = onLeadClick(lead.id);
                    if (found === false) {
                      setShakingLeadId(lead.id);
                      setTimeout(() => setShakingLeadId(null), 600);
                    }
                  }}
                    className={shakingLeadId === lead?.id ? "kk-queue-shake" : undefined}
                    style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: lead && onLeadClick ? "pointer" : "default" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                    <p style={{ fontSize: 11, color: "var(--kk-ink-mute)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</p>
                  </button>
                  {!lead?.property_name && (
                    <span style={{ fontSize: 11, color: "var(--kk-ink-faint)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{item.phone}</span>
                  )}
                  <button type="button" disabled={removing === item.owner_lead_id} onClick={() => handleRemove(item)}
                    style={{
                      width: 22, height: 22, borderRadius: "50%", border: "none", cursor: "pointer",
                      background: "rgba(255,59,48,0.10)", color: "#FF3B30",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      opacity: removing === item.owner_lead_id ? 0.4 : 1,
                    }}>
                    {removing === item.owner_lead_id
                      ? <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} />
                      : <X style={{ width: 11, height: 11 }} />}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Sent today */}
      {sentQueue.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", padding: "8px 14px 4px" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--kk-green-ink)", letterSpacing: "0.04em", flex: 1 }}>
              SENT TODAY ({sentQueue.length})
            </span>
            {onClearSent && (
              <button type="button" onClick={handleClearSent} disabled={clearingSent}
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color: "var(--kk-red)", background: "none", border: "none", cursor: "pointer", padding: 0, opacity: clearingSent ? 0.4 : 1 }}>
                {!clearingSent && <X style={{ width: 10, height: 10 }} />}
                {clearingSent ? "Clearing..." : "Clear sent"}
              </button>
            )}
          </div>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {sentQueue.map((item) => {
              const lead = leadMap.get(item.owner_lead_id);
              const name = lead?.owner_name ?? "Unknown";
              const sub = lead?.property_name
                ? (lead.unit ? `${lead.unit} · ${lead.property_name}` : lead.property_name)
                : item.phone;
              return (
                <div key={item.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "6px 14px", borderTop: "0.5px solid rgba(52,199,89,0.12)",
                  background: "rgba(52,199,89,0.04)",
                }}>
                  <CheckCircle2 style={{ width: 13, height: 13, color: "var(--kk-green-ink)", flexShrink: 0 }} />
                  <button type="button" onClick={() => {
                    if (!lead || !onLeadClick) return;
                    const found = onLeadClick(lead.id);
                    if (found === false) {
                      setShakingLeadId(lead.id);
                      setTimeout(() => setShakingLeadId(null), 600);
                    }
                  }}
                    className={shakingLeadId === lead?.id ? "kk-queue-shake" : undefined}
                    style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: lead && onLeadClick ? "pointer" : "default" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                    <p style={{ fontSize: 11, color: "var(--kk-ink-mute)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</p>
                  </button>
                  <span style={{ fontSize: 11, color: "var(--kk-green-ink)", flexShrink: 0, fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
                    {fmtMYT(item.sent_at)} MYT
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── wa setup dialog ──────────────────────────────────────────────────────────

type SetupTokens = { access_token: string; refresh_token: string };
type OS = "mac" | "windows";

function mask(s: string) { return s.slice(0, 6) + "••••••••"; }

function getRunBase() {
  if (typeof window === "undefined") return "https://kakisewa.com/api/wa-blast/run";
  return `${window.location.origin}/api/wa-blast/run`;
}

function buildCmd(tokens: SetupTokens, os: OS) {
  const { access_token: at, refresh_token: rt } = tokens;
  const base = getRunBase();
  if (os === "mac") return `KAKI_TOKEN="${at}" KAKI_REFRESH="${rt}" bash <(curl -sL ${base})`;
  return `$env:KAKI_TOKEN="${at}"; $env:KAKI_REFRESH="${rt}"; irm ${base}?platform=win | iex`;
}

function buildMaskedCmd(tokens: SetupTokens, os: OS) {
  const { access_token: at, refresh_token: rt } = tokens;
  const base = getRunBase();
  if (os === "mac") return `KAKI_TOKEN="${mask(at)}" KAKI_REFRESH="${mask(rt)}" bash <(curl -sL ${base})`;
  return `$env:KAKI_TOKEN="${mask(at)}"; $env:KAKI_REFRESH="${mask(rt)}"; irm ${base}?platform=win | iex`;
}

const NUM = {
  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
  background: "rgba(0,113,227,0.10)", color: "var(--kk-blue)",
  fontSize: 11, fontWeight: 700 as const,
  display: "flex", alignItems: "center", justifyContent: "center",
};


function SetupDialog({ initialSession, onSessionChange }: { initialSession: WaSession | null; onSessionChange?: (s: WaSession) => void }) {
  const [open, setOpen] = useState(false);
  const [os, setOs] = useState<OS>("mac");
  const [session, setSession] = useState<WaSession | null>(initialSession);
  const [tokens, setTokens] = useState<SetupTokens | null>(null);
  const [copied, setCopied] = useState(false);
  const [connectingTick, setConnectingTick] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrShownSinceRef = useRef<number | null>(null);

  const connected = session?.is_authenticated;

  async function fetchSession() {
    try {
      const res = await fetch("/api/wa-blast/session");
      const data = await res.json() as WaSession;
      setSession(data);
      onSessionChange?.(data);
      // Track when QR first appeared so we can show "connecting..." after 12s
      if (data.qr_data_url && !data.is_authenticated) {
        if (!qrShownSinceRef.current) qrShownSinceRef.current = Date.now();
      } else {
        qrShownSinceRef.current = null;
      }
    } catch { /* ignore */ }
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      if (!tokens) {
        try {
          const res = await fetch("/api/wa-blast/setup-token");
          if (res.ok) setTokens(await res.json());
        } catch { /* ignore */ }
      }
      // If currently connected, signal the blaster to logout the old session
      if (connected) {
        fetch("/api/wa-blast/relink", { method: "POST" }).catch(() => {});
      }
      fetchSession();
      pollRef.current = setInterval(fetchSession, 4000);
    } else {
      stopPolling();
    }
  }

  function copy() {
    if (!tokens) return;
    navigator.clipboard.writeText(buildCmd(tokens, os)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  // Background poll (slow) — keeps status dot current even when dialog is closed
  useEffect(() => {
    const bg = setInterval(fetchSession, 20000);
    return () => { clearInterval(bg); stopPolling(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick every second while QR is showing — drives the "connecting..." patience state
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setConnectingTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [open]);

  // Switch to "scanning..." overlay 12 s after QR first appeared
  const secondsWithQr = connectingTick >= 0 && qrShownSinceRef.current
    ? Math.floor((Date.now() - qrShownSinceRef.current) / 1000)
    : 0;
  const showConnecting = !connected && !!session?.qr_data_url && secondsWithQr >= 12;

  return (
    <div id="tour-wa-blast-link-wa" style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)", paddingTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
            background: connected ? "var(--kk-green)" : "#F59E0B",
          }} />
          <span style={{ fontSize: 12, color: "var(--kk-ink-mute)" }}>
            WhatsApp: <strong style={{ color: connected ? "var(--kk-green-ink)" : "var(--kk-ink)" }}>
              {connected ? "Connected" : "Not linked"}
            </strong>
          </span>
        </div>

        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogTrigger render={
            !connected ? (
              <button type="button" style={{
                fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                background: "rgba(0,113,227,0.09)", border: "1px solid rgba(0,113,227,0.22)", color: "var(--kk-blue)",
                flexShrink: 0,
              }}>
                <QrCode style={{ width: 11, height: 11, display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                Link WhatsApp
              </button>
            ) : (
              <button type="button" style={{
                fontSize: 11, fontWeight: 600, padding: "4px 11px", borderRadius: 20, cursor: "pointer",
                background: "rgba(110,110,115,0.09)", border: "1px solid rgba(110,110,115,0.22)",
                color: "var(--kk-ink-mute)", flexShrink: 0,
              }}>
                <QrCode style={{ width: 10, height: 10, display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                Relink
              </button>
            )
          } />

          <DialogContent style={{ padding: 0, borderRadius: 22, overflow: "hidden", maxWidth: 440, width: "calc(100vw - 32px)" }}>

            {/* Green header */}
            <div style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)", padding: "20px 20px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <QrCode style={{ width: 18, height: 18, color: "#fff" }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>Link WhatsApp</p>
                  <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.8)", margin: 0 }}>Free auto-blast from your own number</p>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", margin: 0, lineHeight: 1.55, background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 11px" }}>
                Messages are sent from your own WhatsApp at no cost. Owners see a personal message from you directly.
              </p>
            </div>

            {/* OS tabs */}
            <div style={{ display: "flex", borderBottom: "0.5px solid rgba(0,0,0,0.08)", background: "var(--kk-bg)" }}>
              {(["mac", "windows"] as OS[]).map((o) => (
                <button key={o} type="button" onClick={() => setOs(o)}
                  style={{
                    flex: 1, padding: "9px 0", fontSize: 12, fontWeight: os === o ? 700 : 500,
                    background: "none", border: "none", cursor: "pointer",
                    color: os === o ? "var(--kk-blue)" : "var(--kk-ink-mute)",
                    borderBottom: os === o ? "2px solid var(--kk-blue)" : "2px solid transparent",
                    marginBottom: -1,
                  }}>
                  {o === "mac" ? "Mac" : "Windows"}
                </button>
              ))}
            </div>

            {/* Steps */}
            <div style={{ padding: "18px 20px 22px", display: "flex", flexDirection: "column", gap: 16, overflowX: "hidden" }}>

              {os === "mac" ? (
                <>
                  {/* Mac Step 1 — Open Terminal */}
                  <div style={{ display: "flex", gap: 11 }}>
                    <div style={NUM}>1</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink)", margin: "0 0 4px" }}>Open Terminal</p>
                      <p style={{ fontSize: 12, color: "var(--kk-ink-mute)", margin: 0, lineHeight: 1.6 }}>
                        Press <kbd style={{ background: "var(--kk-bg)", border: "1px solid var(--kk-line)", borderRadius: 5, padding: "1px 6px", fontSize: 11 }}>Cmd</kbd>{" "}+{" "}
                        <kbd style={{ background: "var(--kk-bg)", border: "1px solid var(--kk-line)", borderRadius: 5, padding: "1px 6px", fontSize: 11 }}>Space</kbd>, type <strong>Terminal</strong>, press Enter.
                      </p>
                    </div>
                  </div>

                  {/* Mac Step 2 — Paste command */}
                  <div style={{ display: "flex", gap: 11 }}>
                    <div style={NUM}>2</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink)", margin: "0 0 2px" }}>Paste this command and press Enter</p>
                      <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", margin: "0 0 6px" }}>First run installs packages (~1 min). Instant on re-runs.</p>
                      <div style={{ background: "#1D1D1F", borderRadius: 9, overflow: "hidden" }}>
                        <div style={{ padding: "9px 12px" }}>
                          <code style={{
                            fontSize: 10.5, color: "#A8FF78", fontFamily: "monospace",
                            flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            display: "block",
                          }}>
                            {tokens ? buildMaskedCmd(tokens, os) : "Generating your command..."}
                          </code>
                        </div>
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 10, color: "#6E6E73" }}>Personal to your account. Do not share.</span>
                          <button type="button" onClick={copy} disabled={!tokens}
                            style={{
                              fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
                              background: copied ? "rgba(168,255,120,0.18)" : "rgba(255,255,255,0.10)",
                              border: "none", cursor: tokens ? "pointer" : "default",
                              color: copied ? "#A8FF78" : "#AEAEB2",
                            }}>
                            {copied ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Windows Step 1 — Open PowerShell */}
                  <div style={{ display: "flex", gap: 11 }}>
                    <div style={NUM}>1</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink)", margin: "0 0 4px" }}>Open PowerShell</p>
                      <p style={{ fontSize: 12, color: "var(--kk-ink-mute)", margin: 0, lineHeight: 1.6 }}>
                        Press <kbd style={{ background: "var(--kk-bg)", border: "1px solid var(--kk-line)", borderRadius: 5, padding: "1px 6px", fontSize: 11 }}>Win</kbd>{" "}+{" "}
                        <kbd style={{ background: "var(--kk-bg)", border: "1px solid var(--kk-line)", borderRadius: 5, padding: "1px 6px", fontSize: 11 }}>X</kbd>, choose <strong>Windows PowerShell</strong> or <strong>Terminal</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Windows Step 2 — Paste command */}
                  <div style={{ display: "flex", gap: 11 }}>
                    <div style={NUM}>2</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink)", margin: "0 0 2px" }}>Paste this command and press Enter</p>
                      <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", margin: "0 0 6px" }}>First run installs packages (~1 min). Instant on re-runs.</p>
                      <div style={{ background: "#1D1D1F", borderRadius: 9, overflow: "hidden" }}>
                        <div style={{ padding: "9px 12px" }}>
                          <code style={{
                            fontSize: 10.5, color: "#A8FF78", fontFamily: "monospace",
                            flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            display: "block",
                          }}>
                            {tokens ? buildMaskedCmd(tokens, os) : "Generating your command..."}
                          </code>
                        </div>
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 10, color: "#6E6E73" }}>Personal to your account. Do not share.</span>
                          <button type="button" onClick={copy} disabled={!tokens}
                            style={{
                              fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
                              background: copied ? "rgba(168,255,120,0.18)" : "rgba(255,255,255,0.10)",
                              border: "none", cursor: tokens ? "pointer" : "default",
                              color: copied ? "#A8FF78" : "#AEAEB2",
                            }}>
                            {copied ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Step 3 — QR / status */}
              <div style={{ display: "flex", gap: 11 }}>
                <div style={{
                  ...NUM,
                  background: connected ? "rgba(52,199,89,0.12)" : "rgba(0,113,227,0.10)",
                  color: connected ? "var(--kk-green-ink)" : "var(--kk-blue)",
                }}>
                  {connected ? <CheckCircle2 style={{ width: 13, height: 13 }} /> : "3"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink)", margin: "0 0 8px" }}>
                    {connected ? "WhatsApp connected!" : "Scan the QR code with WhatsApp"}
                  </p>

                  {connected ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "rgba(52,199,89,0.08)", borderRadius: 10, border: "1px solid rgba(52,199,89,0.2)" }}>
                      <CheckCircle2 style={{ width: 15, height: 15, color: "var(--kk-green-ink)", flexShrink: 0 }} />
                      <p style={{ fontSize: 12, color: "var(--kk-green-ink)", margin: 0, fontWeight: 600 }}>
                        All set. Auto-blast sends from your WhatsApp.
                      </p>
                    </div>
                  ) : session?.qr_data_url ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      {/* QR image with "connecting" overlay after 12 s */}
                      <div style={{ position: "relative", width: 176, height: 176, flexShrink: 0 }}>
                        <img src={session.qr_data_url} alt="WhatsApp QR code"
                          style={{ width: 176, height: 176, borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)", display: "block", opacity: showConnecting ? 0.18 : 1, transition: "opacity 0.5s" }} />
                        {showConnecting && (
                          <div style={{
                            position: "absolute", inset: 0, borderRadius: 12,
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            gap: 10, background: "rgba(255,255,255,0.88)",
                          }}>
                            <Loader2 style={{ width: 28, height: 28, color: "var(--kk-blue)", animation: "spin 1s linear infinite" }} />
                            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--kk-ink)", margin: 0, textAlign: "center", padding: "0 12px" }}>
                              Connecting...
                            </p>
                          </div>
                        )}
                      </div>
                      {showConnecting ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <p style={{ fontSize: 12, color: "var(--kk-ink-mute)", textAlign: "center", margin: 0, lineHeight: 1.55 }}>
                            QR scanned. WhatsApp is connecting your account.
                          </p>
                          <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", textAlign: "center", margin: 0 }}>
                            This can take up to 30 seconds. Stay on this screen.
                          </p>
                        </div>
                      ) : (
                        <>
                          <p style={{ fontSize: 11.5, color: "var(--kk-ink-mute)", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
                            Open <strong>WhatsApp</strong> on your phone → <strong>Settings</strong> → <strong>Linked Devices</strong> → <strong>Link a Device</strong>
                          </p>
                          <p style={{ fontSize: 10.5, color: "var(--kk-ink-faint)", margin: 0 }}>
                            After scanning, connecting takes up to 30 seconds
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", background: "var(--kk-bg)", borderRadius: 10, border: "1px solid rgba(0,0,0,0.07)" }}>
                      <Loader2 style={{ width: 14, height: 14, color: "var(--kk-ink-faint)", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                      <p style={{ fontSize: 12, color: "var(--kk-ink-mute)", margin: 0 }}>QR appears here once the command runs.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ─── requirements list ────────────────────────────────────────────────────────

const REQ_ITEMS = [
  { n: 1, title: "Keep laptop open and plugged in", desc: "Closing the lid or unplugging suspends the blaster." },
  { n: 2, title: "Turn off sleep mode", desc: "Mac: System Settings > Battery > Options. Windows: Settings > System > Power and Sleep. Set sleep to Never." },
  { n: 3, title: "Keep WhatsApp linked", desc: "If you remove kakisewa from Linked Devices on your phone, blasting stops." },
  { n: 4, title: "Keep the terminal window open", desc: "Closing the window stops the blast immediately." },
  { n: 5, title: "You may still be blocked", desc: "WhatsApp detects bulk messaging patterns regardless of the tool used. We help you execute the outreach, but the risk is the same as sending manually." },
];

function RequirementsList() {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      borderLeft: "3px solid rgba(255,149,0,0.5)",
      borderRadius: "0 10px 10px 0",
      border: "1px solid rgba(255,149,0,0.18)",
      borderLeftWidth: 3,
      background: "rgba(255,149,0,0.025)",
      overflow: "hidden",
    }}>
      <button type="button" onClick={() => setOpen(v => !v)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 6,
        padding: "8px 13px", background: "none", border: "none", cursor: "pointer",
        borderBottom: open ? "0.5px solid rgba(0,0,0,0.07)" : "none",
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#FF3B30" stroke="none" style={{ flexShrink: 0 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="12" y1="17" x2="12.01" y2="17" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--kk-ink-faint)", margin: 0, flex: 1, textAlign: "left" }}>
          Blasting stops if any of these are off
        </p>
        <ChevronDown style={{ width: 12, height: 12, color: "var(--kk-ink-faint)", flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      {open && REQ_ITEMS.map(({ n, title, desc }, i) => (
        <div key={n} style={{
          display: "flex", gap: 11, padding: "9px 13px",
          borderTop: i > 0 ? "0.5px solid rgba(0,0,0,0.06)" : "none",
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: "#D97706",
            minWidth: 14, flexShrink: 0, paddingTop: 1,
            fontVariantNumeric: "tabular-nums",
          }}>{n}</span>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--kk-ink)", margin: "0 0 2px" }}>{title}</p>
            <p style={{ fontSize: 11, color: "var(--kk-ink-mute)", margin: 0, lineHeight: 1.5 }}>{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── schedule tab ─────────────────────────────────────────────────────────────

function ScheduleTab({ cfg, saving, waSession, onChange, onToggleActive, onSave, onSessionChange }: {
  cfg: WaBlastConfig;
  saving: boolean;
  waSession: WaSession | null;
  onChange: (next: WaBlastConfig) => void;
  onToggleActive: () => void;
  onSave: () => void;
  onSessionChange?: (s: WaSession) => void;
}) {
  const max = calcMaxPerDay(cfg);
  const winErr = validateWindows(cfg.windows);
  const waLinked = !!waSession?.is_authenticated;
  // Blaster is offline if it hasn't written a heartbeat in (interval + 5) minutes
  const STALE_MS = ((cfg.interval_minutes ?? 10) + 5) * 60 * 1000;
  const blasterOffline = waLinked && !!waSession?.updated_at &&
    (Date.now() - new Date(waSession.updated_at).getTime() > STALE_MS);
  // Only block Activate when WA not linked; always allow Pause
  const cantActivate = !!winErr || (!waLinked && !cfg.is_active);
  // When the blaster goes offline while active, show it as effectively paused
  const effectivelyPaused = blasterOffline && cfg.is_active;

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
    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Setup guide card — primary CTA */}
      <HowToSetupDialog />

      {/* Requirements — 5 items, expandable */}
      <RequirementsList />

      {/* Send windows */}
      <div id="tour-wa-blast-send-windows">
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
            <NumberInput
              value={cfg.interval_minutes} min={1} max={120} width={46}
              onChange={(v) => onChange({ ...cfg, interval_minutes: v })}
            />
            <span style={{ fontSize: 12, color: "var(--kk-ink-mute)" }}>min</span>
          </div>

          <span style={{ color: "var(--kk-line)", fontSize: 14, lineHeight: 1 }}>·</span>

          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <NumberInput
              value={cfg.daily_cap} min={1} max={20} width={40}
              onChange={(v) => onChange({ ...cfg, daily_cap: v })}
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

      {/* WhatsApp link */}
      <SetupDialog initialSession={waSession} onSessionChange={onSessionChange} />

      {/* Offline / not-linked hints */}
      {blasterOffline && cfg.is_active && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8,
          background: "rgba(255,149,0,0.10)", border: "1px solid rgba(255,149,0,0.30)",
          borderRadius: 8, padding: "8px 11px" }}>
          <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.2 }}>⚠️</span>
          <p style={{ fontSize: 12, color: "#C47800", fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
            Auto-blast is offline. Your laptop may be asleep or the terminal window was closed. Double-click the setup file again to resume. Relink again if required.
          </p>
        </div>
      )}
      {!waLinked && !cfg.is_active && (
        <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", margin: 0 }}>
          Link WhatsApp above before activating.
        </p>
      )}

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", rowGap: 6 }}>
        <button id="tour-wa-blast-activate" type="button" onClick={effectivelyPaused ? undefined : onToggleActive}
          disabled={cantActivate || effectivelyPaused}
          style={{
            display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
            padding: "6px 14px", borderRadius: 20,
            cursor: (cantActivate || effectivelyPaused) ? "not-allowed" : "pointer",
            ...(cantActivate || effectivelyPaused
              ? { background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.08)", color: "var(--kk-ink-faint)" }
              : cfg.is_active
                ? { background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.20)", color: "#DC2626" }
                : { background: "rgba(52,199,89,0.09)", border: "1px solid rgba(52,199,89,0.25)", color: "var(--kk-green-ink)" }
            ),
          }}>
          {effectivelyPaused
            ? <><PauseCircle style={{ width: 11, height: 11 }} /> Paused (offline)</>
            : cfg.is_active
              ? <><Pause style={{ width: 11, height: 11 }} /> Pause</>
              : <><Play style={{ width: 11, height: 11 }} /> Activate</>
          }
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

        {cfg.is_active && (
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "5px 10px", borderRadius: 8,
            background: "rgba(0,113,227,0.06)", border: "1px solid rgba(0,113,227,0.14)",
            fontSize: 11, color: "var(--kk-ink-mute)", lineHeight: 1.4,
          }}>
            Messages take a few minutes to start. This is normal.
          </div>
        )}

      </div>

    </div>
  );
}

// ─── main panel ───────────────────────────────────────────────────────────────

export function WaBlastPanel({ initialConfig, queue, sentQueue, leads, onRemove, onAcknowledge, onClearAll, onClearSent, waCount, waCap, onCapChange, initialWaSession, openQueueSignal, onLeadClick }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("schedule");
  // Live session state — updated by SetupDialog polling so ScheduleTab sees current auth status
  const [liveWaSession, setLiveWaSession] = useState<WaSession | null>(initialWaSession);

  useEffect(() => {
    if (!openQueueSignal) return;
    setExpanded(true);
    setTab("queue");
  }, [openQueueSignal]);

  // Auto-expand when a WA blast tour is active (avoids needing useSearchParams + Suspense)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tour") === "wa-blast") setExpanded(true);
  }, []);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<WaBlastConfig>(initialConfig);

  const router = useRouter();
  const isActive = cfg.is_active;
  const queueSize = queue.length;
  const max = calcMaxPerDay(cfg);

  // Auto-refresh the page while blast is active so sent items appear without manual F5
  useEffect(() => {
    if (!isActive) return;
    const t = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(t);
  }, [isActive, router]);

  // Mirror effectivelyPaused for header chip — use liveWaSession so it updates after connect
  const waLinkedMain = !!liveWaSession?.is_authenticated;
  const STALE_MS_MAIN = ((cfg.interval_minutes ?? 10) + 5) * 60 * 1000;
  const blasterOfflineMain = waLinkedMain && !!liveWaSession?.updated_at &&
    (Date.now() - new Date(liveWaSession.updated_at).getTime() > STALE_MS_MAIN);
  const effectivelyPausedMain = blasterOfflineMain && isActive;

  // Daily counter colours — use computed max so counter matches schedule
  const pct = max > 0 ? Math.min((waCount / max) * 100, 100) : 0;
  const warn = Math.round(max * 0.75);
  const ctrColor = waCount >= max ? "#DC2626" : waCount >= warn ? "#D97706" : "#1F8B4C";

  const accentBorder = isActive ? "rgba(52,199,89,0.22)" : "rgba(0,0,0,0.10)";

  async function handleSave() {
    setSaving(true);
    try {
      const res = await saveWaBlastConfig(cfg);
      if (res.ok) {
        toast.success("Schedule saved.");
        onCapChange(calcMaxPerDay(cfg)); // sync counter cap to saved schedule
      } else {
        toast.error("Failed to save.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    const next = { ...cfg, is_active: !cfg.is_active };
    setCfg(next);
    await saveWaBlastConfig(next);
    toast.success(next.is_active ? "Auto-blast activated." : "Auto-blast paused.");
  }

  return (
    <div style={{ borderRadius: 14, border: `1px solid ${accentBorder}`, background: "var(--kk-surface)", overflow: "hidden", marginBottom: 12 }}>

      {/* ── header (always visible) ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>

        {/* left: title + status — clickable to expand */}
        <button
          id="tour-wa-blast-header"
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{ flex: 1, display: "flex", alignItems: "center", gap: 7, padding: "9px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", minWidth: 0, overflow: "hidden" }}
        >
          <Clock style={{ width: 13, height: 13, color: isActive ? "var(--kk-green)" : "var(--kk-blue)", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--kk-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>WA Auto-Blast</span>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
            padding: "2px 6px", borderRadius: 99, flexShrink: 0,
            background: (isActive && !effectivelyPausedMain) ? "rgba(52,199,89,0.13)" : "rgba(0,0,0,0.06)",
            color: (isActive && !effectivelyPausedMain) ? "var(--kk-green-ink)" : "var(--kk-ink-mute)",
          }}>
            {(isActive && !effectivelyPausedMain) ? "Active" : "Paused"}
          </span>
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
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--kk-ink)", fontVariantNumeric: "tabular-nums" }}>{max}</span>
              <span style={{ fontSize: 10, color: "var(--kk-ink-faint)" }}>sent</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── expanded body ── */}
      {expanded && (
        <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.07)" }}>

          {/* tab bar */}
          <div style={{ display: "flex", borderBottom: "0.5px solid rgba(0,0,0,0.07)" }}>
            {(["schedule", "queue"] as Tab[]).map((t) => (
              <button key={t} id={t === "queue" ? "tour-wa-blast-queue-tab" : undefined} type="button" onClick={() => setTab(t)}
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
            ? <ScheduleTab cfg={cfg} saving={saving} waSession={liveWaSession} onChange={setCfg} onToggleActive={handleToggleActive} onSave={handleSave} onSessionChange={setLiveWaSession} />
            : <QueueTab queue={queue} sentQueue={sentQueue} leads={leads} onRemove={onRemove} onAcknowledge={onAcknowledge} onClearAll={onClearAll} onClearSent={onClearSent} onLeadClick={onLeadClick} />
          }
        </div>
      )}
    </div>
  );
}
