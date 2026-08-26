"use client";

import { useState, useRef, useEffect } from "react";
import {
  Clock, ChevronDown, ChevronUp, Loader2, Play, Pause, X, Plus, Info,
  Laptop, QrCode, Wifi, Timer, Terminal, CheckCircle2,
} from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { saveWaBlastConfig, removeOwnerWaBlast } from "@/lib/actions";
import type { WaBlastConfig, WaBlastQueueItem, WaSession } from "@/lib/db";
import type { OwnerLead } from "@/lib/types";

interface Props {
  initialConfig: WaBlastConfig;
  queue: WaBlastQueueItem[];
  leads: OwnerLead[];
  onRemove: (ownerId: string) => void;
  waCount: number;
  waCap: number;
  onCapChange: (n: number) => void;
  initialWaSession: WaSession | null;
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

// ─── time input (native iOS wheel picker) ─────────────────────────────────────

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: "var(--kk-ink)",
        background: "var(--kk-bg)",
        border: "1px solid var(--kk-line)",
        borderRadius: 9,
        padding: "4px 8px",
        outline: "none",
        cursor: "pointer",
        minWidth: 0,
      }}
    />
  );
}

// ─── setup info panel ─────────────────────────────────────────────────────────

function SetupInfo({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: <Laptop style={{ width: 15, height: 15 }} />,
      title: "Keep your laptop awake",
      body: "Messages send from your laptop in the background. Make sure it stays on, connected to the internet, and not in sleep mode while a blast is running.",
    },
    {
      icon: <QrCode style={{ width: 15, height: 15 }} />,
      title: "Link your WhatsApp (first time only)",
      body: "On your phone, open WhatsApp and go to Settings → Linked Devices → Link a Device. Scan the QR code shown on your laptop screen.",
    },
    {
      icon: <Wifi style={{ width: 15, height: 15 }} />,
      title: "Stays connected automatically",
      body: "Once linked, your WhatsApp session is remembered. No need to scan again unless you manually unlink the device.",
    },
    {
      icon: <Timer style={{ width: 15, height: 15 }} />,
      title: "Sends within your time windows",
      body: "Messages go out automatically during the windows you set below. Outside those hours, the queue pauses and resumes the next day.",
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

// ─── wa setup dialog ──────────────────────────────────────────────────────────

type SetupCmd = { access_token: string; refresh_token: string; user_id: string };

function SetupDialog({ initialSession }: { initialSession: WaSession | null }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<WaSession | null>(initialSession);
  const [cmd, setCmd] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connected = session?.is_authenticated;

  async function fetchSession() {
    try {
      const res = await fetch("/api/wa-blast/session");
      const data = await res.json() as WaSession;
      setSession(data);
      if (data.is_authenticated) {
        stopPolling();
      }
    } catch { /* ignore */ }
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function onOpenChange(next: boolean) {
    setOpen(next);
    if (next && !connected) {
      // Fetch personal command
      if (!cmd) {
        try {
          const res = await fetch("/api/wa-blast/setup-token");
          if (res.ok) {
            const { access_token, refresh_token }: SetupCmd = await res.json();
            setCmd(`KAKI_TOKEN="${access_token}" KAKI_REFRESH="${refresh_token}" node scripts/blaster.mjs`);
          }
        } catch { /* ignore */ }
      }
      // Start polling for QR
      fetchSession();
      pollRef.current = setInterval(fetchSession, 4000);
    } else {
      stopPolling();
    }
  }

  useEffect(() => () => stopPolling(), []);

  function copy() {
    if (!cmd) return;
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)", paddingTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
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
              }}>
                <QrCode style={{ width: 11, height: 11, display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                Link WhatsApp
              </button>
            ) : (
              <button type="button" style={{
                fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 20, cursor: "pointer",
                background: "none", border: "none", color: "var(--kk-ink-faint)",
              }}>Relink</button>
            )
          } />

          <DialogContent className="max-w-md" style={{ padding: 0, borderRadius: 22, overflow: "hidden" }}>
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
              padding: "24px 24px 20px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <QrCode style={{ width: 20, height: 20, color: "#fff" }} />
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>Link WhatsApp</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", margin: 0 }}>Free auto-blast from your own number</p>
                </div>
              </div>
              <div style={{
                background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 12px",
                fontSize: 12, color: "#fff", lineHeight: 1.5,
              }}>
                Messages send from your own WhatsApp number at no cost. You keep full control, owners see a message from you personally.
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Steps */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Step 1 */}
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    background: "rgba(0,113,227,0.10)", color: "var(--kk-blue)",
                    fontSize: 12, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>1</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink)", margin: "0 0 3px" }}>Open Terminal on your Mac</p>
                    <p style={{ fontSize: 12, color: "var(--kk-ink-mute)", margin: 0, lineHeight: 1.5 }}>
                      Press <kbd style={{ background: "var(--kk-bg)", border: "1px solid var(--kk-line)", borderRadius: 5, padding: "1px 5px", fontSize: 11 }}>Cmd</kbd>{" "}+{" "}
                      <kbd style={{ background: "var(--kk-bg)", border: "1px solid var(--kk-line)", borderRadius: 5, padding: "1px 5px", fontSize: 11 }}>Space</kbd>, type <strong>Terminal</strong>, press Enter.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    background: "rgba(0,113,227,0.10)", color: "var(--kk-blue)",
                    fontSize: 12, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>2</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink)", margin: "0 0 6px" }}>Paste this command and press Enter</p>
                    <div style={{
                      background: "#1D1D1F", borderRadius: 10, padding: "10px 12px",
                      display: "flex", alignItems: "center", gap: 8, overflow: "hidden",
                    }}>
                      <Terminal style={{ width: 13, height: 13, color: "#A8FF78", flexShrink: 0 }} />
                      <code style={{
                        fontSize: 10.5, color: "#A8FF78", fontFamily: "monospace",
                        flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {cmd ? cmd.replace(/KAKI_TOKEN="[^"]{20}[^"]*"/, 'KAKI_TOKEN="••••••••"').replace(/KAKI_REFRESH="[^"]{20}[^"]*"/, 'KAKI_REFRESH="••••••••"') : "Generating your command..."}
                      </code>
                      <button type="button" onClick={copy} disabled={!cmd}
                        style={{
                          fontSize: 11, fontWeight: 700, color: copied ? "#A8FF78" : "#6E6E73",
                          border: "none", cursor: cmd ? "pointer" : "default",
                          flexShrink: 0, padding: "2px 6px", borderRadius: 5,
                          background: copied ? "rgba(168,255,120,0.12)" : "rgba(255,255,255,0.07)",
                        }}>
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p style={{ fontSize: 10.5, color: "var(--kk-ink-faint)", margin: "5px 0 0" }}>
                      This command is personal to your account. Do not share it.
                    </p>
                  </div>
                </div>

                {/* Step 3 — QR */}
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    background: session?.qr_data_url ? "rgba(52,199,89,0.12)" : "rgba(0,113,227,0.10)",
                    color: session?.qr_data_url ? "var(--kk-green-ink)" : "var(--kk-blue)",
                    fontSize: 12, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {connected ? <CheckCircle2 style={{ width: 14, height: 14 }} /> : "3"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--kk-ink)", margin: "0 0 8px" }}>
                      {connected ? "WhatsApp connected!" : "Scan the QR code with WhatsApp"}
                    </p>

                    {connected ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(52,199,89,0.08)", borderRadius: 10, border: "1px solid rgba(52,199,89,0.2)" }}>
                        <CheckCircle2 style={{ width: 16, height: 16, color: "var(--kk-green-ink)", flexShrink: 0 }} />
                        <p style={{ fontSize: 12, color: "var(--kk-green-ink)", margin: 0, fontWeight: 600 }}>
                          You&apos;re all set. Auto-blast will send from your WhatsApp.
                        </p>
                      </div>
                    ) : session?.qr_data_url ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <img
                          src={session.qr_data_url}
                          alt="WhatsApp QR code"
                          style={{ width: 180, height: 180, borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)" }}
                        />
                        <p style={{ fontSize: 11.5, color: "var(--kk-ink-mute)", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
                          Open <strong>WhatsApp</strong> on your phone → <strong>Settings</strong> → <strong>Linked Devices</strong> → <strong>Link a Device</strong>
                        </p>
                        <p style={{ fontSize: 10.5, color: "var(--kk-ink-faint)", margin: 0 }}>Refreshes every 4 seconds</p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--kk-bg)", borderRadius: 10, border: "1px solid rgba(0,0,0,0.07)" }}>
                        <Loader2 style={{ width: 15, height: 15, color: "var(--kk-ink-faint)", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                        <p style={{ fontSize: 12, color: "var(--kk-ink-mute)", margin: 0 }}>
                          Waiting for the command to run... The QR appears here automatically.
                        </p>
                      </div>
                    )}
                  </div>
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

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={onToggleActive} disabled={!!winErr}
          style={{
            display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
            padding: "6px 14px", borderRadius: 20, cursor: winErr ? "not-allowed" : "pointer",
            ...(winErr
              ? { background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.08)", color: "var(--kk-ink-faint)" }
              : cfg.is_active
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

      </div>
    </div>
  );
}

// ─── main panel ───────────────────────────────────────────────────────────────

export function WaBlastPanel({ initialConfig, queue, leads, onRemove, waCount, waCap, onCapChange, initialWaSession }: Props) {
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
            background: isActive ? "rgba(52,199,89,0.13)" : "rgba(0,0,0,0.06)",
            color: isActive ? "var(--kk-green-ink)" : "var(--kk-ink-mute)",
          }}>
            {isActive ? "Active" : "Paused"}
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
            ? <ScheduleTab cfg={cfg} saving={saving} waSession={initialWaSession} onChange={setCfg} onToggleActive={handleToggleActive} onSave={handleSave} />
            : <QueueTab queue={queue} leads={leads} onRemove={onRemove} />
          }
        </div>
      )}
    </div>
  );
}
