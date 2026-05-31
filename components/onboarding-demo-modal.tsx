"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  X, Upload, MessageCircle, Check, Download,
  FileSpreadsheet, ChevronDown, RefreshCw, Send, ArrowRight,
} from "lucide-react";

export const DEMO_EVENT = "kk:open-demo";
const STORAGE_KEY = "kk_demo_seen_v1";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Phase {
  id: string;
  ms: number;
  caption: string;
}
type XY = { x: number; y: number };

// ─── Phase cycle hook ──────────────────────────────────────────────────────────

function usePhaseCycle(phases: Phase[], active: boolean) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active) { setIdx(0); return; }
    const t = setTimeout(() => setIdx(i => (i + 1) % phases.length), phases[idx].ms);
    return () => clearTimeout(t);
  }, [idx, active, phases]);
  return { idx, phase: phases[idx].id, caption: phases[idx].caption };
}

// ─── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ phases, idx }: { phases: Phase[]; idx: number }) {
  const total  = phases.reduce((s, p) => s + p.ms, 0);
  const cumS   = phases.slice(0, idx).reduce((s, p) => s + p.ms, 0);
  const cumE   = cumS + phases[idx].ms;
  const pct    = (ms: number) => (ms / total) * 100;

  const [width, setWidth]   = useState(pct(cumS));
  const [anim,  setAnim]    = useState(false);
  const r1 = useRef<number>(0);
  const r2 = useRef<number>(0);

  useEffect(() => {
    setAnim(false);
    setWidth(pct(cumS));
    r1.current = requestAnimationFrame(() => {
      r2.current = requestAnimationFrame(() => { setAnim(true); setWidth(pct(cumE)); });
    });
    return () => { cancelAnimationFrame(r1.current); cancelAnimationFrame(r2.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(0,0,0,0.07)" }}>
      <div style={{
        height: "100%", background: "#007AFF", width: `${width}%`,
        transition: anim ? `width ${phases[idx].ms}ms linear` : "none",
        borderRadius: "0 2px 2px 0",
      }} />
    </div>
  );
}

// ─── Static value prop banner ──────────────────────────────────────────────────

function ValuePropBanner({ text }: { text: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: "rgba(0,122,255,0.07)",
      border: "1px solid rgba(0,122,255,0.20)",
      borderRadius: 20, padding: "5px 14px",
      fontSize: 12, fontWeight: 600, color: "#007AFF",
      marginTop: 8,
    }}>
      ✦ {text}
    </div>
  );
}

// ─── Shared atoms ──────────────────────────────────────────────────────────────

function FakeNav({ active }: { active: "new-owners" | "contracts" }) {
  return (
    <div className="flex items-center gap-2 px-4" style={{ height: 34, background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
      <div className="w-[18px] h-[18px] rounded flex items-center justify-center font-bold" style={{ background: "#1C1C1E", color: "#fff", fontSize: 10 }}>K</div>
      <span style={{ fontWeight: 600, fontSize: 12, color: "#1C1C1E" }}>kakisewa</span>
      <div className="flex gap-3 ml-3">
        {(["Home", "New Owners", "Contracts"] as const).map(l => {
          const on = (active === "new-owners" && l === "New Owners") || (active === "contracts" && l === "Contracts");
          return <span key={l} style={{ fontSize: 11, fontWeight: on ? 600 : 400, color: on ? "#1C1C1E" : "#AEAEB2" }}>{l}</span>;
        })}
      </div>
    </div>
  );
}

function DemoCursor({ x, y, clicking, hidden }: { x: number; y: number; clicking: boolean; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <div style={{
      position: "absolute", left: x, top: y, pointerEvents: "none", zIndex: 20,
      transition: "left 0.9s cubic-bezier(0.33,1,0.68,1), top 0.9s cubic-bezier(0.33,1,0.68,1)",
    }}>
      {clicking && (
        <div style={{
          position: "absolute", width: 30, height: 30, left: -6, top: -6,
          borderRadius: "50%", background: "rgba(0,122,255,0.18)",
          animation: "kk-demo-click 0.45s ease-out forwards",
        }} />
      )}
      <svg width="18" height="22" viewBox="0 0 18 22" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.35))" }}>
        <path d="M2 1L2 17L6 12.5L9.5 20.5L11.5 19.5L8 11.5L13.5 11.5Z" fill="white" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function SceneFrame({ children, phases, idx }: {
  children: React.ReactNode; phases: Phase[]; idx: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl" style={{ width: 520, height: 270, background: "#F2F2F7", userSelect: "none", flexShrink: 0 }}>
      {children}
      <ProgressBar phases={phases} idx={idx} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 1 — Import leads, download bulk-send sheet, one-by-one WA
// ═══════════════════════════════════════════════════════════════════════════════

const M1: Phase[] = [
  { id: "idle",          ms: 1000, caption: "Your New Owners dashboard — where outreach begins." },
  { id: "to-upload",     ms:  900, caption: "Start by uploading your owner leads as a CSV." },
  { id: "hover-upload",  ms:  700, caption: "One click imports your whole list instantly." },
  { id: "click-upload",  ms:  500, caption: "Importing..." },
  { id: "rows-in",       ms: 1600, caption: "3 leads imported — each gets a personalised intake link." },
  { id: "to-export",     ms:  900, caption: "Now download the outreach sheet for WhatsApp bulk send." },
  { id: "hover-export",  ms:  700, caption: "Excel — 2 sheets: owner list + pre-filled message template." },
  { id: "click-export",  ms:  500, caption: "Choosing Excel..." },
  { id: "hover-excel",   ms: 1400, caption: "Sheet 2 has phone numbers + pre-filled messages. Load into WA Business." },
  { id: "dl-done",       ms: 1600, caption: "File downloaded. Drop it into WhatsApp bulk send and you're done." },
  { id: "to-wa",         ms:  900, caption: "Or reach owners one-by-one with a personal link." },
  { id: "hover-wa",      ms:  700, caption: "Message pre-filled with their name and your details." },
  { id: "click-wa",      ms:  500, caption: "Opening WhatsApp..." },
  { id: "sent",          ms: 1800, caption: "✓ Ms Koo receives a personalised link instantly." },
  { id: "end",           ms: 1000, caption: "Import → bulk export → personal outreach. All in one place." },
];

// Frame 520×270. Nav h=34. Content px-5(20) pt-4(16) → y=50.
// Header buttons center y=63.
//   Export center x=456. Upload CSV center x=358.
// Export dropdown top≈80. Excel item center y≈102, x≈385.
// Table: y=88. Header h=22. Row1 center y=130.
// Col3 (88px) starts x=412 → WA center x=456.

const M1_CUR: Record<string, XY> = {
  idle:           { x: 260, y: 135 },
  "to-upload":    { x: 358, y: 63 },
  "hover-upload": { x: 358, y: 63 },
  "click-upload": { x: 358, y: 63 },
  "rows-in":      { x: 358, y: 63 },
  "to-export":    { x: 456, y: 63 },
  "hover-export": { x: 456, y: 63 },
  "click-export": { x: 456, y: 63 },
  "hover-excel":  { x: 385, y: 102 },
  "dl-done":      { x: 456, y: 63 },
  "to-wa":        { x: 456, y: 130 },
  "hover-wa":     { x: 456, y: 130 },
  "click-wa":     { x: 456, y: 130 },
  sent:           { x: 456, y: 130 },
  end:            { x: 260, y: 135 },
};

const LEADS = [
  { name: "Ms Koo",       prop: "The Park · A5905" },
  { name: "Ahmad Rashid", prop: "Bloomsvale" },
  { name: "Lily Chan",    prop: "Vista Damai" },
];

function Scene1({ active }: { active: boolean }) {
  const { idx, phase, caption } = usePhaseCycle(M1, active);
  const cur = M1_CUR[phase] ?? { x: 260, y: 135 };

  const hasRows   = !["idle", "to-upload", "hover-upload", "click-upload"].includes(phase);
  const uploadHov = phase === "hover-upload" || phase === "click-upload";
  const uploadClk = phase === "click-upload";
  const exportHov = ["hover-export", "click-export", "hover-excel", "dl-done"].includes(phase);
  const dropOpen  = ["click-export", "hover-excel", "dl-done"].includes(phase);
  const excelHov  = phase === "hover-excel" || phase === "dl-done";
  const waHov     = phase === "hover-wa" || phase === "click-wa";
  const waClk     = phase === "click-wa";
  const showSent  = phase === "sent" || phase === "end";
  const clicking  = uploadClk || waClk || phase === "click-export";

  return (
    <div>
      <SceneFrame phases={M1} idx={idx}>
        <FakeNav active="new-owners" />
        <div className="px-5 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontWeight: 700, fontSize: 15, color: "#1C1C1E" }}>New Owners</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{
                fontSize: 11, fontWeight: 600,
                background: uploadHov ? "#1C1C1E" : "#fff",
                color: uploadHov ? "#fff" : "#1C1C1E",
                border: "1px solid rgba(0,0,0,0.12)",
                transform: uploadClk ? "scale(0.95)" : "scale(1)",
                transition: "all 0.15s",
              }}>
                <Upload style={{ width: 11, height: 11 }} />
                Upload CSV
              </div>
              <div className="relative">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{
                  fontSize: 11, fontWeight: 600,
                  background: exportHov ? "#1C1C1E" : "#fff",
                  color: exportHov ? "#fff" : "#1C1C1E",
                  border: "1px solid rgba(0,0,0,0.12)",
                  transition: "all 0.15s",
                }}>
                  <Download style={{ width: 11, height: 11 }} />
                  Export
                  <ChevronDown style={{ width: 9, height: 9, opacity: 0.6 }} />
                </div>
                {dropOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 10,
                    background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)", minWidth: 200, overflow: "hidden",
                  }}>
                    <div className="flex items-start gap-2 px-3 py-2.5" style={{
                      borderBottom: "1px solid rgba(0,0,0,0.07)",
                      background: excelHov ? "#F2F2F7" : "transparent",
                    }}>
                      <FileSpreadsheet style={{ width: 14, height: 14, marginTop: 1, color: "#34C759", flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#1C1C1E" }}>Excel (.xlsx)</p>
                        <p style={{ fontSize: 10, color: "#6C6C70" }}>Owners + WA message template</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 px-3 py-2.5">
                      <FileSpreadsheet style={{ width: 14, height: 14, marginTop: 1, color: "#AEAEB2", flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#1C1C1E" }}>CSV (.csv)</p>
                        <p style={{ fontSize: 10, color: "#6C6C70" }}>Compatible with Google Sheets</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!hasRows && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl" style={{ height: 168, background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}>
              <div className="flex items-center justify-center rounded-full" style={{ width: 36, height: 36, background: "#F2F2F7" }}>
                <Upload style={{ width: 16, height: 16, color: "#AEAEB2" }} />
              </div>
              <p style={{ fontSize: 11, color: "#AEAEB2" }}>Upload your owner CSV to get started</p>
            </div>
          )}

          {hasRows && (
            <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}>
              <div className="grid px-3 py-1.5" style={{ gridTemplateColumns: "1fr 1fr 88px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                {["Name", "Property", ""].map(h => (
                  <span key={h} style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AEAEB2" }}>{h}</span>
                ))}
              </div>
              {LEADS.map((lead, i) => (
                <div key={lead.name} className="grid px-3 items-center" style={{
                  gridTemplateColumns: "1fr 1fr 88px", height: 40,
                  borderBottom: i < 2 ? "1px solid rgba(0,0,0,0.05)" : "none",
                }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#1C1C1E" }}>{lead.name}</span>
                  <span style={{ fontSize: 11, color: "#6C6C70" }}>{lead.prop}</span>
                  {i === 0 && showSent ? (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "rgba(52,199,89,0.12)", fontSize: 11, fontWeight: 600, color: "#1F8B4C", width: "fit-content" }}>
                      <Check style={{ width: 11, height: 11 }} /> Sent
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{
                      background: i === 0 && waHov ? "#25D366" : "rgba(37,211,102,0.10)",
                      color: i === 0 && waHov ? "#fff" : "#1F8B4C",
                      fontSize: 11, fontWeight: 600,
                      transform: i === 0 && waClk ? "scale(0.92)" : "scale(1)",
                      transition: "all 0.12s", width: "fit-content",
                    }}>
                      <MessageCircle style={{ width: 11, height: 11 }} />
                      WhatsApp
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <DemoCursor x={cur.x} y={cur.y} clicking={clicking} />
      </SceneFrame>
      <p className="text-center mt-2" style={{ fontSize: 13, color: "#6C6C70", minHeight: 20 }}>
        {caption}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 2 — Owner fills chat intake → pipeline updated → tenant pack sent
// ═══════════════════════════════════════════════════════════════════════════════

const M2: Phase[] = [
  { id: "idle",           ms: 1100, caption: "Owner opens your link — a chat guides them in 60 seconds." },
  { id: "q1-type",        ms: 1100, caption: "They type the property name and unit..." },
  { id: "q1-send",        ms:  600, caption: "Hit send." },
  { id: "q2-show",        ms: 1000, caption: "Next: expected monthly rent." },
  { id: "q2-type",        ms:  900, caption: "RM 2,500 — captured in your dashboard instantly." },
  { id: "q2-send",        ms:  600, caption: "Sent." },
  { id: "q3-show",        ms: 1000, caption: "Bedrooms — tap a choice, no typing needed." },
  { id: "q3-click",       ms:  600, caption: "3 bedrooms selected." },
  { id: "done",           ms: 1400, caption: "✓ All details submitted. You're notified the moment they finish." },
  { id: "agent-view",     ms: 1400, caption: "Lead moves to 'Wants Rent'. Details pre-filled for you." },
  { id: "to-pack",        ms:  900, caption: "Ahmad's details are captured. Time to find him tenants." },
  { id: "hover-pack",     ms:  700, caption: "Send him a curated tenant shortlist with one click." },
  { id: "click-pack",     ms:  500, caption: "Sending tenant pack..." },
  { id: "pack-preview",   ms: 2000, caption: "Ahmad receives a shortlist of vetted tenants instantly." },
  { id: "pack-sent",      ms:  900, caption: "✓ Tenant pack delivered. Reply tracked when Ahmad responds." },
  { id: "end",            ms:  900, caption: "Owner fills form → you track it → tenant pack sent. All automatic." },
];

// Frame 520×270. Dark header h=40. Chat h=182 (y=40..222). Input h=48 (y=222..270).
// Input text center: x=210, y=246. Send button: x=490, y=246.
// "3" bedroom chip: x=230, y=190.
// Pipeline right col center x≈382. Content x=274..490.
//   Wants Rent label (9px, mb:8) → y=92+13+8=113. Card padding-top 8 → y=121.
//   Name 15px → y=136. mt:2 property → y=150. mt:3 rent → y=169.
//   "Send tenant pack" mt-2(8px) py-1.5(6px) 14px content → center y=177+13=190.
// Tenant pack view left card center: x=138, y=135.

const M2_CUR: Record<string, XY> = {
  idle:             { x: 210, y: 246 },
  "q1-type":        { x: 210, y: 246 },
  "q1-send":        { x: 490, y: 246 },
  "q2-show":        { x: 210, y: 246 },
  "q2-type":        { x: 210, y: 246 },
  "q2-send":        { x: 490, y: 246 },
  "q3-show":        { x: 210, y: 246 },
  "q3-click":       { x: 230, y: 190 },
  done:             { x: 260, y: 155 },
  "agent-view":     { x: 382, y: 110 },
  "to-pack":        { x: 382, y: 190 },
  "hover-pack":     { x: 382, y: 190 },
  "click-pack":     { x: 382, y: 190 },
  "pack-preview":   { x: 138, y: 135 },
  "pack-sent":      { x: 260, y: 135 },
  end:              { x: 260, y: 135 },
};

function AgentBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[78%] px-3 py-1.5 text-[12px] leading-snug" style={{
        background: "#fff", color: "#111",
        borderRadius: "0 12px 12px 12px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.10)",
      }}>{text}</div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%] px-3 py-1.5 text-[12px] leading-snug" style={{
        background: "#E5E5EA", color: "#111",
        borderRadius: "12px 0 12px 12px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
      }}>{text}</div>
    </div>
  );
}

function Scene2({ active }: { active: boolean }) {
  const { idx, phase, caption } = usePhaseCycle(M2, active);
  const cur = M2_CUR[phase] ?? { x: 210, y: 246 };

  const pipelinePhases   = ["agent-view", "to-pack", "hover-pack", "click-pack"];
  const tenantPackPhases = ["pack-preview", "pack-sent", "end"];
  const showAgent      = pipelinePhases.includes(phase);
  const showTenantPack = tenantPackPhases.includes(phase);
  const isDone         = ["done", ...pipelinePhases, ...tenantPackPhases].includes(phase);

  const a1Done    = !["idle", "q1-type", "q1-send"].includes(phase);
  const a2Done    = !["idle", "q1-type", "q1-send", "q2-show", "q2-type", "q2-send"].includes(phase);
  const a3Done    = isDone;
  const showQ3    = a2Done;
  const showChoices = ["q3-show", "q3-click"].includes(phase);
  const choice3Hov  = phase === "q3-click";

  const packHov = ["hover-pack", "click-pack"].includes(phase);
  const packClk = phase === "click-pack";

  const inputText =
    phase === "q1-type" ? "Residensi Mutiara · Block A" :
    (phase === "q2-type" || phase === "q2-send") ? "2,500" : "";
  const inputPlaceholder = a2Done ? "" : a1Done ? "e.g. 2500" : "Type a reply…";
  const cursorAtSend = phase === "q1-send" || phase === "q2-send";
  const showInput    = !isDone;
  const clicking     = phase === "q3-click" || packClk;

  type Msg = { id: string; side: "agent" | "user"; text: string };
  const msgs: Msg[] = [];
  msgs.push({ id: "g",  side: "agent", text: "Hi! I'm Ahmad from Kakisewa Properties." });
  msgs.push({ id: "q1", side: "agent", text: "What's your property name & unit?" });
  if (a1Done) msgs.push({ id: "a1", side: "user",  text: "Residensi Mutiara · Block A" });
  if (a1Done) msgs.push({ id: "q2", side: "agent", text: "What's your expected rent (RM/mo)?" });
  if (a2Done) msgs.push({ id: "a2", side: "user",  text: "RM 2,500" });
  if (showQ3)  msgs.push({ id: "q3", side: "agent", text: "How many bedrooms?" });
  if (a3Done)  msgs.push({ id: "a3", side: "user",  text: "3 bedrooms" });
  if (isDone)  msgs.push({ id: "dn", side: "agent", text: "✓ Got it! I'll send you tenant shortlists shortly." });
  const visible = msgs.slice(-5);

  return (
    <div>
      <SceneFrame phases={M2} idx={idx}>
        {/* Dark chat header */}
        <div className="flex items-center gap-2 px-3" style={{ height: 40, background: "#1C1C1E" }}>
          <div className="w-[16px] h-[16px] rounded flex items-center justify-center font-bold" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 9 }}>K</div>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)" }} />
          <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px]" style={{ background: "#48484A", color: "#fff", flexShrink: 0 }}>A</div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>Ahmad</p>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", lineHeight: 1.2 }}>Kakisewa Properties</p>
          </div>
        </div>

        {!showAgent ? (
          <>
            <div className="flex flex-col justify-end gap-1.5 px-4 py-2 overflow-hidden" style={{ height: 182 }}>
              {visible.map(m =>
                m.side === "agent"
                  ? <AgentBubble key={m.id} text={m.text} />
                  : <UserBubble  key={m.id} text={m.text} />
              )}
              {showChoices && (
                <div className="flex justify-center gap-2 mt-1">
                  {["2", "3", "4", "5+"].map(n => (
                    <div key={n} className="px-3 py-1 rounded-full text-[12px] font-medium" style={{
                      background: (n === "3" && choice3Hov) ? "#1C1C1E" : "#fff",
                      color: (n === "3" && choice3Hov) ? "#fff" : "#1C1C1E",
                      border: "1.5px solid #C7C7CC",
                      transform: (n === "3" && choice3Hov) ? "scale(0.95)" : "scale(1)",
                      transition: "all 0.15s",
                    }}>{n}</div>
                  ))}
                </div>
              )}
            </div>
            {showInput && (
              <div className="flex items-center gap-2 px-3" style={{ height: 48, background: "#fff", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                <div className="flex-1 px-4 rounded-full text-[12px]" style={{
                  background: "#F2F2F7", color: inputText ? "#1C1C1E" : "#AEAEB2",
                  height: 32, display: "flex", alignItems: "center",
                }}>
                  {inputText || inputPlaceholder}
                </div>
                <div className="flex items-center justify-center rounded-full" style={{
                  width: 32, height: 32, background: "#1C1C1E", flexShrink: 0,
                  transform: cursorAtSend ? "scale(0.92)" : "scale(1)", transition: "transform 0.1s",
                }}>
                  <Send style={{ width: 14, height: 14, color: "#fff" }} />
                </div>
              </div>
            )}
          </>
        ) : showAgent ? (
          /* ── Pipeline view ── */
          <div className="px-5 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontWeight: 700, fontSize: 15, color: "#1C1C1E" }}>New Owners</span>
              <span style={{ fontSize: 10, color: "#AEAEB2" }}>Pipeline</span>
            </div>
            <div className="flex gap-2">
              <div style={{ flex: 1, background: "#fff", borderRadius: 10, border: "1px solid rgba(0,0,0,0.07)", padding: "8px 10px" }}>
                <p style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#AEAEB2", marginBottom: 8 }}>Outreach</p>
                <div style={{ height: 58, borderRadius: 8, background: "#F2F2F7", border: "1px dashed rgba(0,0,0,0.08)" }} />
              </div>
              <div style={{ flex: 1, background: "#fff", borderRadius: 10, border: "1px solid rgba(52,199,89,0.25)", padding: "8px 10px" }}>
                <p style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#1F8B4C", marginBottom: 8 }}>Wants Rent ✓</p>
                <div style={{
                  borderRadius: 8, background: "#fff",
                  border: "1px solid rgba(52,199,89,0.3)",
                  boxShadow: "0 2px 8px rgba(52,199,89,0.12)",
                  padding: "8px 10px",
                  animation: "kk-demo-card-in 0.45s ease-out forwards",
                }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#1C1C1E" }}>Ahmad Rashid</p>
                  <p style={{ fontSize: 10, color: "#6C6C70", marginTop: 2 }}>Residensi Mutiara · Block A</p>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "#1F8B4C", marginTop: 3 }}>RM 2,500/mo · 3 beds</p>
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-full mt-2" style={{
                    background: packHov ? "rgba(0,122,255,0.14)" : "rgba(0,122,255,0.08)",
                    border: packHov ? "1px solid rgba(0,122,255,0.28)" : "1px solid transparent",
                    transform: packClk ? "scale(0.95)" : "scale(1)",
                    transition: "all 0.15s",
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#0066CC" }}>Send tenant pack</span>
                    <Send style={{ width: 10, height: 10, color: "#007AFF" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : showTenantPack ? (
          /* ── Tenant pack sample ── */
          <div className="px-5 pt-3">
            <div className="flex items-center justify-between mb-1">
              <span style={{ fontWeight: 700, fontSize: 14, color: "#1C1C1E" }}>Tenant Pack</span>
              <div className="flex items-center gap-1" style={{
                background: "rgba(52,199,89,0.12)", borderRadius: 20,
                padding: "3px 10px", fontSize: 10, fontWeight: 600, color: "#1F8B4C",
              }}>
                <Check style={{ width: 10, height: 10 }} />
                Sent to Ahmad ✓
              </div>
            </div>
            <p style={{ fontSize: 10, color: "#AEAEB2", marginBottom: 10 }}>
              Shortlisted · Residensi Mutiara · 3 beds · RM 2,500/mo
            </p>
            <div className="flex gap-2">
              {/* Tenant 1 */}
              <div style={{
                flex: 1, background: "#fff", borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.08)", padding: "10px 12px",
                animation: "kk-demo-card-in 0.4s ease-out forwards",
              }}>
                <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", background: "#E5E5EA",
                    flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: "#6C6C70",
                  }}>P</div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#1C1C1E" }}>Priya Sharma</p>
                    <p style={{ fontSize: 9, color: "#6C6C70" }}>Software Engineer</p>
                  </div>
                </div>
                <p style={{ fontSize: 10, color: "#1C1C1E" }}>Budget <strong>RM 2,800/mo</strong></p>
                <p style={{ fontSize: 9, color: "#AEAEB2", marginTop: 2 }}>Verified income · No pets</p>
              </div>
              {/* Tenant 2 */}
              <div style={{
                flex: 1, background: "#fff", borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.08)", padding: "10px 12px",
                animation: "kk-demo-card-in 0.4s ease-out 0.12s both",
              }}>
                <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", background: "#E5E5EA",
                    flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: "#6C6C70",
                  }}>L</div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#1C1C1E" }}>Lee Chong Wei</p>
                    <p style={{ fontSize: 9, color: "#6C6C70" }}>Marketing Manager</p>
                  </div>
                </div>
                <p style={{ fontSize: 10, color: "#1C1C1E" }}>Budget <strong>RM 2,600/mo</strong></p>
                <p style={{ fontSize: 9, color: "#AEAEB2", marginTop: 2 }}>Verified income · 1 pet (cat)</p>
              </div>
            </div>
          </div>
        ) : null}

        <DemoCursor x={cur.x} y={cur.y} clicking={clicking} hidden={phase === "done"} />
      </SceneFrame>
      <p className="text-center mt-2" style={{ fontSize: 13, color: "#6C6C70", minHeight: 20 }}>
        {caption}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 3 — Expiring contract → notify owner → card moves to Renewing
// Matches the real lifecycle board: EXPIRING column (salmon border), card with
// pill action rows ("Send rent reminder", "Notify owner"), RENEWING column.
// ═══════════════════════════════════════════════════════════════════════════════
//
// Frame 520×270. Nav h=34. Content: flex gap-2 px-3 pt-2 → starts y=42.
// EXPIRING col: x=12..307 (w=295). Header py-2 ≈ h=42 → ends y=84.
// Card body p-3: card starts y=84+12=96. Card inner p-3: top y=96+12=108.
//   Name row: y=108 h=15px mb-1(4px) → y=127.
//   Property: y=127 h=11px mb-2(8px) → y=146.
//   "Send rent reminder" pill: y=146 h=26px mb-1.5(6px) → y=178.
//   "Notify owner" pill: y=178 h=26px → center y=191.
// RENEWING col: x=315..508 (w=193). Card center x≈411, y≈155.

const M3: Phase[] = [
  { id: "idle",           ms: 1100, caption: "Contracts expiring soon appear here — nothing to remember." },
  { id: "show-card",      ms: 2000, caption: "60 days until Fikri Ibrahim's lease ends. Kakisewa flags it automatically." },
  { id: "to-notify-o",   ms:  900, caption: "Tap Notify Owner first — do they still want to rent it out?" },
  { id: "hover-notify-o", ms:  700, caption: "WhatsApp opens with an owner renewal form pre-filled." },
  { id: "click-notify-o", ms:  500, caption: "Sending to owner..." },
  { id: "owner-yes",      ms: 2000, caption: "Owner replied Yes — still wants to rent. You didn't make a single call." },
  { id: "renewing",       ms: 2200, caption: "Card moves to Renewing. Commission and new end date are recorded." },
  { id: "end",            ms: 1000, caption: "Zero chasing. Every renewal handled in two taps." },
];

const M3_CUR: Record<string, XY> = {
  idle:              { x: 165, y: 160 },
  "show-card":       { x: 165, y: 145 },
  "to-notify-o":     { x: 165, y: 191 },
  "hover-notify-o":  { x: 165, y: 191 },
  "click-notify-o":  { x: 165, y: 191 },
  "owner-yes":       { x: 165, y: 191 },
  renewing:          { x: 411, y: 155 },
  end:               { x: 165, y: 160 },
};

function ActionRow({ icon, label, color, bgColor, hovered, clicked }: {
  icon: React.ReactNode; label: string;
  color: string; bgColor: string;
  hovered?: boolean; clicked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-full" style={{
      background: hovered ? bgColor.replace("0.09", "0.18").replace("0.08", "0.16") : bgColor,
      transform: clicked ? "scale(0.97)" : "scale(1)",
      transition: "all 0.15s",
    }}>
      <div className="flex items-center gap-2">
        {icon}
        <span style={{ fontSize: 10, fontWeight: 600, color }}>{label}</span>
      </div>
      <ArrowRight style={{ width: 10, height: 10, color, opacity: 0.7 }} />
    </div>
  );
}

function Scene3({ active }: { active: boolean }) {
  const { idx, phase, caption } = usePhaseCycle(M3, active);
  const cur = M3_CUR[phase] ?? { x: 165, y: 160 };

  const ownerYes  = ["owner-yes", "renewing", "end"].includes(phase);
  const isRenewing = phase === "renewing" || phase === "end";

  const notifyOHov = ["hover-notify-o", "click-notify-o"].includes(phase) && !ownerYes;
  const notifyOClk = phase === "click-notify-o";
  const clicking   = notifyOClk;
  const cardPulse  = phase === "show-card";

  return (
    <div>
      <SceneFrame phases={M3} idx={idx}>
        <FakeNav active="contracts" />

        {/* Two-column layout matching real lifecycle board */}
        <div className="flex gap-2 px-3 pt-2" style={{ height: 236 }}>

          {/* EXPIRING column */}
          <div style={{
            width: 295, flexShrink: 0,
            border: `2px solid rgba(244,81,30,${cardPulse ? "0.45" : "0.22"})`,
            borderRadius: 14, background: "#fff", overflow: "hidden",
            transition: "border-color 0.4s",
          }}>
            {/* Column header */}
            <div className="px-3 py-2" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#C03810" }}>
                  ⚠ Expiring
                </span>
                <div style={{
                  width: 16, height: 16, borderRadius: "50%",
                  background: "#F4511E", color: "#fff",
                  fontSize: 9, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>1</div>
              </div>
              <p style={{ fontSize: 9, color: "#AEAEB2" }}>
                Expires soon. Use &apos;What&apos;s next?&apos; on the card to choose the outcome.
              </p>
            </div>

            {/* Card (visible while not yet renewing) */}
            {!isRenewing ? (
              <div className="p-3">
                <div style={{
                  borderRadius: 12,
                  border: cardPulse ? "1.5px solid rgba(244,81,30,0.4)" : "1px solid rgba(0,0,0,0.08)",
                  padding: "10px 12px",
                  boxShadow: cardPulse ? "0 0 0 3px rgba(244,81,30,0.07)" : "0 1px 4px rgba(0,0,0,0.06)",
                  background: "#fff",
                  transition: "border 0.4s, box-shadow 0.4s",
                }}>
                  {/* Name + expiry */}
                  <div className="flex items-start justify-between mb-1">
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1C1C1E" }}>Fikri Ibrahim</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: "#F4511E",
                      background: "rgba(244,81,30,0.10)", borderRadius: 6,
                      padding: "2px 6px", flexShrink: 0, marginLeft: 6,
                      animation: cardPulse ? "kk-pulse-subtle 1.1s ease-in-out infinite" : "none",
                    }}>60d</span>
                  </div>

                  <p style={{ fontSize: 10, color: "#6C6C70", marginBottom: 8 }}>
                    The Park · Unit A5905 · exp Jul 30, 2026
                  </p>

                  {/* Reply chips (appear after owner confirms) */}
                  {ownerYes && (
                    <div className="flex gap-3 mb-2">
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#1F8B4C" }}>Owner ✓</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#1F8B4C" }}>Tenant ✓</span>
                    </div>
                  )}

                  {/* Send rent reminder */}
                  <div className="mb-1.5">
                    <ActionRow
                      icon={<div style={{ width: 13, height: 13, borderRadius: "50%", border: "1.5px solid #34C759" }} />}
                      label="Send rent reminder"
                      color="#1F8B4C"
                      bgColor="rgba(52,199,89,0.09)"
                    />
                  </div>

                  {/* Notify owner / Confirmed state */}
                  {!ownerYes ? (
                    <div className="mb-1.5">
                      <ActionRow
                        icon={<div style={{ width: 13, height: 13, borderRadius: "50%", border: "1.5px solid #007AFF" }} />}
                        label="Notify owner"
                        color="#0066CC"
                        bgColor="rgba(0,122,255,0.08)"
                        hovered={notifyOHov}
                        clicked={notifyOClk}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full mb-1.5" style={{ background: "rgba(52,199,89,0.09)" }}>
                      <Check style={{ width: 12, height: 12, color: "#34C759" }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#1F8B4C" }}>Owner confirmed ✓</span>
                    </div>
                  )}

                  {/* What's next */}
                  <div className="inline-flex items-center gap-1" style={{
                    padding: "3px 8px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)",
                    fontSize: 10, color: "#6C6C70",
                  }}>
                    What&apos;s next?
                    <ChevronDown style={{ width: 9, height: 9 }} />
                  </div>
                </div>
              </div>
            ) : (
              /* Empty state after card moves to Renewing */
              <div className="flex flex-col items-center justify-center gap-1" style={{ height: 140 }}>
                <RefreshCw style={{ width: 16, height: 16, color: "#34C759" }} />
                <p style={{ fontSize: 10, color: "#34C759", fontWeight: 600 }}>Moved to Renewing</p>
              </div>
            )}
          </div>

          {/* RENEWING column */}
          <div style={{
            flex: 1,
            border: isRenewing ? "2px solid rgba(52,199,89,0.35)" : "1px solid rgba(0,0,0,0.08)",
            borderRadius: 14, background: "#fff", overflow: "hidden",
            transition: "border 0.5s",
          }}>
            <div className="px-3 py-2" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#1F8B4C" }}>
                  ✓ Renewing
                </span>
                <div style={{
                  width: 16, height: 16, borderRadius: "50%",
                  background: isRenewing ? "#34C759" : "#E5E5EA",
                  color: isRenewing ? "#fff" : "#6C6C70",
                  fontSize: 9, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.4s",
                }}>{isRenewing ? "1" : "0"}</div>
              </div>
              <p style={{ fontSize: 9, color: "#AEAEB2" }}>Both confirmed. Collect commission and set the new end date.</p>
            </div>

            {isRenewing && (
              <div className="p-2">
                <div style={{
                  borderRadius: 12, border: "1px solid rgba(52,199,89,0.25)",
                  padding: "10px 10px", background: "#fff",
                  boxShadow: "0 2px 8px rgba(52,199,89,0.12)",
                  animation: "kk-demo-card-in 0.5s ease-out forwards",
                }}>
                  <div className="flex items-start justify-between mb-1">
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#1C1C1E" }}>Fikri Ibrahim</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#34C759", background: "rgba(52,199,89,0.1)", borderRadius: 5, padding: "2px 5px" }}>✓</span>
                  </div>
                  <p style={{ fontSize: 9, color: "#6C6C70", marginBottom: 8 }}>The Park · Unit A5905</p>
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-full mb-1" style={{ background: "rgba(52,199,89,0.09)" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#1F8B4C" }}>Collect commission</span>
                    <ArrowRight style={{ width: 10, height: 10, color: "#34C759" }} />
                  </div>
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-full" style={{ background: "rgba(52,199,89,0.09)" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#1F8B4C" }}>Moved in</span>
                    <ArrowRight style={{ width: 10, height: 10, color: "#34C759" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        <DemoCursor x={cur.x} y={cur.y} clicking={clicking} />
      </SceneFrame>
      <p className="text-center mt-2" style={{ fontSize: 13, color: "#6C6C70", minHeight: 20 }}>
        {caption}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Modal shell
// ═══════════════════════════════════════════════════════════════════════════════

const MODULES = [
  {
    title:     "Import leads & send outreach",
    valueProp: "Personalised owner link, downloadable for bulk send",
    Scene:     Scene1,
  },
  {
    title:     "Owner fills intake — you track it",
    valueProp: "Automatically track owner replies to send tenant pack",
    Scene:     Scene2,
  },
  {
    title:     "Track & close renewals",
    valueProp: "Auto-reminder for 60-day expiry to follow up with owner",
    Scene:     Scene3,
  },
];

export function OnboardingDemoModal() {
  const [open, setOpen]       = useState(false);
  const [playing, setPlaying] = useState(false);
  const [mod, setMod]         = useState(0);

  const openModal = useCallback(() => { setOpen(true); setPlaying(true); }, []);

  const close = useCallback(() => {
    setOpen(false); setPlaying(false); setMod(0);
    localStorage.setItem(STORAGE_KEY, "1");
  }, []);

  const goTo = useCallback((m: number) => {
    setPlaying(false);
    setTimeout(() => { setMod(m); setPlaying(true); }, 60);
  }, []);

  useEffect(() => {
    document.addEventListener(DEMO_EVENT, openModal);
    return () => document.removeEventListener(DEMO_EVENT, openModal);
  }, [openModal]);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setTimeout(openModal, 600);
  }, [openModal]);

  if (!open) return null;

  const { title, valueProp, Scene } = MODULES[mod];

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
        <button
          onClick={close}
          className="absolute top-4 right-4 flex items-center justify-center rounded-full"
          style={{ width: 32, height: 32, background: "#F2F2F7", color: "#6C6C70", border: "none", cursor: "pointer" }}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "#F2F2F7", color: "#6C6C70" }}>
              Module {mod + 1} of {MODULES.length}
            </span>
            <div className="flex gap-1.5">
              {MODULES.map((_, i) => (
                <button key={i} onClick={() => goTo(i)} style={{
                  width: i === mod ? 20 : 7, height: 7, borderRadius: 4,
                  background: i === mod ? "#1C1C1E" : "#E5E5EA",
                  border: "none", cursor: "pointer", padding: 0,
                  transition: "width 0.3s, background 0.3s",
                }} />
              ))}
            </div>
          </div>
          <h2 className="font-bold" style={{ fontSize: 20, color: "#1C1C1E", letterSpacing: "-0.02em" }}>
            {title}
          </h2>
          <ValuePropBanner text={valueProp} />
        </div>

        <Scene active={playing} />

        <div className="flex items-center justify-between mt-4">
          <button onClick={close} style={{ fontSize: 13, color: "#AEAEB2", background: "none", border: "none", cursor: "pointer" }}>
            Skip for now
          </button>
          <div className="flex gap-2">
            {mod > 0 && (
              <button onClick={() => goTo(mod - 1)} className="px-4 py-2 rounded-full" style={{ fontSize: 13, fontWeight: 600, background: "#F2F2F7", color: "#1C1C1E", border: "none", cursor: "pointer" }}>
                ← Back
              </button>
            )}
            {mod < MODULES.length - 1 ? (
              <button onClick={() => goTo(mod + 1)} className="px-4 py-2 rounded-full" style={{ fontSize: 13, fontWeight: 600, background: "#1C1C1E", color: "#fff", border: "none", cursor: "pointer" }}>
                Next module →
              </button>
            ) : (
              <button onClick={close} className="px-4 py-2 rounded-full" style={{ fontSize: 13, fontWeight: 600, background: "#1C1C1E", color: "#fff", border: "none", cursor: "pointer" }}>
                Start using kakisewa →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
