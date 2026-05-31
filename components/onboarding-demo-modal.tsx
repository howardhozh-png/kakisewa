"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Upload, MessageCircle, Check } from "lucide-react";

export const DEMO_EVENT = "kk:open-demo";
const STORAGE_KEY = "kk_demo_seen_v1";

// ─── Phase machine ────────────────────────────────────────────────────────────

type PhaseId =
  | "idle"
  | "to-upload" | "hover-upload" | "click-upload"
  | "rows-in"
  | "to-wa" | "hover-wa" | "click-wa"
  | "sent" | "end";

interface Phase {
  id: PhaseId;
  ms: number;
  caption: string;
}

const PHASES: Phase[] = [
  { id: "idle",         ms: 1000, caption: "This is your New Owners dashboard — where outreach begins." },
  { id: "to-upload",   ms:  900, caption: "Start by uploading your list of owner leads as a CSV." },
  { id: "hover-upload",ms:  600, caption: "One click to import your whole list instantly." },
  { id: "click-upload",ms:  400, caption: "Importing..." },
  { id: "rows-in",     ms: 1400, caption: "3 leads imported! Your outreach list is ready." },
  { id: "to-wa",       ms:  900, caption: "Send a personalised WhatsApp to the first owner." },
  { id: "hover-wa",    ms:  600, caption: "Pre-filled message with your name and property details." },
  { id: "click-wa",    ms:  350, caption: "Opening WhatsApp..." },
  { id: "sent",        ms: 1800, caption: "✓ Message sent! Owner receives your outreach in seconds." },
  { id: "end",         ms: 1000, caption: "That's it — import & outreach done in under 30 seconds." },
];

// Cursor positions in a 520×270 frame
const CURSOR: Record<PhaseId, { x: number; y: number }> = {
  idle:           { x: 260, y: 135 },
  "to-upload":    { x:  82, y:  96 },
  "hover-upload": { x:  82, y:  96 },
  "click-upload": { x:  82, y:  96 },
  "rows-in":      { x:  82, y:  96 },
  "to-wa":        { x: 462, y: 163 },
  "hover-wa":     { x: 462, y: 163 },
  "click-wa":     { x: 462, y: 163 },
  sent:           { x: 462, y: 163 },
  end:            { x: 260, y: 135 },
};

const FAKE_LEADS = [
  { name: "Ms Koo",       prop: "The Park · A5905" },
  { name: "Ahmad Rashid", prop: "Bloomsvale" },
  { name: "Lily Chan",    prop: "Vista Damai" },
];

// ─── Animated scene ───────────────────────────────────────────────────────────

function DemoScene({ active }: { active: boolean }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!active) { setIdx(0); return; }
    const t = setTimeout(
      () => setIdx(i => (i + 1) % PHASES.length),
      PHASES[idx].ms,
    );
    return () => clearTimeout(t);
  }, [idx, active]);

  const phase = PHASES[idx].id;
  const cur = CURSOR[phase];

  const hasRows     = ["rows-in","to-wa","hover-wa","click-wa","sent","end"].includes(phase);
  const uploadHover = phase === "hover-upload" || phase === "click-upload";
  const uploadClick = phase === "click-upload";
  const waHover     = phase === "hover-wa" || phase === "click-wa";
  const waClick     = phase === "click-wa";
  const showSent    = phase === "sent" || phase === "end";

  return (
    <div>
      {/* ── Scene frame ── */}
      <div
        className="relative overflow-hidden rounded-xl"
        style={{ width: 520, height: 270, background: "#F2F2F7", userSelect: "none", flexShrink: 0 }}
      >
        {/* Fake nav */}
        <div
          className="flex items-center gap-2 px-4"
          style={{ height: 34, background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.07)" }}
        >
          <div
            className="w-[18px] h-[18px] rounded flex items-center justify-center font-bold"
            style={{ background: "#1C1C1E", color: "#fff", fontSize: 10 }}
          >K</div>
          <span style={{ fontWeight: 600, fontSize: 12, color: "#1C1C1E" }}>kakisewa</span>
          <div className="flex gap-3 ml-3">
            {["Home", "New Owners", "Contracts"].map(l => (
              <span key={l} style={{
                fontSize: 11,
                color: l === "New Owners" ? "#1C1C1E" : "#AEAEB2",
                fontWeight: l === "New Owners" ? 600 : 400,
              }}>{l}</span>
            ))}
          </div>
        </div>

        {/* Page content */}
        <div className="px-5 pt-4">
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontWeight: 700, fontSize: 15, color: "#1C1C1E" }}>New Owners</span>
            {/* Upload CSV button */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{
                fontSize: 11,
                fontWeight: 600,
                background: uploadHover ? "#1C1C1E" : "#fff",
                color: uploadHover ? "#fff" : "#1C1C1E",
                border: "1px solid rgba(0,0,0,0.12)",
                boxShadow: uploadHover ? "0 2px 8px rgba(0,0,0,0.20)" : "none",
                transform: uploadClick ? "scale(0.95)" : "scale(1)",
                transition: "all 0.15s ease",
              }}
            >
              <Upload style={{ width: 11, height: 11 }} />
              Upload CSV
            </div>
          </div>

          {/* Empty state */}
          {!hasRows && (
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-xl"
              style={{ height: 170, background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 36, height: 36, background: "#F2F2F7" }}
              >
                <Upload style={{ width: 16, height: 16, color: "#AEAEB2" }} />
              </div>
              <p style={{ fontSize: 11, color: "#AEAEB2", textAlign: "center" }}>
                Upload your owner CSV to get started
              </p>
            </div>
          )}

          {/* Leads table */}
          {hasRows && (
            <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}>
              {/* Header */}
              <div
                className="grid px-3 py-1.5"
                style={{ gridTemplateColumns: "1fr 1fr 88px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}
              >
                {["Name", "Property", ""].map(h => (
                  <span key={h} style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AEAEB2" }}>{h}</span>
                ))}
              </div>
              {/* Rows */}
              {FAKE_LEADS.map((lead, i) => (
                <div
                  key={lead.name}
                  className="grid px-3 items-center"
                  style={{
                    gridTemplateColumns: "1fr 1fr 88px",
                    height: 40,
                    borderBottom: i < 2 ? "1px solid rgba(0,0,0,0.05)" : "none",
                    opacity: hasRows ? 1 : 0,
                    transform: hasRows ? "translateY(0)" : "translateY(6px)",
                    transition: `opacity 0.35s ease ${i * 160}ms, transform 0.35s ease ${i * 160}ms`,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#1C1C1E" }}>{lead.name}</span>
                  <span style={{ fontSize: 11, color: "#6C6C70" }}>{lead.prop}</span>

                  {/* Action: WhatsApp or Sent */}
                  {i === 0 && showSent ? (
                    <div
                      className="flex items-center gap-1 px-2 py-1 rounded-lg"
                      style={{ background: "rgba(52,199,89,0.12)", fontSize: 11, fontWeight: 600, color: "#1F8B4C", width: "fit-content" }}
                    >
                      <Check style={{ width: 11, height: 11 }} /> Sent
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-1 px-2 py-1 rounded-lg"
                      style={{
                        background: i === 0 && waHover ? "#25D366" : "rgba(37,211,102,0.10)",
                        color: i === 0 && waHover ? "#fff" : "#1F8B4C",
                        fontSize: 11,
                        fontWeight: 600,
                        transform: i === 0 && waClick ? "scale(0.92)" : "scale(1)",
                        transition: "all 0.12s ease",
                        width: "fit-content",
                      }}
                    >
                      <MessageCircle style={{ width: 11, height: 11 }} />
                      WhatsApp
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Animated cursor ── */}
        <div
          style={{
            position: "absolute",
            left: cur.x,
            top: cur.y,
            pointerEvents: "none",
            zIndex: 20,
            transition: "left 0.65s cubic-bezier(0.33,1,0.68,1), top 0.65s cubic-bezier(0.33,1,0.68,1)",
          }}
        >
          {(uploadClick || waClick) && (
            <div style={{
              position: "absolute",
              width: 30, height: 30, left: -6, top: -6,
              borderRadius: "50%",
              background: "rgba(0,122,255,0.18)",
              animation: "kk-demo-click 0.45s ease-out forwards",
            }} />
          )}
          <svg width="18" height="22" viewBox="0 0 18 22" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.35))" }}>
            <path d="M2 1L2 17L6 12.5L9.5 20.5L11.5 19.5L8 11.5L13.5 11.5Z" fill="white" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* ── Caption ── */}
      <p
        className="mt-4 text-center"
        style={{ fontSize: 14, color: "#3C3C3E", minHeight: 22, transition: "opacity 0.3s" }}
      >
        {PHASES[idx].caption}
      </p>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function OnboardingDemoModal() {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

  const openModal = useCallback(() => {
    setOpen(true);
    setPlaying(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setPlaying(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }, []);

  // Listen for the event (dispatched by "Getting Started" button)
  useEffect(() => {
    document.addEventListener(DEMO_EVENT, openModal);
    return () => document.removeEventListener(DEMO_EVENT, openModal);
  }, [openModal]);

  // First-time login: auto-open if not seen before
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setTimeout(openModal, 600);
    }
  }, [openModal]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={close}
    >
      <div
        className="relative rounded-2xl p-6"
        style={{ background: "#fff", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", maxWidth: 580, width: "100%" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={close}
          className="absolute top-4 right-4 flex items-center justify-center rounded-full"
          style={{ width: 32, height: 32, background: "#F2F2F7", color: "#6C6C70" }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: "#F2F2F7", color: "#6C6C70" }}
            >
              Module 1 of 3
            </span>
            {/* Module dots */}
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="rounded-full"
                  style={{ width: i === 0 ? 20 : 7, height: 7, background: i === 0 ? "#1C1C1E" : "#E5E5EA", transition: "width 0.3s" }}
                />
              ))}
            </div>
          </div>
          <h2 className="font-bold" style={{ fontSize: 20, color: "#1C1C1E", letterSpacing: "-0.02em" }}>
            Import leads & send outreach
          </h2>
        </div>

        {/* Demo scene */}
        <DemoScene active={playing} />

        {/* Footer */}
        <div className="flex items-center justify-between mt-5">
          <button
            onClick={close}
            style={{ fontSize: 13, color: "#AEAEB2", background: "none", border: "none", cursor: "pointer" }}
          >
            Skip for now
          </button>
          <div className="flex gap-2">
            <button
              disabled
              className="px-4 py-2 rounded-full"
              style={{ fontSize: 13, fontWeight: 600, background: "#F2F2F7", color: "#AEAEB2", cursor: "not-allowed" }}
              title="Coming soon"
            >
              Next module →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
