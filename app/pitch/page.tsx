"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const SERIF = '"DM Serif Display", Georgia, serif';
const SANS  = 'Inter, -apple-system, BlinkMacSystemFont, sans-serif';
const BLUE  = "#0071E3";
const INK   = "#1D1D1F";
const MUTE  = "#6E6E73";
const FAINT = "#B0B0B5";
const WHITE = "#FFFFFF";

/* ─── Micro-components ─── */

// Short blue rule — sits above every overline on content slides
function Rule() {
  return <div style={{ width: 28, height: 2, background: BLUE, marginBottom: 14, flexShrink: 0 }} />;
}

// Overline label
function OL({ light }: { light?: boolean }) {
  return (fn: (t: string) => React.ReactNode) => (text: string) => (
    <span style={{
      fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
      textTransform: "uppercase", color: light ? "rgba(255,255,255,0.45)" : BLUE,
      display: "block", marginBottom: 20,
    }}>
      {text}
    </span>
  );
}

// Slide number — top-right corner
function Num({ n, total, light }: { n: number; total: number; light?: boolean }) {
  return (
    <div style={{
      position: "absolute", top: 28, right: 36,
      fontFamily: SANS, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
      color: light ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
    }}>
      {String(n).padStart(2, "0")}&thinsp;/&thinsp;{String(total).padStart(2, "0")}
    </div>
  );
}

// Standard left-aligned content wrapper
function SL({ children, valign = "center" }: { children: React.ReactNode; valign?: "center" | "top" }) {
  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      display: "flex", flexDirection: "column",
      justifyContent: valign === "center" ? "center" : "flex-start",
      padding: "clamp(48px, 7vw, 96px) clamp(56px, 9vw, 148px)",
      boxSizing: "border-box",
    }}>
      {children}
    </div>
  );
}

// Body text
const bdy = (light?: boolean): React.CSSProperties => ({
  fontFamily: SANS, fontSize: "clamp(14px, 1.35vw, 17px)", lineHeight: 1.75,
  color: light ? "rgba(255,255,255,0.6)" : MUTE, margin: 0,
});

// Headline
const hdl = (light?: boolean, size = "clamp(32px, 4.5vw, 60px)"): React.CSSProperties => ({
  fontFamily: SERIF, fontSize: size, fontWeight: 400, lineHeight: 1.12,
  color: light ? WHITE : INK, margin: "0 0 24px 0",
});

/* ─── Slides ─── */

// 1 — Cover (dark)
function S1() {
  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      display: "flex", flexDirection: "column",
      justifyContent: "flex-end",
      padding: "clamp(48px, 7vw, 96px) clamp(56px, 9vw, 148px)",
      boxSizing: "border-box",
    }}>
      {/* Top wordmark */}
      <div style={{ position: "absolute", top: 36, left: 56, fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>
        kakisewa
      </div>
      {/* Big horizontal rule */}
      <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.1)", marginBottom: 48 }} />
      <h1 style={{ fontFamily: SERIF, fontSize: "clamp(48px, 7.5vw, 92px)", fontWeight: 400, lineHeight: 1.06, color: WHITE, margin: "0 0 28px 0", maxWidth: 720 }}>
        Your income<br />is leaking.
      </h1>
      <p style={{ fontFamily: SANS, fontSize: "clamp(16px, 1.5vw, 19px)", color: "rgba(255,255,255,0.42)", margin: "0 0 0 0", maxWidth: 480 }}>
        You just haven&apos;t noticed yet.
      </p>
    </div>
  );
}

// 2 — The Wrong Race (white)
function S2() {
  return (
    <SL>
      <Rule />
      <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: BLUE, display: "block", marginBottom: 20 }}>What most tools get wrong</span>
      <h2 style={hdl()}>Everyone&apos;s racing to send<br />the first WhatsApp.</h2>
      <p style={bdy()}>
        WATI. WA Send. Raion. Bulk senders. These tools save your time — and they&apos;re good at it.<br /><br />
        But saving time is not the same as making money.<br /><br />
        <strong style={{ color: INK, fontWeight: 600 }}>Sending fast doesn&apos;t mean sending at the right moment.</strong> Timing is the difference between keeping a client for life and losing them to an agent who called one week before you did.
      </p>
    </SL>
  );
}

// 3 — Built for the Boss (white)
function S3() {
  return (
    <SL>
      <Rule />
      <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: BLUE, display: "block", marginBottom: 20 }}>The CRM problem</span>
      <h2 style={hdl()}>Your CRM was built<br />for your boss. Not for you.</h2>
      <p style={bdy()}>
        ERPs track revenue for accounting. Managers get dashboards. The company gets reports.<br /><br />
        You get a shared spreadsheet. And a prayer.<br /><br />
        <strong style={{ color: INK, fontWeight: 600 }}>No system was ever designed for the individual agent</strong> managing 60–90 listings on their own — with their own clients, their own renewal timelines, their own income on the line.
      </p>
    </SL>
  );
}

// 4 — Ad Spend Trap (white, split layout)
function S4() {
  return (
    <SL>
      <Rule />
      <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: BLUE, display: "block", marginBottom: 20 }}>The portal treadmill</span>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "clamp(32px, 6vw, 80px)", flexWrap: "wrap" }}>
        <div style={{ flex: "0 0 auto" }}>
          <span style={{ fontFamily: SERIF, fontSize: "clamp(56px, 8.5vw, 104px)", fontWeight: 400, color: BLUE, lineHeight: 1, display: "block" }}>RM5,000</span>
          <span style={{ fontFamily: SANS, fontSize: "clamp(13px, 1.2vw, 15px)", color: MUTE }}>per month, just to stay visible</span>
        </div>
        <div style={{ flex: "1 1 280px", paddingTop: 8 }}>
          <p style={bdy()}>
            iProperty credits. PropertyGuru boosts. Rankings that reset every month. The cost keeps climbing — and when you stop paying, you disappear.<br /><br />
            You can always spend more.<br />
            <strong style={{ color: INK, fontWeight: 600 }}>But where does it end?</strong>
          </p>
        </div>
      </div>
    </SL>
  );
}

// 5 — Hunters vs Farmers (white)
function S5() {
  return (
    <SL>
      <Rule />
      <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: BLUE, display: "block", marginBottom: 20 }}>A different way to think</span>
      <h2 style={hdl()}>Hunters chase.<br />Farmers harvest.</h2>
      <p style={bdy()}>
        A hunter goes out every day chasing new prey. Exhausting. Expensive. Never guaranteed.<br /><br />
        A farmer plants a tree, tends it, and harvests fruit every season — from the same land, year after year.<br /><br />
        <strong style={{ color: INK, fontWeight: 600 }}>Your existing tenants are the tree. The renewal commission is the fruit.</strong><br /><br />
        Most agents keep buying fruit at the market and never notice the orchard they&apos;re sitting on.
      </p>
    </SL>
  );
}

// 6 — One Problem (white, centered big statement)
function S6() {
  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "clamp(48px, 7vw, 96px) clamp(56px, 9vw, 148px)",
      boxSizing: "border-box",
    }}>
      <Rule />
      <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: BLUE, display: "block", marginBottom: 20 }}>What kakisewa does</span>
      <h2 style={{ fontFamily: SERIF, fontSize: "clamp(32px, 4.8vw, 62px)", fontWeight: 400, lineHeight: 1.12, color: INK, margin: "0 0 32px 0", maxWidth: 760 }}>
        Get the money you&apos;re supposed to get —<br />but forgot to ask for.
      </h2>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {["Know when every lease expires", "Be there first", "Every time"].map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {i > 0 && <div style={{ width: 4, height: 4, borderRadius: "50%", background: FAINT, flexShrink: 0 }} />}
            <span style={{ fontFamily: SANS, fontSize: "clamp(13px, 1.2vw, 15px)", color: i === 2 ? BLUE : INK, fontWeight: i === 2 ? 700 : 400 }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 7 — Origin Story (white)
function S7() {
  return (
    <SL>
      <Rule />
      <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: BLUE, display: "block", marginBottom: 20 }}>How this started</span>
      <h2 style={hdl()}>9 Excel files.<br />Multiple tabs.<br />Multiple columns.</h2>
      <p style={bdy()}>
        I watched my cousin manage his entire property portfolio from a maze of spreadsheets. I built him a dashboard. Then a date alert that turned red at 60 days. Then I realised agents weren&apos;t even tracking expiry dates — because no tool made it easy.<br /><br />
        So I kept building. That became kakisewa.<br /><br />
        <span style={{ color: FAINT, fontSize: "clamp(12px, 1.1vw, 14px)" }}>What you see today is v1. We are building v99 with you.</span>
      </p>
    </SL>
  );
}

// 8 — The Math (BLUE background — max impact)
function S8() {
  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "clamp(48px, 7vw, 96px) clamp(56px, 9vw, 148px)",
      boxSizing: "border-box", background: BLUE,
    }}>
      <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", display: "block", marginBottom: 20 }}>The math</span>

      <p style={{ fontFamily: SANS, fontSize: "clamp(13px, 1.2vw, 15px)", color: "rgba(255,255,255,0.55)", margin: "0 0 24px 0" }}>
        Agent earning RM20–30k/month &rarr; <strong style={{ color: WHITE }}>60–90 active listings minimum</strong>
      </p>

      <div style={{ display: "flex", alignItems: "baseline", gap: "clamp(12px, 2vw, 28px)", flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ fontFamily: SERIF, fontSize: "clamp(56px, 9vw, 108px)", fontWeight: 400, color: WHITE, lineHeight: 1 }}>RM180k</span>
        <span style={{ fontFamily: SERIF, fontSize: "clamp(28px, 4.5vw, 56px)", fontWeight: 400, color: "rgba(255,255,255,0.4)", lineHeight: 1 }}>– RM360k</span>
      </div>
      <p style={{ fontFamily: SANS, fontSize: "clamp(13px, 1.2vw, 15px)", color: "rgba(255,255,255,0.55)", margin: "0 0 40px 0" }}>
        in renewal commissions available to you, every single year
      </p>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.18)", paddingTop: 28 }}>
        <p style={{ fontFamily: SANS, fontSize: "clamp(15px, 1.5vw, 19px)", color: WHITE, fontWeight: 600, margin: "0 0 8px 0" }}>
          Most agents capture less than 20% of that.
        </p>
        <p style={{ fontFamily: SANS, fontSize: "clamp(14px, 1.3vw, 16px)", color: "rgba(255,255,255,0.65)", margin: 0 }}>
          That&apos;s <strong style={{ color: WHITE }}>RM144,000 – RM288,000</strong> walking out the door. Every. Single. Year.<br />
          <span style={{ fontSize: "clamp(12px, 1.1vw, 14px)", color: "rgba(255,255,255,0.4)" }}>Not because agents are lazy. Because no one reminded them.</span>
        </p>
      </div>
    </div>
  );
}

// 9 — Data Security (white)
function S9() {
  return (
    <SL>
      <Rule />
      <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: BLUE, display: "block", marginBottom: 20 }}>On your data</span>
      <h2 style={hdl()}>Even I can&apos;t read<br />your passcode.</h2>
      <p style={bdy()}>
        Every agent&apos;s data is isolated at the database level using Row Level Security — not just by policy, but mathematically. Passwords are hashed with bcrypt. Irreversible by design.<br /><br />
        <em style={{ color: "#424245" }}>One day I needed to fix an agent&apos;s passcode. Even as the builder of this system, I got nothing. I had to tell them to reset it themselves. That is not a limitation. That is the design.</em><br /><br />
        <span style={{ color: FAINT, fontSize: "clamp(12px, 1.1vw, 14px)" }}>Can I access your data? Yes — but only with your explicit consent. Same way your bank sees your balance. Not your PIN.</span>
      </p>
    </SL>
  );
}

// 10 — Pricing (white, centred)
function S10() {
  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center",
      padding: "clamp(48px, 7vw, 96px) clamp(56px, 9vw, 148px)", boxSizing: "border-box",
    }}>
      <Rule />
      <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: BLUE, display: "block", marginBottom: 20 }}>The math is simple</span>
      <h2 style={{ fontFamily: SERIF, fontSize: "clamp(32px, 4.8vw, 62px)", fontWeight: 400, lineHeight: 1.12, color: INK, margin: "0 0 16px 0" }}>
        One renewal pays for kakisewa<br />for the entire year.
      </h2>
      <p style={{ fontFamily: SANS, fontSize: "clamp(16px, 1.6vw, 20px)", color: MUTE, margin: "0 0 48px 0" }}>
        And you probably have 60–90 of them.
      </p>
      <a
        href="/sign-up"
        onClick={e => e.stopPropagation()}
        style={{
          display: "inline-block", background: BLUE, color: WHITE,
          fontFamily: SANS, fontSize: "clamp(13px, 1.2vw, 15px)", fontWeight: 600,
          padding: "14px 40px", borderRadius: 100, textDecoration: "none", letterSpacing: "-0.01em",
        }}
      >
        Start free trial
      </a>
    </div>
  );
}

// 11 — v1 of 99 (white)
function S11() {
  return (
    <SL>
      <Rule />
      <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: BLUE, display: "block", marginBottom: 20 }}>What is coming</span>
      <h2 style={hdl()}>What you see today<br />is version 1.</h2>
      <p style={bdy()}>
        kakisewa started as a dashboard. It became a date alert. Then a full pipeline. Then WhatsApp tracking. Then tenant packs. Then property packs. Then a competitor board for lost listings.<br /><br />
        <strong style={{ color: INK, fontWeight: 600 }}>Every feature came from an agent asking &ldquo;can it also do this?&rdquo;</strong><br /><br />
        We are nowhere near done. What you see today is v1 of 99. We are building the next 98 with the agents who use it.
      </p>
    </SL>
  );
}

// 12 — CTA (dark, mirroring cover)
function S12() {
  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
      padding: "clamp(48px, 7vw, 96px) clamp(56px, 9vw, 148px)",
      boxSizing: "border-box",
    }}>
      <div style={{ position: "absolute", top: 36, left: 56, fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>
        kakisewa
      </div>
      <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.1)", marginBottom: 48 }} />
      <h1 style={{ fontFamily: SERIF, fontSize: "clamp(44px, 7vw, 84px)", fontWeight: 400, lineHeight: 1.06, color: WHITE, margin: "0 0 20px 0", maxWidth: 660 }}>
        Your renewal clock<br />is ticking.
      </h1>
      <p style={{ fontFamily: SANS, fontSize: "clamp(15px, 1.5vw, 18px)", color: "rgba(255,255,255,0.42)", margin: "0 0 40px 0" }}>
        How many of your listings expire in the next 90 days?
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <a
          href="https://kakisewa.com/sign-up"
          onClick={e => e.stopPropagation()}
          style={{
            display: "inline-block", background: WHITE, color: INK,
            fontFamily: SANS, fontSize: "clamp(13px, 1.2vw, 15px)", fontWeight: 600,
            padding: "14px 40px", borderRadius: 100, textDecoration: "none",
          }}
        >
          Start free trial
        </a>
        <span style={{ fontFamily: SANS, fontSize: 13, color: "rgba(255,255,255,0.25)" }}>kakisewa.com</span>
      </div>
    </div>
  );
}

/* ─── Slide registry ─── */
// dark = true → #1D1D1F bg; dark = false → #FFFFFF bg; blue slide handled inline (S8)
const SLIDES: { id: string; dark: boolean; el: React.ReactNode }[] = [
  { id: "cover",   dark: true,  el: <S1 /> },
  { id: "race",    dark: false, el: <S2 /> },
  { id: "boss",    dark: false, el: <S3 /> },
  { id: "ads",     dark: false, el: <S4 /> },
  { id: "farmer",  dark: false, el: <S5 /> },
  { id: "problem", dark: false, el: <S6 /> },
  { id: "origin",  dark: false, el: <S7 /> },
  { id: "math",    dark: true,  el: <S8 /> }, // has its own blue bg
  { id: "data",    dark: false, el: <S9 /> },
  { id: "pricing", dark: false, el: <S10 /> },
  { id: "v1",      dark: false, el: <S11 /> },
  { id: "cta",     dark: true,  el: <S12 /> },
];

const TOTAL = SLIDES.length;

/* ─── Deck shell ─── */
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
      if (["ArrowLeft",  "ArrowUp"        ].includes(e.key)) { e.preventDefault(); bk();  }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [fwd, bk]);

  const slide = SLIDES[current];
  // Dot color logic: math slide (index 7) has blue bg → use white dots
  const dotLight = slide.dark || current === 7;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; }
        @keyframes kk-rise {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}} />

      <div
        style={{ width: "100vw", height: "100dvh", overflow: "hidden", position: "relative", fontFamily: SANS }}
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
              // S8 (math) sets its own bg via inline style; others use dark/white
              background: i === 7 ? BLUE : s.dark ? INK : WHITE,
              transform: `translateX(${(i - current) * 100}%)`,
              transition: "transform 0.52s cubic-bezier(0.86, 0, 0.07, 1)",
              willChange: "transform",
            }}
          >
            {/* Subtle top border on white slides */}
            {!s.dark && i !== 7 && (
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "rgba(0,0,0,0.06)" }} />
            )}
            {/* Content with entrance animation */}
            <div
              key={i === current ? `a-${rev}` : `i-${i}`}
              style={{
                width: "100%", height: "100%",
                animation: i === current ? "kk-rise 0.55s cubic-bezier(0.16,1,0.3,1) 0.15s both" : "none",
              }}
            >
              {s.el}
            </div>
            {/* Slide number per-slide */}
            <div style={{
              position: "absolute", top: 28, right: 36,
              fontFamily: SANS, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
              color: (s.dark || i === 7) ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.14)",
              pointerEvents: "none",
            }}>
              {String(i + 1).padStart(2, "0")}&thinsp;/&thinsp;{String(TOTAL).padStart(2, "0")}
            </div>
          </div>
        ))}

        {/* ── Click zones ── */}
        <div onClick={bk}  style={{ position: "absolute", left: 0,  top: 0, width: "18%", height: "82%", zIndex: 10, cursor: current > 0           ? "w-resize" : "default" }} />
        <div onClick={fwd} style={{ position: "absolute", right: 0, top: 0, width: "82%", height: "82%", zIndex: 10, cursor: current < TOTAL - 1    ? "e-resize" : "default" }} />

        {/* ── Dot navigation ── */}
        <div style={{
          position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 7, alignItems: "center", zIndex: 30,
        }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); go(i); }}
              style={{
                width: i === current ? 24 : 7, height: 7, borderRadius: 4,
                border: "none", padding: 0, cursor: "pointer", flexShrink: 0,
                background: dotLight
                  ? (i === current ? WHITE          : "rgba(255,255,255,0.22)")
                  : (i === current ? INK             : "rgba(0,0,0,0.15)"),
                transition: "width 0.3s cubic-bezier(0.34,1.56,0.64,1), background 0.3s",
              }}
            />
          ))}
        </div>

        {/* ── Hint on slide 1 only ── */}
        {current === 0 && (
          <div style={{
            position: "absolute", bottom: 26, left: 56,
            fontFamily: SANS, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.14)", zIndex: 30, userSelect: "none",
            animation: "kk-rise 0.5s ease 2s both",
          }}>
            ← → arrows &nbsp;·&nbsp; swipe &nbsp;·&nbsp; click
          </div>
        )}
      </div>
    </>
  );
}
