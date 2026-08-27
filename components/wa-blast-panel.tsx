"use client";

import { useState, useRef, useEffect } from "react";
import {
  Clock, ChevronDown, ChevronUp, Loader2, Play, Pause, PauseCircle, X, Plus, Info,
  Laptop, QrCode, Wifi, Timer, Terminal, CheckCircle2,
} from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { toast } from "sonner";
import { saveWaBlastConfig, removeOwnerWaBlast, acknowledgeWaSent, clearWaBlastQueue } from "@/lib/actions";
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
        background: "var(--kk-bg)", border: "1px solid var(--kk-line)", borderRadius: 9,
        padding: "4px 6px", outline: "none", color: "var(--kk-ink)",
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

  // Scroll selected item into view when popover opens
  useEffect(() => {
    if (!open || !listRef.current) return;
    const idx = options.indexOf(value);
    const ITEM_H = 32;
    listRef.current.scrollTop = Math.max(0, idx * ITEM_H - ITEM_H * 2);
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
      background: "var(--kk-bg)", border: "1px solid var(--kk-line)",
      borderRadius: 9, padding: "4px 6px",
    }}>
      <TimePart options={HOURS} value={hh} onChange={h => onChange(`${h}:${mm}`)} />
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)", userSelect: "none" }}>:</span>
      <TimePart options={MINS} value={mm} onChange={m => onChange(`${hh}:${m}`)} />
    </div>
  );
}

// ─── setup info panel ─────────────────────────────────────────────────────────

function SetupInfo({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: <QrCode style={{ width: 15, height: 15 }} />,
      title: "Scan QR once, then you're set",
      body: "Link your WhatsApp the first time by scanning the QR code. After that, just rerun the command — no rescanning needed, even after restarts.",
    },
    {
      icon: <Laptop style={{ width: 15, height: 15 }} />,
      title: "Rerun the command after every laptop restart",
      body: "The blast stops when your laptop shuts down or the Terminal is closed. Reopen Terminal and paste the command again — your WhatsApp stays linked.",
    },
    {
      icon: <Wifi style={{ width: 15, height: 15 }} />,
      title: "Keep your laptop awake during blast hours",
      body: "Sleep mode pauses the blast. On Mac, go to System Settings → Battery and turn off \"Prevent automatic sleeping\" while a blast is active. Or leave your laptop plugged in and lid open.",
    },
    {
      icon: <Timer style={{ width: 15, height: 15 }} />,
      title: "Sends only within your set windows",
      body: "Messages go out during the hours you configured. Outside those windows the queue pauses and resumes automatically.",
    },
  ];

  return (
    <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.08)", padding: "12px 14px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--kk-ink-faint)" }}>
          How WA Auto-Blast works
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
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--kk-ink)", marginBottom: 2, margin: "0 0 2px" }}>{s.title}</p>
              <p style={{ fontSize: 11, color: "var(--kk-ink-mute)", lineHeight: 1.5, margin: 0 }}>{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
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

function QueueTab({ queue, sentQueue, leads, onRemove, onAcknowledge, onClearAll }: {
  queue: WaBlastQueueItem[];
  sentQueue: WaBlastSentItem[];
  leads: OwnerLead[];
  onRemove: (ownerId: string) => void;
  onAcknowledge: (id: string) => void;
  onClearAll?: () => void;
}) {
  const [removing, setRemoving] = useState<string | null>(null);
  const [acking, setAcking] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

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
      <div style={{ padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <Clock style={{ width: 26, height: 26, color: "var(--kk-ink-faint)", opacity: 0.35 }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink-mute)", margin: 0 }}>Queue is empty</p>
        <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", textAlign: "center", maxWidth: 240, margin: 0 }}>
          Select leads from the table below, then click "Add to WA Blast" in the action bar.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Pending */}
      {queue.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", padding: "8px 14px 4px" }}>
            <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", fontWeight: 500, margin: 0, flex: 1 }}>
              {queue.length} lead{queue.length !== 1 ? "s" : ""} — sent in order
            </p>
            {onClearAll && (
              <button type="button" onClick={handleClearAll} disabled={clearing}
                style={{ fontSize: 10, fontWeight: 600, color: "var(--kk-red)", background: "none", border: "none", cursor: "pointer", padding: 0, opacity: clearing ? 0.4 : 1 }}>
                Clear all
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                    <p style={{ fontSize: 11, color: "var(--kk-ink-mute)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</p>
                  </div>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px 4px" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--kk-green-ink)", letterSpacing: "0.04em" }}>
              SENT TODAY ({sentQueue.length})
            </span>
            <span style={{ fontSize: 10, color: "var(--kk-ink-faint)" }}>Tick to remove</span>
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--kk-ink)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                    <p style={{ fontSize: 11, color: "var(--kk-ink-mute)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</p>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--kk-green-ink)", flexShrink: 0, fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
                    {fmtMYT(item.sent_at)} MYT
                  </span>
                  <button type="button" disabled={acking === item.id} onClick={() => handleAck(item)}
                    style={{
                      width: 22, height: 22, borderRadius: "50%", border: "1.5px solid var(--kk-green-ink)", cursor: "pointer",
                      background: acking === item.id ? "rgba(52,199,89,0.3)" : "rgba(52,199,89,0.12)",
                      color: "var(--kk-green-ink)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                    {acking === item.id
                      ? <Loader2 style={{ width: 10, height: 10, animation: "spin 1s linear infinite" }} />
                      : <CheckCircle2 style={{ width: 11, height: 11 }} />}
                  </button>
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

const NUM = {
  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
  background: "rgba(0,113,227,0.10)", color: "var(--kk-blue)",
  fontSize: 11, fontWeight: 700 as const,
  display: "flex", alignItems: "center", justifyContent: "center",
};
const KBD: React.CSSProperties = {
  background: "var(--kk-bg)", border: "1px solid var(--kk-line)",
  borderRadius: 5, padding: "1px 6px", fontSize: 11, fontFamily: "inherit",
};

function mask(s: string) {
  return s.slice(0, 6) + "••••••••";
}

function buildCmd(tokens: SetupTokens, os: OS) {
  const { access_token: at, refresh_token: rt } = tokens;
  if (os === "mac") {
    return `cd ~/kakisewa && KAKI_TOKEN="${at}" KAKI_REFRESH="${rt}" node scripts/blaster.mjs`;
  }
  return `cd %USERPROFILE%\\kakisewa && set KAKI_TOKEN=${at} && set KAKI_REFRESH=${rt} && node scripts/blaster.mjs`;
}

function buildMaskedCmd(tokens: SetupTokens, os: OS) {
  const { access_token: at, refresh_token: rt } = tokens;
  if (os === "mac") {
    return `cd ~/kakisewa && KAKI_TOKEN="${mask(at)}" KAKI_REFRESH="${mask(rt)}" node scripts/blaster.mjs`;
  }
  return `cd %USERPROFILE%\\kakisewa && set KAKI_TOKEN=${mask(at)} && set KAKI_REFRESH=${mask(rt)} && node scripts/blaster.mjs`;
}

function SetupDialog({ initialSession }: { initialSession: WaSession | null }) {
  const [open, setOpen] = useState(false);
  const [os, setOs] = useState<OS>("mac");
  const [session, setSession] = useState<WaSession | null>(initialSession);
  const [tokens, setTokens] = useState<SetupTokens | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connected = session?.is_authenticated;

  async function fetchSession() {
    try {
      const res = await fetch("/api/wa-blast/session");
      const data = await res.json() as WaSession;
      setSession(data);
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
      // before we show the dialog — this disconnects the old WhatsApp link
      if (connected) {
        fetch("/api/wa-blast/relink", { method: "POST" }).catch(() => {});
      }
      // Always poll when open — detects both QR appearance and disconnection
      fetchSession();
      pollRef.current = setInterval(fetchSession, 4000);
    } else {
      stopPolling();
    }
  }

  // Background poll (slow) — keeps status dot current even when dialog is closed
  useEffect(() => {
    const bg = setInterval(fetchSession, 20000);
    return () => { clearInterval(bg); stopPolling(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function copy() {
    if (!tokens) return;
    navigator.clipboard.writeText(buildCmd(tokens, os)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const requirementsAlert = (windowLabel: string, sleepPath: string) => (
    <div style={{
      marginTop: 10, borderRadius: 10, overflow: "hidden",
      border: "1px solid var(--kk-line)",
    }}>
      {/* header */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 8,
        background: "var(--kk-surface-raised, rgba(0,0,0,0.04))", padding: "8px 11px",
        borderBottom: "1px solid var(--kk-line)",
      }}>
        <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.2 }}>⚠️</span>
        <p style={{ fontSize: 12, color: "var(--kk-ink)", fontWeight: 700, margin: 0, lineHeight: 1.4 }}>
          Keep this running for auto-blast to work
        </p>
      </div>
      {/* requirements list */}
      <div style={{ background: "rgba(0,0,0,0.02)", padding: "8px 11px 9px" }}>
        {[
          { icon: "🖥️", text: `Keep the ${windowLabel} open the whole time. Closing it stops the blast.` },
          { icon: "😴", text: `Disable sleep mode. Go to ${sleepPath} and set sleep to Never.` },
          { icon: "🔌", text: "Keep your laptop plugged in, or at minimum keep the lid open." },
        ].map(({ icon, text }) => (
          <div key={icon} style={{ display: "flex", gap: 7, alignItems: "flex-start", marginBottom: 6 }}>
            <span style={{ fontSize: 13, flexShrink: 0, lineHeight: 1.3 }}>{icon}</span>
            <p style={{ fontSize: 11, color: "var(--kk-ink-mute)", fontWeight: 500, margin: 0, lineHeight: 1.5 }}>{text}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const step1Mac = (
    <>
      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink)", margin: "0 0 4px" }}>Open Terminal</p>
      <p style={{ fontSize: 12, color: "var(--kk-ink-mute)", margin: 0, lineHeight: 1.6 }}>
        Press <kbd style={KBD}>Cmd</kbd> + <kbd style={KBD}>Space</kbd>, type <strong>Terminal</strong>, press Enter.
      </p>
      {requirementsAlert("Terminal window", "System Settings > Battery > Options")}
    </>
  );
  const step1Win = (
    <>
      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink)", margin: "0 0 4px" }}>Open Command Prompt</p>
      <p style={{ fontSize: 12, color: "var(--kk-ink-mute)", margin: 0, lineHeight: 1.6 }}>
        Press <kbd style={KBD}>Win</kbd> + <kbd style={KBD}>R</kbd>, type <strong>cmd</strong>, press Enter.
      </p>
      {requirementsAlert("Command Prompt window", "Settings > System > Power and Sleep")}
    </>
  );

  const maskedCmd = tokens ? buildMaskedCmd(tokens, os) : null;

  return (
    <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)", paddingTop: 12 }}>
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

              {/* Step 1 */}
              <div style={{ display: "flex", gap: 11 }}>
                <div style={NUM}>1</div>
                <div style={{ flex: 1, minWidth: 0 }}>{os === "mac" ? step1Mac : step1Win}</div>
              </div>

              {/* Step 2 */}
              <div style={{ display: "flex", gap: 11 }}>
                <div style={NUM}>2</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink)", margin: "0 0 6px" }}>Paste this command and press Enter</p>
                  <div style={{ background: "#1D1D1F", borderRadius: 9, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "9px 12px" }}>
                      <Terminal style={{ width: 12, height: 12, color: "#A8FF78", flexShrink: 0, marginRight: 7 }} />
                      <code style={{
                        fontSize: 10.5, color: "#A8FF78", fontFamily: "monospace",
                        flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        display: "block",
                      }}>
                        {maskedCmd ?? "Generating your command..."}
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
                      <img src={session.qr_data_url} alt="WhatsApp QR code"
                        style={{ width: 176, height: 176, borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)", display: "block" }} />
                      <p style={{ fontSize: 11.5, color: "var(--kk-ink-mute)", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
                        Open <strong>WhatsApp</strong> on your phone → <strong>Settings</strong> → <strong>Linked Devices</strong> → <strong>Link a Device</strong>
                      </p>
                      <p style={{ fontSize: 10.5, color: "var(--kk-ink-faint)", margin: 0 }}>Refreshes every 4 seconds</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", background: "var(--kk-bg)", borderRadius: 10, border: "1px solid rgba(0,0,0,0.07)" }}>
                      <Loader2 style={{ width: 14, height: 14, color: "var(--kk-ink-faint)", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                      <p style={{ fontSize: 12, color: "var(--kk-ink-mute)", margin: 0 }}>QR appears here automatically once the command runs.</p>
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

// ─── schedule tab ─────────────────────────────────────────────────────────────

function ScheduleTab({ cfg, saving, waSession, onChange, onToggleActive, onSave }: {
  cfg: WaBlastConfig;
  saving: boolean;
  waSession: WaSession | null;
  onChange: (next: WaBlastConfig) => void;
  onToggleActive: () => void;
  onSave: () => void;
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
    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Risk caveat */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 8,
        background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.18)",
        borderRadius: 9, padding: "9px 12px",
      }}>
        <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.2 }}>🚨</span>
        <p style={{ fontSize: 11, color: "var(--kk-ink-mute)", margin: 0, lineHeight: 1.55 }}>
          <strong style={{ color: "var(--kk-ink)" }}>WhatsApp may still block your number.</strong> This tool automates what you would do manually. The risk is the same as sending yourself. Keep volume low and messages personal.
        </p>
      </div>

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
      <SetupDialog initialSession={waSession} />

      {/* Offline / not-linked hints */}
      {blasterOffline && cfg.is_active && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8,
          background: "rgba(255,149,0,0.10)", border: "1px solid rgba(255,149,0,0.30)",
          borderRadius: 8, padding: "8px 11px" }}>
          <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.2 }}>⚠️</span>
          <p style={{ fontSize: 12, color: "#C47800", fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
            Auto-blast is offline. Your laptop may be asleep or Terminal was closed. Reopen Terminal or Command Prompt and paste the command again to resume.
          </p>
        </div>
      )}
      {!waLinked && !cfg.is_active && (
        <p style={{ fontSize: 11, color: "var(--kk-ink-faint)", margin: 0 }}>
          Link WhatsApp above before activating.
        </p>
      )}

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={effectivelyPaused ? undefined : onToggleActive}
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

      </div>

    </div>
  );
}

// ─── main panel ───────────────────────────────────────────────────────────────

export function WaBlastPanel({ initialConfig, queue, sentQueue, leads, onRemove, onAcknowledge, onClearAll, waCount, waCap, onCapChange, initialWaSession, openQueueSignal }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("schedule");

  useEffect(() => {
    if (!openQueueSignal) return;
    setExpanded(true);
    setTab("queue");
  }, [openQueueSignal]);
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

  // Mirror effectivelyPaused for header chip
  const waLinkedMain = !!initialWaSession?.is_authenticated;
  const STALE_MS_MAIN = ((cfg.interval_minutes ?? 10) + 5) * 60 * 1000;
  const blasterOfflineMain = waLinkedMain && !!initialWaSession?.updated_at &&
    (Date.now() - new Date(initialWaSession.updated_at).getTime() > STALE_MS_MAIN);
  const effectivelyPausedMain = blasterOfflineMain && isActive;

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
    toast.success(next.is_active ? "Auto-blast activated." : "Auto-blast paused.");
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

        {/* left: title + status — clickable to expand */}
        <button
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
                  title="Tap to change daily limit"
                  style={{
                    fontSize: 11, fontWeight: 700, color: "var(--kk-ink)", background: "var(--kk-bg)",
                    border: "1px solid var(--kk-line)", cursor: "pointer",
                    padding: "0 4px", borderRadius: 4, lineHeight: "16px",
                  }}
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
            ? <ScheduleTab cfg={cfg} saving={saving} waSession={initialWaSession} onChange={setCfg} onToggleActive={handleToggleActive} onSave={handleSave} />
            : <QueueTab queue={queue} sentQueue={sentQueue} leads={leads} onRemove={onRemove} onAcknowledge={onAcknowledge} onClearAll={onClearAll} />
          }
        </div>
      )}
    </div>
  );
}
