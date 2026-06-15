"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const SERIF = '"DM Serif Display", Georgia, serif';
const SANS = 'Inter, -apple-system, BlinkMacSystemFont, sans-serif';
const BLUE = "#0071E3";
const INK = "#1D1D1F";

/* ─── Shared style helpers ─── */
const ol = (dark: boolean): React.CSSProperties => ({
  fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
  textTransform: "uppercase", color: dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
  display: "block", marginBottom: 28,
});

const h = (dark: boolean, size = "clamp(34px, 5vw, 64px)"): React.CSSProperties => ({
  fontFamily: SERIF, fontSize: size, fontWeight: 400, lineHeight: 1.12,
  color: dark ? "#fff" : INK, margin: "0 0 28px 0",
});

const p = (dark: boolean): React.CSSProperties => ({
  fontFamily: SANS, fontSize: "clamp(15px, 1.5vw, 19px)", lineHeight: 1.7,
  color: dark ? "rgba(255,255,255,0.6)" : "#424245", margin: 0,
});

const em = (dark: boolean): React.CSSProperties => ({
  color: dark ? "#fff" : INK, fontWeight: 600,
});

/* ─── Slide layout wrapper ─── */
function SL({ dark, children }: { dark: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "clamp(32px, 6vw, 72px) clamp(28px, 9vw, 140px)", boxSizing: "border-box",
    }}>
      <div style={{ maxWidth: 860, width: "100%" }}>{children}</div>
    </div>
  );
}

/* ─── Individual slides ─── */

// 1 — Cover
function S1() {
  return (
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      padding: "0 clamp(24px, 8vw, 80px)", position: "relative",
    }}>
      <p style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", margin: "0 0 56px 0" }}>
        kakisewa
      </p>
      <h1 style={{ fontFamily: SERIF, fontSize: "clamp(52px, 9vw, 104px)", fontWeight: 400, lineHeight: 1.04, color: "#fff", margin: "0 0 24px 0" }}>
        Your income<br />is leaking.
      </h1>
      <p style={{ fontFamily: SANS, fontSize: "clamp(18px, 2.2vw, 26px)", color: "rgba(255,255,255,0.4)", margin: 0 }}>
        You just haven&apos;t noticed yet.
      </p>
    </div>
  );
}

// 2 — Wrong race
function S2() {
  return (
    <SL dark={false}>
      <span style={ol(false)}>What most tools get wrong</span>
      <h2 style={h(false)}>Everyone&apos;s racing to send<br />the first WhatsApp.</h2>
      <p style={p(false)}>
        WATI. WA Send. Raion. Bulk senders. These tools save your time — and they&apos;re good at it.<br /><br />
        But saving time is not the same as making money.<br /><br />
        <span style={em(false)}>Sending fast doesn&apos;t mean sending at the right moment.</span> Timing is the difference between keeping a client for life and losing them to an agent who called one week before you did.
      </p>
    </SL>
  );
}

// 3 — Built for the boss
function S3() {
  return (
    <SL dark={true}>
      <span style={ol(true)}>The CRM problem</span>
      <h2 style={h(true)}>Your CRM was built<br />for your boss. Not for you.</h2>
      <p style={p(true)}>
        ERPs track revenue for accounting. Managers get dashboards. The company gets reports.<br /><br />
        You get a shared spreadsheet. And a prayer.<br /><br />
        <span style={em(true)}>No system was ever designed for the individual agent</span> managing 60–90 listings on their own — with their own clients, their own renewal timelines, their own income on the line.
      </p>
    </SL>
  );
}

// 4 — Ad spend trap
function S4() {
  return (
    <SL dark={false}>
      <span style={ol(false)}>The portal treadmill</span>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontFamily: SERIF, fontSize: "clamp(60px, 10vw, 120px)", fontWeight: 400, color: BLUE, lineHeight: 1 }}>
          RM5,000
        </span>
      </div>
      <p style={{ fontFamily: SANS, fontSize: "clamp(16px, 1.8vw, 21px)", color: "#424245", margin: "0 0 28px 0" }}>
        per month, just to stay visible on the portals.
      </p>
      <p style={p(false)}>
        iProperty credits. PropertyGuru boosts. Rankings that reset every single month. The cost keeps climbing — and the moment you stop paying, you disappear.<br /><br />
        You can always spend more. But <span style={em(false)}>where does it end?</span>
      </p>
    </SL>
  );
}

// 5 — Hunters vs Farmers
function S5() {
  return (
    <SL dark={true}>
      <span style={ol(true)}>A different way to think</span>
      <h2 style={h(true)}>Hunters chase.<br />Farmers harvest.</h2>
      <p style={p(true)}>
        A hunter goes out every day chasing new prey. Exhausting. Expensive. Never guaranteed.<br /><br />
        A farmer plants a tree, tends it, and harvests fruit every season — from the same land, year after year.<br /><br />
        <span style={em(true)}>Your existing tenants are the tree. The renewal commission is the fruit.</span><br /><br />
        Most agents keep buying fruit at the market and never notice the orchard they&apos;re sitting on.
      </p>
    </SL>
  );
}

// 6 — One problem
function S6() {
  return (
    <SL dark={false}>
      <span style={ol(false)}>What kakisewa does</span>
      <h2 style={h(false)}>Get the money you&apos;re supposed<br />to get — but forgot to ask for.</h2>
      <p style={p(false)}>
        WhatsApp tracking. Tenant packs. Property packs. Lost listing radar. These are all useful extras.<br /><br />
        But the core is one thing:
      </p>
      <div style={{ marginTop: 24, padding: "20px 24px", borderRadius: 14, background: "rgba(0,113,227,0.08)", borderLeft: `3px solid ${BLUE}` }}>
        <p style={{ fontFamily: SANS, fontSize: "clamp(16px, 1.7vw, 20px)", color: BLUE, fontWeight: 700, margin: 0 }}>
          Know when every lease expires. Be there first. Every time.
        </p>
      </div>
    </SL>
  );
}

// 7 — Origin story
function S7() {
  return (
    <SL dark={true}>
      <span style={ol(true)}>How this started</span>
      <h2 style={h(true)}>9 Excel files.<br />Multiple tabs.<br />Multiple columns.</h2>
      <p style={p(true)}>
        I watched my cousin manage his entire property portfolio from a maze of spreadsheets. I built him a dashboard to see everything in one place. Then a date alert that turned red at 60 days. Then I realised agents weren&apos;t even tracking expiry dates — because no tool made it easy.<br /><br />
        So I kept building. That became kakisewa.<br /><br />
        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "clamp(13px, 1.2vw, 15px)", fontFamily: SANS }}>
          What you see today is v1. We are building v99 with you.
        </span>
      </p>
    </SL>
  );
}

// 8 — The Math
function S8() {
  return (
    <div style={{
      width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "clamp(32px, 6vw, 72px) clamp(28px, 9vw, 140px)", boxSizing: "border-box",
    }}>
      <div style={{ maxWidth: 860, width: "100%" }}>
        <span style={ol(false)}>The math</span>

        <p style={{ fontFamily: SANS, fontSize: "clamp(14px, 1.4vw, 17px)", color: "#6E6E73", margin: "0 0 20px 0" }}>
          Agent earning RM20–30k/month &rarr; <strong style={{ color: INK }}>60–90 active listings minimum</strong>
        </p>

        <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
          <span style={{ fontFamily: SERIF, fontSize: "clamp(52px, 9vw, 108px)", fontWeight: 400, color: INK, lineHeight: 1 }}>RM180k</span>
          <span style={{ fontFamily: SERIF, fontSize: "clamp(24px, 4vw, 52px)", fontWeight: 400, color: "#86868B", lineHeight: 1 }}>– RM360k</span>
        </div>
        <p style={{ fontFamily: SANS, fontSize: "clamp(14px, 1.4vw, 17px)", color: "#424245", margin: "0 0 36px 0" }}>
          in renewal commissions available to you, every single year
        </p>

        <div style={{ padding: "22px 26px", borderRadius: 16, background: "rgba(255,59,48,0.07)", borderLeft: "3px solid #FF3B30", marginBottom: 20 }}>
          <p style={{ fontFamily: SANS, fontSize: "clamp(15px, 1.5vw, 18px)", color: INK, fontWeight: 700, margin: "0 0 8px 0" }}>
            Most agents capture less than 20% of that.
          </p>
          <p style={{ fontFamily: SANS, fontSize: "clamp(14px, 1.4vw, 17px)", color: "#424245", margin: 0 }}>
            That&apos;s <span style={{ color: "#FF3B30", fontWeight: 700 }}>RM144,000 – RM288,000</span> walking out the door. Every. Single. Year.
          </p>
        </div>

        <p style={{ fontFamily: SANS, fontSize: "clamp(13px, 1.2vw, 15px)", color: "#86868B", margin: 0 }}>
          Not because agents are lazy. Because no one reminded them.
        </p>
      </div>
    </div>
  );
}

// 9 — Data security
function S9() {
  return (
    <SL dark={true}>
      <span style={ol(true)}>On your data</span>
      <h2 style={h(true)}>Even I can&apos;t read<br />your passcode.</h2>
      <p style={p(true)}>
        Every agent&apos;s data is isolated at the database level using Row Level Security — not just by policy, but mathematically. Passwords are hashed with bcrypt. Irreversible by design.<br /><br />
        <span style={{ fontStyle: "italic", color: "rgba(255,255,255,0.75)" }}>
          One day I needed to fix an agent&apos;s passcode. Even as the builder of this system, I got nothing. I had to tell them to reset it themselves. That is not a limitation. That is the design.
        </span><br /><br />
        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "clamp(13px, 1.2vw, 15px)", fontFamily: SANS }}>
          Can I access your data? Yes — but only with your explicit consent. Same way your bank sees your balance. Not your PIN.
        </span>
      </p>
    </SL>
  );
}

// 10 — Pricing
function S10() {
  return (
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      padding: "0 clamp(28px, 8vw, 100px)", boxSizing: "border-box",
    }}>
      <span style={{ ...ol(false), textAlign: "center" }}>The math is simple</span>
      <h2 style={{ ...h(false, "clamp(36px, 5.5vw, 68px)"), textAlign: "center" }}>
        One renewal pays for kakisewa<br />for the entire year.
      </h2>
      <p style={{ fontFamily: SANS, fontSize: "clamp(18px, 2vw, 24px)", color: "#6E6E73", margin: "0 0 48px 0" }}>
        And you probably have 60–90 of them.
      </p>
      <a
        href="/sign-up"
        style={{
          display: "inline-block", background: INK, color: "#fff",
          fontFamily: SANS, fontSize: "clamp(15px, 1.4vw, 17px)", fontWeight: 600,
          padding: "16px 44px", borderRadius: 100, textDecoration: "none",
        }}
        onClick={e => e.stopPropagation()}
      >
        Start free trial
      </a>
    </div>
  );
}

// 11 — v1 of 99
function S11() {
  return (
    <SL dark={true}>
      <span style={ol(true)}>What is coming</span>
      <h2 style={h(true)}>What you see today<br />is version 1.</h2>
      <p style={p(true)}>
        kakisewa started as a dashboard. It became a date alert. Then a full pipeline. Then WhatsApp tracking. Then tenant packs. Then property packs. Then a competitor board for lost listings.<br /><br />
        <span style={em(true)}>Every single feature came from an agent asking &ldquo;can it also do this?&rdquo;</span><br /><br />
        We are nowhere near done. What you see today is v1 of 99. We are building the next 98 with the agents who use it.
      </p>
    </SL>
  );
}

// 12 — CTA
function S12() {
  return (
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      padding: "0 clamp(28px, 8vw, 100px)", boxSizing: "border-box",
    }}>
      <p style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(0,0,0,0.22)", margin: "0 0 40px 0" }}>
        kakisewa
      </p>
      <h1 style={{ fontFamily: SERIF, fontSize: "clamp(44px, 7.5vw, 92px)", fontWeight: 400, lineHeight: 1.05, color: INK, margin: "0 0 20px 0" }}>
        Your renewal clock<br />is ticking.
      </h1>
      <p style={{ fontFamily: SANS, fontSize: "clamp(17px, 1.8vw, 22px)", color: "#6E6E73", margin: "0 0 52px 0" }}>
        How many of your listings expire in the next 90 days?
      </p>
      <a
        href="https://kakisewa.com/sign-up"
        style={{
          display: "inline-block", background: INK, color: "#fff",
          fontFamily: SANS, fontSize: "clamp(15px, 1.4vw, 17px)", fontWeight: 600,
          padding: "16px 44px", borderRadius: 100, textDecoration: "none",
          marginBottom: 24,
        }}
        onClick={e => e.stopPropagation()}
      >
        Start free trial
      </a>
      <p style={{ fontFamily: SANS, fontSize: 12, color: "rgba(0,0,0,0.2)", margin: 0 }}>kakisewa.com</p>
    </div>
  );
}

/* ─── Slide registry ─── */
const SLIDES: { id: string; dark: boolean; el: React.ReactNode }[] = [
  { id: "cover",     dark: true,  el: <S1 /> },
  { id: "race",      dark: false, el: <S2 /> },
  { id: "boss",      dark: true,  el: <S3 /> },
  { id: "ads",       dark: false, el: <S4 /> },
  { id: "farmer",    dark: true,  el: <S5 /> },
  { id: "problem",   dark: false, el: <S6 /> },
  { id: "origin",    dark: true,  el: <S7 /> },
  { id: "math",      dark: false, el: <S8 /> },
  { id: "data",      dark: true,  el: <S9 /> },
  { id: "pricing",   dark: false, el: <S10 /> },
  { id: "v1",        dark: true,  el: <S11 /> },
  { id: "cta",       dark: false, el: <S12 /> },
];

/* ─── Main deck component ─── */
export default function PitchDeck() {
  const [current, setCurrent] = useState(0);
  const [rev, setRev] = useState(0);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const total = SLIDES.length;

  const go = useCallback((i: number) => {
    if (i < 0 || i >= total) return;
    setCurrent(i);
    setRev(k => k + 1);
  }, [total]);

  const fwd = useCallback(() => go(current + 1), [go, current]);
  const bk  = useCallback(() => go(current - 1), [go, current]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", " "].includes(e.key)) { e.preventDefault(); fwd(); }
      if (["ArrowLeft", "ArrowUp"].includes(e.key))         { e.preventDefault(); bk(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [fwd, bk]);

  const dark = SLIDES[current].dark;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; }
        @keyframes kk-rise {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes kk-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
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
        {SLIDES.map((slide, i) => (
          <div
            key={slide.id}
            aria-hidden={i !== current}
            style={{
              position: "absolute", inset: 0,
              background: slide.dark ? "#1D1D1F" : "#FBFBFD",
              transform: `translateX(${(i - current) * 100}%)`,
              transition: "transform 0.55s cubic-bezier(0.86, 0, 0.07, 1)",
              willChange: "transform",
            }}
          >
            {/* Subtle gradient overlay on dark slides */}
            {slide.dark && (
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "radial-gradient(ellipse at 80% 20%, rgba(0,113,227,0.08) 0%, transparent 60%)",
              }} />
            )}
            {/* Content — re-keyed on activation to replay animation */}
            <div
              key={i === current ? `a-${rev}` : `i-${i}`}
              style={{
                width: "100%", height: "100%",
                animation: i === current ? "kk-rise 0.6s cubic-bezier(0.16,1,0.3,1) 0.18s both" : "none",
              }}
            >
              {slide.el}
            </div>
          </div>
        ))}

        {/* ── Click zones ── */}
        <div
          onClick={bk}
          style={{ position: "absolute", left: 0, top: 0, width: "18%", height: "80%", zIndex: 10, cursor: current > 0 ? "w-resize" : "default" }}
        />
        <div
          onClick={fwd}
          style={{ position: "absolute", right: 0, top: 0, width: "82%", height: "80%", zIndex: 10, cursor: current < total - 1 ? "e-resize" : "default" }}
        />

        {/* ── Dot navigation ── */}
        <div style={{
          position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 8, alignItems: "center", zIndex: 30,
        }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); go(i); }}
              style={{
                width: i === current ? 26 : 7, height: 7, borderRadius: 4,
                border: "none", padding: 0, cursor: "pointer", flexShrink: 0,
                background: dark
                  ? (i === current ? "#fff" : "rgba(255,255,255,0.22)")
                  : (i === current ? INK    : "rgba(0,0,0,0.16)"),
                transition: "width 0.35s cubic-bezier(0.34,1.56,0.64,1), background 0.3s",
              }}
            />
          ))}
        </div>

        {/* ── Slide counter ── */}
        <div style={{
          position: "absolute", bottom: 26, right: 26,
          fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
          color: dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)",
          zIndex: 30, transition: "color 0.4s", userSelect: "none",
        }}>
          {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>

        {/* ── Keyboard hint on slide 1 ── */}
        {current === 0 && (
          <div style={{
            position: "absolute", bottom: 26, left: 26,
            fontFamily: SANS, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.15)", zIndex: 30, animation: "kk-fade 1s ease 1.5s both",
            userSelect: "none",
          }}>
            ← → arrows &nbsp;·&nbsp; swipe &nbsp;·&nbsp; click
          </div>
        )}
      </div>
    </>
  );
}
