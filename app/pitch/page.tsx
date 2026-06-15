"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ── Tokens ── */
const BG    = "#08080F";
const SURF  = "#141418";
const INK   = "#FFFFFF";
const MUTE  = "#98989F";
const DIM   = "#38383A";
const BLUE  = "#2997FF";
const GREEN = "#30D158";
const RED   = "#FF453A";
const SANS  = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";

const gText = {
  background: "linear-gradient(160deg,#FFFFFF 20%,rgba(255,255,255,0.52) 100%)",
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent" as const,
  backgroundClip: "text" as const,
};

/* ── Shared shell ── */
function Shell({
  children,
  cx = false,
  glow,
}: {
  children: React.ReactNode;
  cx?: boolean;
  glow?: string;
}) {
  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      justifyContent: "center",
      alignItems: cx ? "center" : "flex-start",
      padding: "clamp(44px,6vw,88px) clamp(44px,8vw,120px)",
      paddingBottom: "clamp(64px,8vw,96px)",
      boxSizing: "border-box",
      textAlign: cx ? "center" : "left",
      position: "relative", overflow: "hidden",
    }}>
      {glow && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
          background: `radial-gradient(ellipse at 50% 45%,${glow} 0%,transparent 65%)`,
        }} />
      )}
      <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
        {children}
      </div>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "0 clamp(44px,8vw,120px) clamp(18px,2.5vw,26px)",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{ flex: 1, height: 1, background: DIM }} />
        <span style={{ fontFamily: SANS, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: DIM, textTransform: "uppercase" }}>kakisewa</span>
      </div>
    </div>
  );
}

function OL({ children }: { children: string }) {
  return (
    <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: BLUE, margin: "0 0 clamp(14px,2vw,24px) 0" }}>
      {children}
    </p>
  );
}

/* ── S1 Cover ── */
function S1() {
  return (
    <Shell cx glow="rgba(41,151,255,0.14)">
      <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: "clamp(60px,12vw,148px)", letterSpacing: "-0.05em", lineHeight: 0.92, margin: "0 0 clamp(20px,3vw,36px) 0", ...gText }}>
        kakisewa
      </div>
      <p style={{ fontFamily: SANS, fontSize: "clamp(16px,2vw,26px)", fontWeight: 400, color: MUTE, margin: "0 0 clamp(28px,4vw,48px) 0", maxWidth: "clamp(280px,48vw,560px)", lineHeight: 1.5 }}>
        The property notebook every agent actually uses.
      </p>
      <div style={{ height: 3, width: "clamp(44px,6vw,72px)", background: `linear-gradient(to right,${BLUE},transparent)`, borderRadius: 2 }} />
    </Shell>
  );
}

/* ── S2 Problem ── */
function S2() {
  const rows = [
    "CRM tools track clients, not properties",
    "Spreadsheets break and nothing syncs",
    "WhatsApp messages and notebooks — that's the system",
  ];
  return (
    <Shell>
      <OL>The Problem</OL>
      <h2 style={{ fontFamily: SANS, fontWeight: 800, fontSize: "clamp(26px,4.2vw,58px)", letterSpacing: "-0.03em", color: INK, margin: "0 0 clamp(24px,3.5vw,44px) 0", lineHeight: 1.12, maxWidth: "clamp(300px,55vw,680px)" }}>
        Every tool today solves<br />the wrong problem.
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "clamp(12px,1.8vw,20px)" }}>
        {rows.map(t => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: "clamp(12px,1.6vw,20px)" }}>
            <div style={{ width: "clamp(32px,3.5vw,46px)", height: "clamp(32px,3.5vw,46px)", borderRadius: "50%", background: "rgba(255,69,58,0.12)", border: "1px solid rgba(255,69,58,0.28)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: "clamp(12px,1.3vw,17px)", color: RED }}>✕</span>
            </div>
            <p style={{ fontFamily: SANS, fontSize: "clamp(13px,1.5vw,19px)", color: MUTE, margin: 0, fontWeight: 500 }}>{t}</p>
          </div>
        ))}
      </div>
    </Shell>
  );
}

/* ── S3 The Number ── */
function S3() {
  return (
    <Shell cx glow="rgba(41,151,255,0.11)">
      <p style={{ fontFamily: SANS, fontSize: "clamp(11px,1.1vw,14px)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTE, margin: "0 0 clamp(8px,1.2vw,16px) 0" }}>
        Renewal commissions available to you
      </p>
      <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: "clamp(60px,13vw,168px)", letterSpacing: "-0.04em", lineHeight: 0.9, margin: "0 0 clamp(16px,2.2vw,28px) 0", ...gText }}>
        RM288,000
      </div>
      <p style={{ fontFamily: SANS, fontSize: "clamp(14px,1.6vw,20px)", color: MUTE, margin: "0 0 10px 0" }}>Every year. Per active agent.</p>
      <p style={{ fontFamily: SANS, fontSize: "clamp(13px,1.4vw,18px)", fontWeight: 700, color: RED, margin: 0 }}>Most agents capture less than 20% of it.</p>
    </Shell>
  );
}

/* ── S4 Reframe ── */
function S4() {
  return (
    <Shell>
      <OL>A Different Way to Think</OL>
      <div style={{ display: "flex", gap: "clamp(16px,3vw,40px)", flexWrap: "wrap", width: "100%" }}>
        <div style={{ flex: "1 1 200px", padding: "clamp(20px,2.5vw,32px)", background: SURF, borderRadius: 18, border: `1px solid ${DIM}` }}>
          <p style={{ fontFamily: SANS, fontSize: "clamp(26px,4vw,52px)", fontWeight: 900, color: DIM, margin: "0 0 14px 0", letterSpacing: "-0.03em" }}>Hunter</p>
          {["Chase new clients every day", "Pay per listing on ad portals", "Exhausting. Never guaranteed."].map(t => (
            <p key={t} style={{ fontFamily: SANS, fontSize: "clamp(12px,1.2vw,15px)", color: DIM, margin: "0 0 6px 0", lineHeight: 1.5, textDecoration: "line-through" }}>{t}</p>
          ))}
        </div>
        <div style={{ flex: "1 1 200px", padding: "clamp(20px,2.5vw,32px)", background: "rgba(48,209,88,0.07)", borderRadius: 18, border: "1px solid rgba(48,209,88,0.22)" }}>
          <p style={{ fontFamily: SANS, fontSize: "clamp(26px,4vw,52px)", fontWeight: 900, color: GREEN, margin: "0 0 14px 0", letterSpacing: "-0.03em" }}>Farmer</p>
          {["Nurture existing tenants", "Harvest renewals every season", "Same clients. Compounding income."].map((t, i) => (
            <p key={t} style={{ fontFamily: SANS, fontSize: "clamp(12px,1.2vw,15px)", color: i === 2 ? GREEN : MUTE, fontWeight: i === 2 ? 700 : 400, margin: "0 0 6px 0", lineHeight: 1.5 }}>{t}</p>
          ))}
        </div>
      </div>
      <p style={{ fontFamily: SANS, fontSize: "clamp(12px,1.1vw,14px)", color: DIM, margin: "clamp(16px,2vw,24px) 0 0 0", lineHeight: 1.6, maxWidth: "clamp(280px,60vw,640px)" }}>
        Your existing tenants are the tree. The renewal commission is the fruit. Most agents never harvest it.
      </p>
    </Shell>
  );
}

/* ── S5 Solution ── */
function S5() {
  return (
    <Shell cx glow="rgba(48,209,88,0.08)">
      <OL>The Solution</OL>
      <h2 style={{ fontFamily: SANS, fontWeight: 900, fontSize: "clamp(30px,5.5vw,76px)", letterSpacing: "-0.03em", lineHeight: 1.08, color: INK, margin: "0 0 clamp(18px,2.5vw,32px) 0", maxWidth: "clamp(300px,65vw,800px)" }}>
        Know when <span style={{ color: GREEN }}>every</span> lease expires.<br />Before it does.
      </h2>
      <p style={{ fontFamily: SANS, fontSize: "clamp(14px,1.5vw,19px)", color: MUTE, margin: 0, maxWidth: "clamp(260px,44vw,500px)", lineHeight: 1.6 }}>
        kakisewa auto-tracks renewal dates, sends reminders, and keeps your entire tenant directory one tap away.
      </p>
    </Shell>
  );
}

/* ── S6 Origin ── */
function S6() {
  const steps = [
    { n: "01", t: "An owner asked \"when does my lease end?\"" },
    { n: "02", t: "I couldn't answer — the date was buried in WhatsApp" },
    { n: "03", t: "I built kakisewa so that never happens again" },
  ];
  return (
    <Shell>
      <OL>Why We Built This</OL>
      <p style={{ fontFamily: SANS, fontWeight: 500, fontSize: "clamp(16px,2.2vw,28px)", color: MUTE, fontStyle: "italic", margin: "0 0 clamp(24px,3.5vw,44px) 0", lineHeight: 1.5, maxWidth: "clamp(280px,55vw,640px)" }}>
        "I was a top-producing agent. My business ran on WhatsApp saved messages and gut feel."
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px,2.5vw,28px)", width: "100%" }}>
        {steps.map(({ n, t }) => (
          <div key={n} style={{ display: "flex", alignItems: "flex-start", gap: "clamp(16px,2vw,28px)" }}>
            <span style={{ fontFamily: SANS, fontWeight: 900, fontSize: "clamp(10px,1vw,13px)", color: BLUE, letterSpacing: "0.08em", flexShrink: 0, paddingTop: 5 }}>{n}</span>
            <div style={{ width: 1, alignSelf: "stretch", background: DIM, flexShrink: 0 }} />
            <p style={{ fontFamily: SANS, fontSize: "clamp(14px,1.5vw,19px)", color: MUTE, margin: 0, lineHeight: 1.5, fontWeight: 500 }}>{t}</p>
          </div>
        ))}
      </div>
    </Shell>
  );
}

/* ── S7 Math ── */
function S7() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "clamp(44px,6vw,88px) clamp(44px,8vw,120px)", paddingBottom: "clamp(64px,8vw,96px)", boxSizing: "border-box", position: "relative" }}>
      <OL>The Math</OL>
      <h2 style={{ fontFamily: SANS, fontWeight: 800, fontSize: "clamp(22px,3.2vw,46px)", letterSpacing: "-0.02em", color: INK, margin: "0 0 clamp(24px,3.5vw,40px) 0", lineHeight: 1.2, maxWidth: "clamp(280px,55vw,620px)" }}>
        One agent. 24 active units. RM270/month each.
      </h2>
      <div style={{ width: "100%", marginBottom: 12 }}>
        <div style={{ height: "clamp(44px,5.5vw,64px)", borderRadius: 10, background: `linear-gradient(to right,${GREEN} 20%,${RED} 20%)`, position: "relative" }}>
          <span style={{ position: "absolute", left: "10%", top: "50%", transform: "translate(-50%,-50%)", fontFamily: SANS, fontWeight: 800, fontSize: "clamp(13px,1.5vw,18px)", color: "#000" }}>20%</span>
          <span style={{ position: "absolute", left: "60%", top: "50%", transform: "translate(-50%,-50%)", fontFamily: SANS, fontWeight: 800, fontSize: "clamp(13px,1.5vw,18px)", color: INK }}>80%</span>
        </div>
      </div>
      <div style={{ display: "flex", width: "100%" }}>
        <div style={{ width: "20%", paddingRight: 16 }}>
          <p style={{ fontFamily: SANS, fontWeight: 800, fontSize: "clamp(14px,1.8vw,22px)", color: GREEN, margin: "0 0 4px 0" }}>RM54,000</p>
          <p style={{ fontFamily: SANS, fontSize: "clamp(11px,1vw,13px)", color: MUTE, margin: 0 }}>Captured</p>
        </div>
        <div style={{ width: "80%", paddingLeft: "clamp(12px,2vw,28px)", borderLeft: `1px solid ${DIM}` }}>
          <p style={{ fontFamily: SANS, fontWeight: 800, fontSize: "clamp(14px,1.8vw,22px)", color: RED, margin: "0 0 4px 0" }}>RM216,000</p>
          <p style={{ fontFamily: SANS, fontSize: "clamp(11px,1vw,13px)", color: MUTE, margin: 0 }}>Missed every year</p>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 clamp(44px,8vw,120px) clamp(18px,2.5vw,26px)", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1, height: 1, background: DIM }} />
        <span style={{ fontFamily: SANS, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: DIM, textTransform: "uppercase" }}>kakisewa</span>
      </div>
    </div>
  );
}

/* ── S8 Security ── */
function S8() {
  const chips = ["On-device storage", "E2E encrypted", "Passcode protected", "No data sharing"];
  return (
    <Shell cx glow="rgba(41,151,255,0.09)">
      <OL>Privacy First</OL>
      <h2 style={{ fontFamily: SANS, fontWeight: 900, fontSize: "clamp(28px,5vw,68px)", letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 clamp(16px,2.5vw,28px) 0", maxWidth: "clamp(300px,62vw,720px)", ...gText }}>
        Even I can&apos;t read<br />your passcode.
      </h2>
      <p style={{ fontFamily: SANS, fontSize: "clamp(13px,1.4vw,18px)", color: MUTE, margin: "0 0 clamp(22px,3vw,36px) 0", maxWidth: "clamp(260px,48vw,540px)", lineHeight: 1.6 }}>
        Client data stays on your device. End-to-end encryption. No shared database, no data leaks.
      </p>
      <div style={{ display: "flex", gap: "clamp(7px,1.2vw,12px)", flexWrap: "wrap", justifyContent: "center" }}>
        {chips.map(f => (
          <span key={f} style={{ fontFamily: SANS, fontSize: "clamp(10px,1vw,13px)", fontWeight: 600, color: BLUE, border: "1px solid rgba(41,151,255,0.28)", borderRadius: 6, padding: "5px 14px" }}>{f}</span>
        ))}
      </div>
    </Shell>
  );
}

/* ── S9 Pricing ── */
function S9() {
  const feats = ["Unlimited tenants and contracts", "Auto renewal reminders", "Tenant WhatsApp directory", "Owner contact management"];
  return (
    <Shell cx>
      <OL>Pricing</OL>
      <div style={{ background: SURF, borderRadius: 22, border: `1px solid ${DIM}`, padding: "clamp(28px,4vw,52px) clamp(32px,5vw,72px)", display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "clamp(280px,48vw,500px)" }}>
        <p style={{ fontFamily: SANS, fontWeight: 900, fontSize: "clamp(52px,9vw,108px)", color: GREEN, margin: "0 0 4px 0", letterSpacing: "-0.04em", lineHeight: 1 }}>RM49</p>
        <p style={{ fontFamily: SANS, fontSize: "clamp(12px,1.1vw,15px)", color: MUTE, margin: "0 0 clamp(20px,3vw,32px) 0" }}>per month</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", marginBottom: "clamp(20px,3vw,32px)" }}>
          {feats.map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: GREEN, fontWeight: 700, fontSize: 15, flexShrink: 0 }}>✓</span>
              <p style={{ fontFamily: SANS, fontSize: "clamp(12px,1.2vw,15px)", color: MUTE, margin: 0 }}>{f}</p>
            </div>
          ))}
        </div>
        <a
          onClick={e => e.stopPropagation()}
          href="https://www.kakisewa.com"
          target="_blank" rel="noopener noreferrer"
          style={{ display: "block", width: "100%", background: BLUE, color: INK, fontFamily: SANS, fontWeight: 700, fontSize: "clamp(14px,1.4vw,17px)", padding: "clamp(12px,1.5vw,16px)", borderRadius: 12, textAlign: "center", textDecoration: "none" }}
        >
          Start free trial
        </a>
      </div>
    </Shell>
  );
}

/* ── S10 CTA ── */
function S10() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "clamp(44px,6vw,88px) clamp(44px,8vw,120px)", paddingBottom: "clamp(64px,8vw,96px)", boxSizing: "border-box", position: "relative", background: "#06060E" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 45%,rgba(41,151,255,0.18) 0%,transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <OL>The Ask</OL>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: "clamp(36px,6.5vw,88px)", letterSpacing: "-0.04em", lineHeight: 1.04, margin: "0 0 clamp(16px,2.5vw,32px) 0", ...gText }}>
          Your renewal clock<br />is ticking.
        </div>
        <p style={{ fontFamily: SANS, fontSize: "clamp(14px,1.5vw,19px)", color: MUTE, margin: "0 auto clamp(28px,4vw,48px) auto", maxWidth: "clamp(260px,44vw,480px)", lineHeight: 1.6 }}>
          Raising RM500k to expand across Malaysia. Product already used by active agents.
        </p>
        <a
          onClick={e => e.stopPropagation()}
          href="mailto:howard@kakisewa.com"
          style={{ display: "inline-block", background: BLUE, color: INK, fontFamily: SANS, fontWeight: 700, fontSize: "clamp(14px,1.4vw,17px)", padding: "clamp(12px,1.5vw,16px) clamp(28px,3.5vw,48px)", borderRadius: 100, textDecoration: "none" }}
        >
          Get in touch
        </a>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 clamp(44px,8vw,120px) clamp(18px,2.5vw,26px)", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1, height: 1, background: DIM }} />
        <span style={{ fontFamily: SANS, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: DIM, textTransform: "uppercase" }}>kakisewa</span>
      </div>
    </div>
  );
}

/* ── S11 Founder ── */
function S11() {
  const clients = ["Petronas", "TSMC", "Cebu Pacific", "Alibaba", "Maybank", "Mondelez", "Asahi"];
  return (
    <Shell>
      <OL>The Founder</OL>
      <div style={{ display: "flex", gap: "clamp(28px,5vw,72px)", flexWrap: "wrap", alignItems: "flex-start", width: "100%" }}>
        <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: "clamp(80px,8vw,110px)", height: "clamp(80px,8vw,110px)", borderRadius: "50%", overflow: "hidden", border: `2px solid ${DIM}`, background: SURF, flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/howard-profile.png" alt="Howard Ho" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
          </div>
          <div>
            <p style={{ fontFamily: SANS, fontSize: "clamp(15px,1.5vw,18px)", fontWeight: 700, color: INK, margin: "0 0 3px 0" }}>Howard Ho</p>
            <p style={{ fontFamily: SANS, fontSize: "clamp(12px,1.1vw,14px)", color: MUTE, margin: "0 0 10px 0" }}>Founder, kakisewa</p>
            <a href="https://www.linkedin.com/in/howardhozh/" onClick={e => e.stopPropagation()} target="_blank" rel="noopener noreferrer" style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: BLUE, textDecoration: "none", letterSpacing: "0.04em" }}>LinkedIn →</a>
          </div>
        </div>
        <div style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", gap: "clamp(20px,3vw,32px)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 900, letterSpacing: "0.06em", color: INK, background: "#CC0000", padding: "4px 10px", borderRadius: 4 }}>BAIN &amp; COMPANY</span>
              <span style={{ fontFamily: SANS, fontSize: "clamp(12px,1.1vw,14px)", color: MUTE }}>Business Consultant</span>
            </div>
            <p style={{ fontFamily: SANS, fontSize: "clamp(12px,1.1vw,14px)", color: MUTE, margin: "0 0 12px 0", lineHeight: 1.5 }}>Consulted for global enterprises across Asia Pacific, ANZ &amp; the Middle East.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {clients.map(c => (
                <span key={c} style={{ fontFamily: SANS, fontSize: "clamp(10px,0.9vw,12px)", fontWeight: 600, color: MUTE, border: `1px solid ${DIM}`, borderRadius: 4, padding: "3px 10px", whiteSpace: "nowrap" }}>{c}</span>
              ))}
            </div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 900, letterSpacing: "0.06em", color: INK, background: "#1E5C2E", padding: "4px 10px", borderRadius: 4 }}>TARRO</span>
              <span style={{ fontFamily: SANS, fontSize: "clamp(12px,1.1vw,14px)", color: MUTE }}>Product &amp; Team Lead</span>
            </div>
            <p style={{ fontFamily: SANS, fontSize: "clamp(12px,1.1vw,14px)", color: MUTE, margin: 0, lineHeight: 1.6 }}>Joined a Y Combinator startup serving 100k+ restaurant operators. Built product tools for real users and cross-functional teams from the ground up.</p>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ── Slide registry ── */
const SLIDES: { id: string; el: React.ReactNode }[] = [
  { id: "cover",    el: <S1 /> },
  { id: "problem",  el: <S2 /> },
  { id: "number",   el: <S3 /> },
  { id: "reframe",  el: <S4 /> },
  { id: "solution", el: <S5 /> },
  { id: "origin",   el: <S6 /> },
  { id: "math",     el: <S7 /> },
  { id: "security", el: <S8 /> },
  { id: "pricing",  el: <S9 /> },
  { id: "cta",      el: <S10 /> },
  { id: "founder",  el: <S11 /> },
];

const TOTAL = SLIDES.length;

/* ── Deck shell ── */
export default function PitchDeck() {
  const [current, setCurrent] = useState(0);
  const [rev, setRev]         = useState(0);
  const txRef = useRef(0);
  const tyRef = useRef(0);

  const go  = useCallback((i: number) => { if (i < 0 || i >= TOTAL) return; setCurrent(i); setRev(k => k + 1); }, []);
  const fwd = useCallback(() => go(current + 1), [go, current]);
  const bk  = useCallback(() => go(current - 1), [go, current]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", " "].includes(e.key)) { e.preventDefault(); fwd(); }
      if (["ArrowLeft",  "ArrowUp"].includes(e.key))         { e.preventDefault(); bk();  }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [fwd, bk]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        *,*::before,*::after{box-sizing:border-box}
        html,body{margin:0;padding:0;overflow:hidden;height:100%;background:${BG}}
        @keyframes kk-rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
      `}} />
      <div
        style={{ width: "100vw", height: "100dvh", overflow: "hidden", position: "relative", fontFamily: SANS, background: BG }}
        onTouchStart={e => { txRef.current = e.touches[0].clientX; tyRef.current = e.touches[0].clientY; }}
        onTouchEnd={e => {
          const dx = txRef.current - e.changedTouches[0].clientX;
          const dy = tyRef.current - e.changedTouches[0].clientY;
          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 44) { dx > 0 ? fwd() : bk(); }
        }}
      >
        {SLIDES.map((s, i) => (
          <div
            key={s.id}
            aria-hidden={i !== current}
            style={{
              position: "absolute", inset: 0,
              background: BG,
              transform: `translateX(${(i - current) * 100}%)`,
              transition: "transform 0.55s cubic-bezier(0.86,0,0.07,1)",
              willChange: "transform",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.05)" }} />
            <div
              key={i === current ? `a-${rev}` : `i-${i}`}
              style={{ width: "100%", height: "100%", animation: i === current ? "kk-rise 0.5s cubic-bezier(0.16,1,0.3,1) 0.12s both" : "none" }}
            >
              {s.el}
            </div>
            <div style={{ position: "absolute", top: "clamp(24px,3vw,38px)", right: "clamp(24px,3vw,38px)", fontFamily: SANS, fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", color: "rgba(255,255,255,0.18)", pointerEvents: "none" }}>
              {String(i + 1).padStart(2, "0")}&thinsp;/&thinsp;{String(TOTAL).padStart(2, "0")}
            </div>
          </div>
        ))}

        <div onClick={bk}  style={{ position: "absolute", left: 0,  top: 0, width: "18%", height: "88%", zIndex: 10, cursor: current > 0        ? "w-resize" : "default" }} />
        <div onClick={fwd} style={{ position: "absolute", right: 0, top: 0, width: "82%", height: "88%", zIndex: 10, cursor: current < TOTAL - 1 ? "e-resize" : "default" }} />

        <div style={{ position: "absolute", bottom: "clamp(18px,2.5vw,28px)", left: "50%", transform: "translateX(-50%)", display: "flex", gap: 7, alignItems: "center", zIndex: 30 }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); go(i); }}
              style={{ width: i === current ? 24 : 7, height: 7, borderRadius: 4, border: "none", padding: 0, cursor: "pointer", flexShrink: 0, background: i === current ? INK : "rgba(255,255,255,0.18)", transition: "width 0.3s cubic-bezier(0.34,1.56,0.64,1),background 0.3s" }}
            />
          ))}
        </div>

        {current === 0 && (
          <div style={{ position: "absolute", bottom: "clamp(18px,2.5vw,28px)", left: "clamp(40px,4vw,56px)", fontFamily: SANS, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", zIndex: 30, userSelect: "none", animation: "kk-rise 0.5s ease 2.2s both" }}>
            arrows &nbsp;·&nbsp; swipe &nbsp;·&nbsp; click
          </div>
        )}
      </div>
    </>
  );
}
