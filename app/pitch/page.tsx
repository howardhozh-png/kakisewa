"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const SERIF    = '"DM Serif Display", Georgia, serif';
const SANS     = 'Inter, -apple-system, BlinkMacSystemFont, sans-serif';
const BG       = "#FBFBFD";   // kk-bg
const INK      = "#1D1D1F";   // kk-ink
const MUTE     = "#6E6E73";   // kk-ink-mute
const DIM      = "#B0B0B5";   // kk-ink-faint-ish
const BLUE     = "#0071E3";   // kk-blue
const GREEN    = "#34C759";   // kk-green
const GREEN_INK = "#1F8B4C"; // kk-green-ink
const RED      = "#FF3B30";   // kk-red

/* ─── Shared layout helpers ─── */
function OL({ children }: { children: string }) {
  return (
    <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: BLUE, margin: "0 0 28px 0" }}>
      {children}
    </p>
  );
}

function SL({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      justifyContent: "center",
      alignItems: center ? "center" : "flex-start",
      textAlign: center ? "center" : "left",
      padding: "clamp(48px,7vw,96px) clamp(48px,9vw,148px)", boxSizing: "border-box",
    }}>
      {children}
    </div>
  );
}

/* ─── Slides ─── */

// 1 — Cover
function S1() {
  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
      padding: "clamp(48px,7vw,96px) clamp(48px,9vw,148px)", boxSizing: "border-box",
    }}>
      <div style={{ position: "absolute", top: "clamp(28px,3vw,40px)", left: "clamp(40px,4vw,56px)", fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: DIM }}>
        kakisewa
      </div>
      <div style={{ width: 48, height: 2, background: BLUE, marginBottom: 40, flexShrink: 0 }} />
      <h1 style={{ fontFamily: SERIF, fontSize: "clamp(52px,8.5vw,108px)", fontWeight: 400, lineHeight: 1.04, color: INK, margin: "0 0 28px 0", maxWidth: 760 }}>
        Your income<br />is leaking.
      </h1>
      <p style={{ fontFamily: SANS, fontSize: "clamp(17px,1.7vw,22px)", color: MUTE, margin: 0, maxWidth: 460 }}>
        You just haven&apos;t noticed yet.
      </p>
    </div>
  );
}

// 2 — The Problem
function S2() {
  const items = [
    { label: "WA Blasters",  desc: "Send fast. Not at the right time." },
    { label: "ERPs & CRMs",  desc: "Built for agencies. Not for agents." },
    { label: "Ad Portals",   desc: "Spend more every month. Earn the same." },
  ];
  return (
    <SL>
      <OL>The Problem</OL>
      <h2 style={{ fontFamily: SERIF, fontSize: "clamp(36px,5vw,66px)", fontWeight: 400, lineHeight: 1.1, color: INK, margin: "0 0 52px 0", maxWidth: 680 }}>
        Every tool today<br />solves the wrong problem.
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px,2.5vw,28px)" }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "clamp(16px,2vw,24px)" }}>
            <span style={{ fontFamily: SANS, fontSize: "clamp(15px,1.5vw,18px)", fontWeight: 700, color: RED, lineHeight: 1.5, flexShrink: 0 }}>✕</span>
            <span style={{ fontFamily: SANS, fontSize: "clamp(16px,1.6vw,20px)", lineHeight: 1.5 }}>
              <strong style={{ color: INK, fontWeight: 600 }}>{item.label}</strong>
              <span style={{ color: MUTE }}> — {item.desc}</span>
            </span>
          </div>
        ))}
      </div>
    </SL>
  );
}

// 3 — The Number (hero stat)
function S3() {
  return (
    <SL>
      <OL>The Number</OL>
      <div style={{ fontFamily: SERIF, fontSize: "clamp(60px,11vw,140px)", fontWeight: 400, color: INK, lineHeight: 0.92, margin: "0 0 32px 0" }}>
        RM288,000
      </div>
      <p style={{ fontFamily: SANS, fontSize: "clamp(16px,1.7vw,21px)", color: MUTE, margin: "0 0 32px 0", maxWidth: 520, lineHeight: 1.6 }}>
        In renewal commissions available to you. Every year.<br />
        <strong style={{ color: INK }}>Most agents capture less than 20% of it.</strong>
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: RED, flexShrink: 0 }} />
        <span style={{ fontFamily: SANS, fontSize: "clamp(13px,1.3vw,16px)", color: MUTE }}>
          RM230,000+ walking out the door. Not because you&apos;re lazy. Because nothing reminded you.
        </span>
      </div>
    </SL>
  );
}

// 4 — Hunter vs Farmer
function S4() {
  return (
    <SL>
      <OL>A Different Way to Think</OL>
      <div style={{ display: "flex", gap: "clamp(24px,5vw,72px)", flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 220px" }}>
          <p style={{ fontFamily: SERIF, fontSize: "clamp(28px,3.8vw,50px)", fontWeight: 400, color: DIM, margin: "0 0 24px 0" }}>Hunter</p>
          {[
            "Chase new clients every day",
            "Pay per listing on ad portals",
            "Exhausting. Never guaranteed.",
          ].map((t, i) => (
            <p key={i} style={{ fontFamily: SANS, fontSize: "clamp(14px,1.4vw,17px)", color: DIM, margin: "0 0 10px 0", lineHeight: 1.5 }}>{t}</p>
          ))}
        </div>
        <div style={{ width: 1, background: "rgba(0,0,0,0.08)", minHeight: 160, alignSelf: "stretch", flexShrink: 0 }} />
        <div style={{ flex: "1 1 220px" }}>
          <p style={{ fontFamily: SERIF, fontSize: "clamp(28px,3.8vw,50px)", fontWeight: 400, color: INK, margin: "0 0 24px 0" }}>Farmer</p>
          {[
            "Nurture existing tenants",
            "Harvest renewals every season",
            "Same clients. Compounding income.",
          ].map((t, i) => (
            <p key={i} style={{ fontFamily: SANS, fontSize: "clamp(14px,1.4vw,17px)", color: i === 2 ? BLUE : INK, fontWeight: i === 2 ? 600 : 400, margin: "0 0 10px 0", lineHeight: 1.5 }}>{t}</p>
          ))}
        </div>
      </div>
      <p style={{ fontFamily: SANS, fontSize: "clamp(12px,1.1vw,14px)", color: DIM, margin: "clamp(28px,4vw,48px) 0 0 0" }}>
        Your existing tenants are the tree. The renewal commission is the fruit. Most agents never harvest it.
      </p>
    </SL>
  );
}

// 5 — Solution (centered)
function S5() {
  return (
    <SL center>
      <OL>One Job</OL>
      <h2 style={{ fontFamily: SERIF, fontSize: "clamp(40px,6.5vw,82px)", fontWeight: 400, lineHeight: 1.07, color: INK, margin: "0 0 24px 0" }}>
        Know when every<br />lease expires.
      </h2>
      <p style={{ fontFamily: SANS, fontSize: "clamp(18px,1.9vw,25px)", fontWeight: 600, color: BLUE, margin: "0 0 6px 0" }}>Be there first.</p>
      <p style={{ fontFamily: SANS, fontSize: "clamp(18px,1.9vw,25px)", fontWeight: 600, color: BLUE, margin: "0 0 56px 0" }}>Every time.</p>
      <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: DIM }}>kakisewa</p>
    </SL>
  );
}

// 6 — Origin (quote style)
function S6() {
  return (
    <SL>
      <OL>How This Started</OL>
      <p style={{ fontFamily: SERIF, fontSize: "clamp(26px,3.6vw,46px)", fontWeight: 400, lineHeight: 1.28, color: INK, margin: "0 0 40px 0", maxWidth: 740 }}>
        &ldquo;My cousin had 9 Excel files.<br />
        None of them told him<br />
        when a lease was about to expire.&rdquo;
      </p>
      <div style={{ width: 40, height: 1, background: "rgba(0,0,0,0.1)", marginBottom: 32 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[
          "Built him a dashboard.",
          "Then a date alert — red at 60 days.",
          "Then I realised every agent had the same problem.",
        ].map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
            <span style={{ fontFamily: SANS, fontSize: "clamp(11px,1vw,13px)", fontWeight: 700, color: BLUE, flexShrink: 0, lineHeight: 1.7, letterSpacing: "0.04em" }}>0{i + 1}</span>
            <span style={{ fontFamily: SANS, fontSize: "clamp(14px,1.4vw,17px)", color: MUTE, lineHeight: 1.6 }}>{t}</span>
          </div>
        ))}
      </div>
      <p style={{ fontFamily: SANS, fontSize: "clamp(12px,1.1vw,14px)", color: DIM, margin: "clamp(24px,3vw,36px) 0 0 0" }}>
        That became kakisewa. What you see today is v1 of 99.
      </p>
    </SL>
  );
}

// 7 — The Math (bar chart) — uses block layout so bar stretches full width
function S7() {
  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "clamp(48px,7vw,96px) clamp(48px,9vw,148px)", boxSizing: "border-box",
    }}>
      <OL>The Math</OL>
      <p style={{ fontFamily: SANS, fontSize: "clamp(14px,1.4vw,17px)", color: MUTE, margin: "0 0 10px 0", lineHeight: 1.5 }}>
        Agent earning RM20–30k/month &rarr; <strong style={{ color: INK }}>90 active listings minimum</strong>
      </p>
      <p style={{ fontFamily: SANS, fontSize: "clamp(14px,1.4vw,17px)", color: MUTE, margin: "0 0 36px 0" }}>
        90 &times; RM3,000 avg commission =&nbsp;
        <span style={{ fontFamily: SERIF, fontSize: "clamp(22px,2.6vw,34px)", color: INK }}>RM270,000/year</span>
      </p>
      {/* Bar — gradient on a single full-width div, no inner flex needed */}
      <div style={{
        height: "clamp(40px,5vw,56px)", borderRadius: 8, position: "relative", marginBottom: 12,
        background: `linear-gradient(to right, ${GREEN} 20%, ${RED} 20%)`,
      }}>
        <span style={{ position: "absolute", left: "10%", top: "50%", transform: "translate(-50%,-50%)", fontFamily: SANS, fontSize: "clamp(10px,1vw,13px)", fontWeight: 700, color: "#003D15", whiteSpace: "nowrap" }}>20%</span>
        <span style={{ position: "absolute", left: "60%", top: "50%", transform: "translate(-50%,-50%)", fontFamily: SANS, fontSize: "clamp(10px,1vw,13px)", fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap" }}>80%</span>
      </div>
      {/* Labels row */}
      <div style={{ display: "flex" }}>
        <div style={{ width: "20%", paddingRight: 12 }}>
          <p style={{ fontFamily: SANS, fontSize: "clamp(13px,1.3vw,16px)", fontWeight: 700, color: GREEN_INK, margin: "0 0 2px 0" }}>RM54,000</p>
          <p style={{ fontFamily: SANS, fontSize: "clamp(10px,0.9vw,12px)", color: MUTE, margin: 0 }}>Captured</p>
        </div>
        <div style={{ width: "80%", paddingLeft: "clamp(8px,1.5vw,20px)" }}>
          <p style={{ fontFamily: SANS, fontSize: "clamp(13px,1.3vw,16px)", fontWeight: 700, color: RED, margin: "0 0 2px 0" }}>RM216,000</p>
          <p style={{ fontFamily: SANS, fontSize: "clamp(10px,0.9vw,12px)", color: MUTE, margin: 0 }}>Missed every year</p>
        </div>
      </div>
      <p style={{ fontFamily: SANS, fontSize: "clamp(12px,1.1vw,14px)", color: DIM, margin: "clamp(20px,3vw,32px) 0 0 0", maxWidth: 580 }}>
        Not because you&apos;re lazy. Because nothing reminded you when to reach out.
      </p>
    </div>
  );
}

// 8 — Security
function S8() {
  return (
    <SL>
      <OL>Your Data</OL>
      <h2 style={{ fontFamily: SERIF, fontSize: "clamp(36px,5vw,66px)", fontWeight: 400, lineHeight: 1.1, color: INK, margin: "0 0 48px 0", maxWidth: 640 }}>
        Even I can&apos;t read<br />your passcode.
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px,2vw,22px)" }}>
        {[
          "Row Level Security — every agent's data is isolated at database level. Mathematically, not by policy.",
          "Passwords hashed with bcrypt. Irreversible by design.",
          "I once tried to fix an agent's passcode myself. Even I got nothing. That's the design.",
        ].map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: BLUE, flexShrink: 0, marginTop: "clamp(6px,0.7vw,8px)" }} />
            <span style={{ fontFamily: SANS, fontSize: "clamp(14px,1.4vw,17px)", color: MUTE, lineHeight: 1.65 }}>{t}</span>
          </div>
        ))}
      </div>
    </SL>
  );
}

// 9 — Pricing (centered)
function S9() {
  return (
    <SL center>
      <OL>Pricing</OL>
      <h2 style={{ fontFamily: SERIF, fontSize: "clamp(36px,5.5vw,70px)", fontWeight: 400, lineHeight: 1.1, color: INK, margin: "0 0 20px 0", maxWidth: 700 }}>
        One renewal pays for kakisewa<br />for the entire year.
      </h2>
      <p style={{ fontFamily: SANS, fontSize: "clamp(17px,1.7vw,22px)", color: MUTE, margin: "0 0 52px 0" }}>
        You probably have 90 of them.
      </p>
      <a
        href="/sign-up"
        onClick={e => e.stopPropagation()}
        style={{
          display: "inline-block", background: BLUE, color: "#FFFFFF",
          fontFamily: SANS, fontSize: "clamp(14px,1.3vw,16px)", fontWeight: 600,
          padding: "15px 48px", borderRadius: 100, textDecoration: "none", letterSpacing: "-0.01em",
        }}
      >
        Start free trial
      </a>
    </SL>
  );
}

// 10 — CTA
function S10() {
  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
      padding: "clamp(48px,7vw,96px) clamp(48px,9vw,148px)", boxSizing: "border-box",
    }}>
      <div style={{ position: "absolute", top: "clamp(28px,3vw,40px)", left: "clamp(40px,4vw,56px)", fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: DIM }}>
        kakisewa
      </div>
      <div style={{ width: 48, height: 2, background: BLUE, marginBottom: 40, flexShrink: 0 }} />
      <h1 style={{ fontFamily: SERIF, fontSize: "clamp(44px,7.5vw,88px)", fontWeight: 400, lineHeight: 1.06, color: INK, margin: "0 0 20px 0", maxWidth: 680 }}>
        Your renewal clock<br />is ticking.
      </h1>
      <p style={{ fontFamily: SANS, fontSize: "clamp(15px,1.6vw,20px)", color: MUTE, margin: "0 0 44px 0" }}>
        How many of your listings expire in the next 90 days?
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "clamp(16px,2.5vw,28px)", flexWrap: "wrap" }}>
        <a
          href="https://kakisewa.com/sign-up"
          onClick={e => e.stopPropagation()}
          style={{
            display: "inline-block", background: BLUE, color: "#FFFFFF",
            fontFamily: SANS, fontSize: "clamp(13px,1.3vw,16px)", fontWeight: 700,
            padding: "15px 48px", borderRadius: 100, textDecoration: "none",
          }}
        >
          Start free trial
        </a>
        <span style={{ fontFamily: SANS, fontSize: 13, color: DIM }}>kakisewa.com</span>
      </div>
    </div>
  );
}

// 11 — Founder (last slide)
function S11() {
  const clients = ["Petronas", "TSMC", "Cebu Pacific", "Alibaba", "Maybank", "Mondelez", "Asahi"];
  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "clamp(40px,6vw,80px) clamp(48px,9vw,148px)", boxSizing: "border-box",
    }}>
      <OL>The Founder</OL>
      <div style={{ display: "flex", gap: "clamp(28px,5vw,72px)", flexWrap: "wrap", alignItems: "flex-start" }}>

        {/* Left — photo + bio */}
        <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14 }}>
          <div style={{
            width: "clamp(88px,9vw,120px)", height: "clamp(88px,9vw,120px)",
            borderRadius: "50%", overflow: "hidden",
            border: "2px solid rgba(0,0,0,0.09)", background: "#F5F5F7", flexShrink: 0,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/howard-profile.png" alt="Howard Ho" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
          </div>
          <div>
            <p style={{ fontFamily: SANS, fontSize: "clamp(15px,1.5vw,18px)", fontWeight: 700, color: INK, margin: "0 0 3px 0" }}>Howard Ho</p>
            <p style={{ fontFamily: SANS, fontSize: "clamp(12px,1.1vw,14px)", color: MUTE, margin: "0 0 10px 0" }}>Founder, kakisewa</p>
            <a
              href="https://www.linkedin.com/in/howardhozh/"
              onClick={e => e.stopPropagation()}
              target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "#0A66C2", textDecoration: "none", letterSpacing: "0.04em" }}
            >
              LinkedIn →
            </a>
          </div>
        </div>

        {/* Right — experience */}
        <div style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", gap: "clamp(22px,3vw,32px)" }}>

          {/* Bain */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 900, letterSpacing: "0.06em", color: "#FFFFFF", background: "#CC0000", padding: "4px 10px", borderRadius: 4 }}>
                BAIN &amp; COMPANY
              </span>
              <span style={{ fontFamily: SANS, fontSize: "clamp(12px,1.1vw,14px)", color: MUTE }}>Business Consultant</span>
            </div>
            <p style={{ fontFamily: SANS, fontSize: "clamp(12px,1.1vw,14px)", color: MUTE, margin: "0 0 12px 0", lineHeight: 1.5 }}>
              Consulted for global enterprises across Asia Pacific, ANZ &amp; the Middle East.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {clients.map(c => (
                <span key={c} style={{
                  fontFamily: SANS, fontSize: "clamp(10px,0.9vw,12px)", fontWeight: 600, color: INK,
                  border: "1px solid rgba(0,0,0,0.14)", borderRadius: 4, padding: "3px 10px", whiteSpace: "nowrap",
                }}>{c}</span>
              ))}
            </div>
          </div>

          {/* Tarro */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 900, letterSpacing: "0.06em", color: "#FFFFFF", background: "#1A1A2E", padding: "4px 10px", borderRadius: 4 }}>
                TARRO
              </span>
              <span style={{ fontFamily: SANS, fontSize: "clamp(12px,1.1vw,14px)", color: MUTE }}>Product &amp; Team Lead</span>
            </div>
            <p style={{ fontFamily: SANS, fontSize: "clamp(12px,1.1vw,14px)", color: MUTE, margin: 0, lineHeight: 1.6 }}>
              Joined a Y Combinator startup serving 100k+ restaurant operators. Built product tools for real users and built cross-functional teams from the ground up.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─── Slide registry ─── */
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

/* ─── Deck shell ─── */
export default function PitchDeck() {
  const [current, setCurrent] = useState(0);
  const [rev, setRev]         = useState(0);
  const txRef = useRef(0);
  const tyRef = useRef(0);

  const go  = useCallback((i: number) => {
    if (i < 0 || i >= TOTAL) return;
    setCurrent(i);
    setRev(k => k + 1);
  }, []);
  const fwd = useCallback(() => go(current + 1), [go, current]);
  const bk  = useCallback(() => go(current - 1),  [go, current]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", " "].includes(e.key)) { e.preventDefault(); fwd(); }
      if (["ArrowLeft", "ArrowUp"].includes(e.key))          { e.preventDefault(); bk();  }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [fwd, bk]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; background: ${BG}; }
        @keyframes kk-rise {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
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
        {/* ── Slides ── */}
        {SLIDES.map((s, i) => (
          <div
            key={s.id}
            aria-hidden={i !== current}
            style={{
              position: "absolute", inset: 0,
              background: BG,
              transform: `translateX(${(i - current) * 100}%)`,
              transition: "transform 0.5s cubic-bezier(0.86, 0, 0.07, 1)",
              willChange: "transform",
            }}
          >
            {/* Top border */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "rgba(0,0,0,0.06)" }} />
            {/* Content with entrance animation */}
            <div
              key={i === current ? `a-${rev}` : `i-${i}`}
              style={{
                width: "100%", height: "100%",
                animation: i === current ? "kk-rise 0.5s cubic-bezier(0.16,1,0.3,1) 0.12s both" : "none",
              }}
            >
              {s.el}
            </div>
            {/* Slide counter */}
            <div style={{
              position: "absolute", top: "clamp(28px,3vw,40px)", right: "clamp(28px,3vw,40px)",
              fontFamily: SANS, fontSize: 10, fontWeight: 600, letterSpacing: "0.07em",
              color: "rgba(0,0,0,0.18)", pointerEvents: "none",
            }}>
              {String(i + 1).padStart(2, "0")}&thinsp;/&thinsp;{String(TOTAL).padStart(2, "0")}
            </div>
          </div>
        ))}

        {/* ── Click zones ── */}
        <div onClick={bk}  style={{ position: "absolute", left: 0,  top: 0, width: "18%", height: "88%", zIndex: 10, cursor: current > 0        ? "w-resize" : "default" }} />
        <div onClick={fwd} style={{ position: "absolute", right: 0, top: 0, width: "82%", height: "88%", zIndex: 10, cursor: current < TOTAL - 1 ? "e-resize" : "default" }} />

        {/* ── Dot navigation ── */}
        <div style={{
          position: "absolute", bottom: "clamp(18px,2.5vw,28px)", left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 7, alignItems: "center", zIndex: 30,
        }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); go(i); }}
              style={{
                width: i === current ? 24 : 7, height: 7, borderRadius: 4,
                border: "none", padding: 0, cursor: "pointer", flexShrink: 0,
                background: i === current ? INK : "rgba(0,0,0,0.15)",
                transition: "width 0.3s cubic-bezier(0.34,1.56,0.64,1), background 0.3s",
              }}
            />
          ))}
        </div>

        {/* ── Hint on cover only ── */}
        {current === 0 && (
          <div style={{
            position: "absolute", bottom: "clamp(18px,2.5vw,28px)", left: "clamp(40px,4vw,56px)",
            fontFamily: SANS, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
            color: "rgba(0,0,0,0.2)", zIndex: 30, userSelect: "none",
            animation: "kk-rise 0.5s ease 2.2s both",
          }}>
            ← → arrows &nbsp;·&nbsp; swipe &nbsp;·&nbsp; click
          </div>
        )}
      </div>
    </>
  );
}
