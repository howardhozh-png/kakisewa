"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePostHog } from "posthog-js/react";
import { track } from "@/lib/analytics";
import { STORY_BEATS } from "@/lib/hook-content";
import { Faq } from "./faq";
import { ComparisonSlider } from "./comparison-slider";
import { MessageCircle, Check as CheckIcon } from "lucide-react";

/* ── PixelTrail ──────────────────────────────────────────────────────────────
   Builds a grid of divs over a chapter and lights cells on mousemove.
   Cells fade back out after 900ms.
────────────────────────────────────────────────────────────────────────────── */
class PixelTrail {
  private el: HTMLElement;
  private size: number;
  private r: number; private g: number; private b: number;
  private fade: number;
  private grid: HTMLDivElement | null = null;
  private px: Array<{ div: HTMLDivElement; t: ReturnType<typeof setTimeout> | null }> = [];
  private cols = 0; private rows = 0;
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(el: HTMLElement, { size = 52, r = 0, g = 113, b = 227, fade = 900 } = {}) {
    this.el = el; this.size = size; this.r = r; this.g = g; this.b = b; this.fade = fade;
    this._build();
    el.addEventListener("mousemove", this._onMove, { passive: true });
    window.addEventListener("resize", this._onResize, { passive: true });
  }

  destroy() {
    this.el.removeEventListener("mousemove", this._onMove);
    window.removeEventListener("resize", this._onResize);
    this.grid?.remove();
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
  }

  private _build() {
    this.grid?.remove();
    const w = this.el.offsetWidth, h = this.el.offsetHeight;
    this.cols = Math.ceil(w / this.size); this.rows = Math.ceil(h / this.size);
    const g = document.createElement("div");
    Object.assign(g.style, {
      position: "absolute", inset: "0", display: "grid",
      gridTemplateColumns: `repeat(${this.cols}, ${this.size}px)`,
      overflow: "hidden", pointerEvents: "none", zIndex: "0",
    });
    this.px = [];
    for (let i = 0; i < this.cols * this.rows; i++) {
      const div = document.createElement("div");
      g.appendChild(div);
      this.px.push({ div, t: null });
    }
    this.el.prepend(g);
    this.grid = g;
  }

  private _light(row: number, col: number, alpha: number) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
    const px = this.px[row * this.cols + col]; if (!px) return;
    px.div.style.cssText = `background:rgba(${this.r},${this.g},${this.b},${alpha});transition:background 0s`;
    if (px.t) clearTimeout(px.t);
    px.t = setTimeout(() => {
      px.div.style.cssText = `background:transparent;transition:background ${this.fade}ms ease`;
    }, 60);
  }

  private _onMove = (e: MouseEvent) => {
    const rect = this.el.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / this.size);
    const row = Math.floor((e.clientY - rect.top) / this.size);
    this._light(row, col, 0.26);
    this._light(row - 1, col, 0.12); this._light(row + 1, col, 0.12);
    this._light(row, col - 1, 0.12); this._light(row, col + 1, 0.12);
    this._light(row - 1, col - 1, 0.05); this._light(row - 1, col + 1, 0.05);
    this._light(row + 1, col - 1, 0.05); this._light(row + 1, col + 1, 0.05);
  };

  private _onResize = () => {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._build(), 250);
  };
}

/* ── Configs ─────────────────────────────────────────────────────────────── */
const CH_CONFIGS = [
  { r: 0,   g: 113, b: 227 },
  { r: 255, g: 59,  b: 48  },
  { r: 0,   g: 113, b: 227 },
  { r: 0,   g: 113, b: 227 },
];

/* ── CH0 horizontal story beats (data now shared — see lib/hook-content.ts) ── */
const CH0_SLIDES = STORY_BEATS.length;

/* ── Component ───────────────────────────────────────────────────────────── */
export function LandingHero() {
  const [active, setActive]       = useState(0);
  const [revealed, setRevealed]   = useState([true, false, false, false]);
  const [ch0Slide, setCh0Slide]   = useState(0);

  const activeRef      = useRef(0);
  const ch0Touch       = useRef<{ x: number; y: number } | null>(null);
  const ch0WheelTs     = useRef(0);
  const ch0AutoStopped = useRef(false);
  const ch0 = useRef<HTMLElement>(null);
  const ch1 = useRef<HTMLElement>(null);
  const ch2 = useRef<HTMLElement>(null);
  const ch3 = useRef<HTMLElement>(null);
  const chRefs = [ch0, ch1, ch2, ch3];
  const ph = usePostHog();

  useEffect(() => {
    /* Scroll-snap on html (marketing page only — cleaned up on unmount) */
    const html = document.documentElement;
    const prev = { oy: html.style.overflowY, ox: html.style.overflowX };
    html.style.overflowY      = "scroll";
    html.style.overflowX      = "hidden";

    /* PixelTrail — desktop pointer only */
    const trails: PixelTrail[] = [];
    if (window.matchMedia("(pointer:fine)").matches) {
      chRefs.forEach((ref, i) => {
        if (ref.current) trails.push(new PixelTrail(ref.current, { size: 52, ...CH_CONFIGS[i] }));
      });
    }

    /* IntersectionObserver — chapter reveals + dot tracking */
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const idx = chRefs.findIndex(r => r.current === entry.target);
        if (idx < 0) return;
        setRevealed(prev => { const n = [...prev]; n[idx] = true; return n; });
        setActive(idx);
        activeRef.current = idx;
      });
    }, { threshold: 0.55 });

    chRefs.forEach(r => { if (r.current) io.observe(r.current); });

    /* Keyboard nav */
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        chRefs[Math.min(activeRef.current + 1, 3)]?.current?.scrollIntoView({ behavior: "smooth" });
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        chRefs[Math.max(activeRef.current - 1, 0)]?.current?.scrollIntoView({ behavior: "smooth" });
      }
      if (e.key === "ArrowRight" && activeRef.current === 0) {
        e.preventDefault();
        ch0AutoStopped.current = true;
        setCh0Slide(s => Math.min(s + 1, CH0_SLIDES - 1));
      }
      if (e.key === "ArrowLeft" && activeRef.current === 0) {
        e.preventDefault();
        ch0AutoStopped.current = true;
        setCh0Slide(s => Math.max(s - 1, 0));
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      html.style.overflowY      = prev.oy;
      html.style.overflowX      = prev.ox;
      trails.forEach(t => t.destroy());
      io.disconnect();
      document.removeEventListener("keydown", onKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = ch0.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < 10) return;
      e.preventDefault();
      const now = Date.now();
      if (now - ch0WheelTs.current < 500) return;
      ch0WheelTs.current = now;
      setCh0Slide(s => e.deltaX > 0 ? Math.min(s + 1, CH0_SLIDES - 1) : Math.max(s - 1, 0));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ch0AutoStopped.current) return;
    if (ch0Slide >= CH0_SLIDES - 1) return;
    const delay = ch0Slide === 0 ? 3500 : 4000;
    const t = setTimeout(() => setCh0Slide(s => Math.min(s + 1, CH0_SLIDES - 1)), delay);
    return () => clearTimeout(t);
  }, [ch0Slide]);

  /* ── Render ─────────────────────────────────────────────────────────────── */
  const R = (revealed: boolean) =>
    revealed
      ? { opacity: 1,   transform: "translateY(0)",    transition: "opacity 0.55s ease, transform 0.55s ease" }
      : { opacity: 0,   transform: "translateY(18px)", transition: "none" };

  const delay = (s: number, rev: boolean) => rev
    ? { ...R(true), transitionDelay: `${s}s` }
    : R(false);

  return (
    <>
      {/* ── CSS: keyframes + pseudo-elements ────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@600&display=swap');
        .kk-land * { box-sizing: border-box; margin: 0; padding: 0; }
        .kk-land-chapter {
          height: 100svh;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kk-land-nudge {
          position: absolute; bottom: 28px; left: 50%;
          transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          color: #C7C7CC; z-index: 2;
          animation: kk-nudge 2.4s ease-in-out infinite;
        }
        @keyframes kk-nudge {
          0%,100% { transform: translateX(-50%) translateY(0); opacity: 0.5; }
          50%      { transform: translateX(-50%) translateY(8px); opacity: 1; }
        }
        @keyframes kk-nudge-r {
          0%,100% { transform: translateX(0); opacity: 0.5; }
          50%      { transform: translateX(6px); opacity: 1; }
        }
        .kk-land-cta-btn::after {
          content: ''; position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
          animation: kk-sh 2.8s ease-in-out infinite;
        }
        @keyframes kk-sh { 0%{left:-100%} 60%,100%{left:160%} }
        .kk-lux-wrapper {
          overflow: hidden;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 24px, #000 calc(100% - 24px), transparent);
          mask-image: linear-gradient(90deg, transparent, #000 24px, #000 calc(100% - 24px), transparent);
        }
        @keyframes kk-lux-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .kk-land-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 26px; height: 26px; border-radius: 50%;
          background: #fff; cursor: pointer;
          border: 2.5px solid #FF3B30;
          box-shadow: 0 2px 8px rgba(255,59,48,0.3);
        }
        .kk-land-slider::-moz-range-thumb {
          width: 26px; height: 26px; border-radius: 50%;
          background: #fff; cursor: pointer; border: 2.5px solid #FF3B30;
          box-shadow: 0 2px 8px rgba(255,59,48,0.3);
        }
        .kk-land-faq-a { display: none; }
        .kk-land-faq-item.open .kk-land-faq-a { display: block; }
        .kk-land-faq-chev { transition: transform 0.25s; }
        .kk-land-faq-item.open .kk-land-faq-chev { transform: rotate(180deg); }
        @media (max-width: 640px) {
          .kk-land-feat-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .kk-land-phone-frame { width: 150px !important; height: 300px !important; }
          .kk-land-phone-inner { transform: scale(1.25) !important; }
          .kk-land-sample-note { display: none !important; }
          .kk-land-pdots { display: none !important; }
          .kk-land-wa-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .kk-land-kanban-grid { grid-template-columns: 70% 25% 25% !important; }
          /* This chapter's content (feature cards + both mockups) got taller than
             100svh once the desktop mockup was added to mobile — the other
             chapters (hero carousel, money calc, CTA) stay fixed-height since
             their layouts depend on it, but this one just flows and scrolls
             instead of clipping. */
          .kk-land-ch2 { height: auto !important; min-height: 100svh !important; overflow: visible !important; }
        }
      `}</style>

      {/* ── Fixed Nav ──────────────────────────────────────────────────────── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 300,
        height: 60, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px",
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
      }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#1D1D1F" }}>
          <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 35, lineHeight: 1 }}>k</span>
          <span style={{ display: "flex", flexDirection: "column", gap: 2, lineHeight: 1 }}>
            <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 24, letterSpacing: "-0.02em", lineHeight: 1 }}>kakisewa</span>
            <span style={{ display: "flex", justifyContent: "space-between", fontSize: 8, fontWeight: 600, opacity: 0.45, fontFamily: "'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" }}>
              <span>カ</span><span>キ</span><span>セ</span><span>ワ</span>
            </span>
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Link href="/sign-in" style={{ fontSize: 13, fontWeight: 500, color: "#6E6E73", background: "transparent", padding: "7px 15px", borderRadius: 99, textDecoration: "none" }} onClick={() => track(ph, "landing_cta_clicked", { cta: "sign_in", location: "header" })}>
            Sign in
          </Link>
          <Link href="/sign-up" style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: "var(--kk-green)", padding: "8px 18px", borderRadius: 99, textDecoration: "none" }} onClick={() => track(ph, "landing_cta_clicked", { cta: "start_trial", location: "header" })}>
            Start free trial
          </Link>
        </div>
      </header>

      {/* ── Progress Dots ──────────────────────────────────────────────────── */}
      <nav className="kk-land-pdots" style={{ position: "fixed", right: 24, top: "50%", transform: "translateY(-50%)", zIndex: 200, display: "flex", flexDirection: "column", gap: 10 }}>
        {[0,1,2,3].map(i => (
          <button
            key={i}
            onClick={() => chRefs[i]?.current?.scrollIntoView({ behavior: "smooth" })}
            style={{
              width: 6, height: 6, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer",
              background: active === i ? "#1D1D1F" : "rgba(29,29,31,0.2)",
              transform: active === i ? "scale(1.6)" : "scale(1)",
              transition: "background 0.3s, transform 0.3s",
            }}
          />
        ))}
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          CH0 — STORY (horizontal swipe)
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        ref={ch0}
        className="kk-land-chapter"
        style={{ background: "#fff" }}
        onTouchStart={(e) => {
          ch0Touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          if (!ch0Touch.current) return;
          const dx = e.changedTouches[0].clientX - ch0Touch.current.x;
          const dy = e.changedTouches[0].clientY - ch0Touch.current.y;
          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 36) {
            ch0AutoStopped.current = true;
            if (dx < 0) setCh0Slide(s => Math.min(s + 1, CH0_SLIDES - 1));
            else setCh0Slide(s => Math.max(s - 1, 0));
          }
          ch0Touch.current = null;
        }}
      >
        {/* Full-height slide track */}
        <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%", overflow: "hidden" }}>
          <div style={{
            display: "flex",
            width: `${CH0_SLIDES * 100}%`,
            height: "100%",
            transform: `translateX(-${ch0Slide * (100 / CH0_SLIDES)}%)`,
            transition: "transform 0.42s cubic-bezier(0.25,0.46,0.45,0.94)",
            willChange: "transform",
          }}>
            {STORY_BEATS.map((beat, i) => (
              <div key={i} style={{
                flex: `0 0 ${100 / CH0_SLIDES}%`,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "80px 40px 80px",
              }}>
                <div style={{ maxWidth: 920, width: "100%" }}>
                  <div style={{
                    fontFamily: "’DM Serif Display’, Georgia, serif",
                    fontSize: "clamp(3.2rem, 9vw, 7rem)",
                    lineHeight: 1.05,
                    letterSpacing: "-0.03em",
                    color: "#1D1D1F",
                    marginBottom: beat.sub ? 24 : 0,
                    ...delay(0.15, revealed[0]),
                  }}>
                    {beat.parts.map((part, j) => (
                      <span key={j} style={{ color: part.color, fontSize: part.small ? "0.55em" : undefined }}>
                        {part.text}
                      </span>
                    ))}
                  </div>
                  {beat.sub && (
                    <p style={{
                      fontSize: 14,
                      fontStyle: "italic",
                      lineHeight: 1.6,
                      color: "#AEAEB2",
                      maxWidth: 480,
                      ...delay(0.3, revealed[0]),
                    }}>
                      {beat.sub}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fixed slide nav — single row, doesn't animate with track */}
        <div style={{
          position: "absolute", bottom: 48, left: 0, right: 0,
          display: "flex", justifyContent: "center", zIndex: 3,
          padding: "0 40px",
          pointerEvents: "none",
        }}>
          <div style={{ maxWidth: 920, width: "100%", display: "flex", alignItems: "center", gap: 12, pointerEvents: "auto" }}>
            <button
              onClick={() => { ch0AutoStopped.current = true; setCh0Slide(s => Math.max(s - 1, 0)); }}
              aria-label="Previous slide"
              disabled={ch0Slide === 0}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(29,29,31,0.07)", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: ch0Slide === 0 ? 0.2 : 0.8, flexShrink: 0, padding: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <div style={{ display: "flex", gap: 6 }}>
              {STORY_BEATS.map((_, j) => (
                <button
                  key={j}
                  aria-label={`Slide ${j + 1}`}
                  onClick={() => { ch0AutoStopped.current = true; setCh0Slide(j); }}
                  style={{
                    width: j === ch0Slide ? 20 : 6,
                    height: 6, borderRadius: 3,
                    background: j === ch0Slide ? "#1D1D1F" : "rgba(29,29,31,0.15)",
                    border: "none", padding: 0, cursor: "pointer",
                    transition: "all 0.3s ease", flexShrink: 0,
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => { ch0AutoStopped.current = true; setCh0Slide(s => Math.min(s + 1, CH0_SLIDES - 1)); }}
              aria-label="Next slide"
              disabled={ch0Slide === CH0_SLIDES - 1}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(29,29,31,0.07)", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: ch0Slide === CH0_SLIDES - 1 ? 0.2 : 0.8, flexShrink: 0, padding: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Swipe nudge (slides 0–2) / Scroll nudge (last slide) */}
        {ch0Slide < CH0_SLIDES - 1 ? (
          <div style={{
            position: "absolute", bottom: 28, right: 40,
            display: "flex", alignItems: "center", gap: 6,
            color: "#C7C7CC", zIndex: 2,
            animation: "kk-nudge-r 2.4s ease-in-out infinite",
          }}>
            <span style={{ fontSize: 9, letterSpacing: "0.13em", textTransform: "uppercase" }}>swipe</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        ) : (
          <div className="kk-land-nudge" style={{ zIndex: 2 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
            <span style={{ fontSize: 9, letterSpacing: "0.13em", textTransform: "uppercase" }}>scroll</span>
          </div>
        )}
      </section>

      {/* ── PIVOT — the one turn from pain to solution, ties directly to the
             number the visitor just saw above ──────────────────────────────── */}
      <section style={{ background: "#fff", borderTop: "1px solid #E5E5EA", padding: "56px 40px 0" }}>
        <p style={{
          textAlign: "center", maxWidth: 560, margin: "0 auto",
          fontSize: "clamp(1.1rem, 1.8vw, 1.3rem)", color: "#1D1D1F", lineHeight: 1.5, fontWeight: 500,
        }}>
          That number is real. Here is exactly what changes it.
        </p>
      </section>

      {/* ── COMPARISON SLIDER — the experience, not a description of it ───────── */}
      <section style={{ background: "#fff", padding: "40px 40px 56px" }}>
        <ComparisonSlider />
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          CH2 — KAKISEWA
      ══════════════════════════════════════════════════════════════════════ */}
      <section ref={ch2} className="kk-land-chapter kk-land-ch2" style={{ background: "#fff" }}>
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1000, padding: "80px 40px 48px" }}>

          {/* Short label — the 3-feature text grid was cut, it restated what the
              comparison slider and WhatsApp callout already showed visually. */}
          <div style={{ textAlign: "center", marginBottom: 20, ...delay(0.1, revealed[2]) }}>
            <span style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#C7C7CC", marginBottom: 10 }}>
              On your phone
            </span>
          </div>

          {/* SAMPLE badge */}
          <div style={{ textAlign: "center", marginBottom: 14, ...delay(0.2, revealed[2]) }}>
            <span style={{ display: "inline-block", padding: "4px 14px", background: "rgba(255,149,0,0.1)", border: "1px solid rgba(255,149,0,0.3)", borderRadius: 99, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#C47800" }}>
              Sample
            </span>
          </div>

          {/* Phone mockup — the browser mockup was cut; the comparison slider above
              already covers "here's a screen of the app," this is the one thing it
              doesn't cover: what it looks like installed on your phone. */}
          <div className="kk-land-mockup-pair" style={{ display: "flex", justifyContent: "center", ...delay(0.3, revealed[2]) }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div className="kk-land-phone-frame" style={{ width: 180, height: 360, flexShrink: 0, borderRadius: 28, background: "#1A1A1C", border: "4px solid #2C2C2E", boxShadow: "0 0 0 1px rgba(255,255,255,0.07)", overflow: "hidden", position: "relative" }}>
                <div className="kk-land-phone-inner" style={{ width: 120, height: 242, transform: "scale(1.5)", transformOrigin: "top left", background: "#FBFBFD", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  {/* Nav */}
                  <div style={{ background: "#fff", borderBottom: "1px solid #E5E5EA", padding: "6px 8px", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: "#1D1D1F", lineHeight: 1, fontWeight: 300 }}>&#9776;</span>
                    <span style={{ fontFamily: "'DM Serif Display',Georgia,serif", fontSize: 9, color: "#1D1D1F", flex: 1, lineHeight: 1 }}>k kakisewa</span>
                    <span style={{ fontSize: 5, fontWeight: 700, background: "#B8922E", color: "#fff", padding: "1px 4px", borderRadius: 3, letterSpacing: ".04em" }}>ELITE</span>
                    <div style={{ position: "relative", flexShrink: 0, marginLeft: 2 }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#6E6E73" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                      <div style={{ position: "absolute", top: -2, right: -2, width: 5, height: 5, background: "#FF3B30", borderRadius: "50%" }} />
                    </div>
                  </div>
                  {/* Availability card */}
                  <div style={{ background: "#fff", margin: 5, borderRadius: 7, padding: 7, border: "1px solid #E5E5EA", flexShrink: 0 }}>
                    <div style={{ fontSize: 5, fontWeight: 600, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 2 }}>Property Availability · 12 Months</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-.02em", lineHeight: 1, marginBottom: 1 }}>RM 18,000</div>
                    <div style={{ fontSize: 5, color: "#6E6E73", marginBottom: 5 }}>6 properties · 100% commission</div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 20, marginBottom: 3 }}>
                      {[90, 3, 60, 35, 3, 3].map((h, i) => (
                        <div key={i} style={{ flex: 1, background: h > 10 ? "#AEAEB2" : "#E5E5EA", borderRadius: "2px 2px 0 0", height: `${h}%` }} />
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 2, fontSize: 4, color: "#AEAEB2" }}>
                      {["Jun","Jul","Aug","Sep","Oct","Nov"].map(m => <div key={m} style={{ flex: 1 }}>{m}</div>)}
                    </div>
                  </div>
                  {/* Search */}
                  <div style={{ margin: "0 5px 4px", background: "#fff", border: "1px solid #E5E5EA", borderRadius: 5, padding: "4px 7px", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <span style={{ fontSize: 6, color: "#AEAEB2" }}>Search...</span>
                  </div>
                  {/* Card 1 */}
                  <div style={{ margin: "0 5px 4px", background: "#fff", border: "1px solid #E5E5EA", borderRadius: 7, padding: 6, flexShrink: 0 }}>
                    <div style={{ display: "flex", gap: 5, alignItems: "flex-start", marginBottom: 4 }}>
                      <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=48&h=48&fit=crop&auto=format" style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, objectFit: "cover" }} alt="" />
                      <div>
                        <div style={{ fontSize: 7, fontWeight: 700, color: "#1D1D1F", lineHeight: 1.2 }}>Ritze Perdana</div>
                        <div style={{ fontSize: 6, color: "#6E6E73" }}>Unit 11C · RM 2,400/mo</div>
                        <div style={{ fontSize: 5, color: "#AEAEB2", marginTop: 1 }}>Michelle Ong Cheng Bee</div>
                      </div>
                    </div>
                    <div style={{ background: "rgba(52,199,89,0.1)", borderRadius: 4, padding: "3px 5px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 6, fontWeight: 600, color: "#1F8B4C" }}>&#10003; Tenant confirmed</span>
                      <span style={{ fontSize: 8, color: "#1F8B4C" }}>&#8594;</span>
                    </div>
                  </div>
                  {/* Card 2 */}
                  <div style={{ margin: "0 5px", background: "#fff", border: "1px solid #E5E5EA", borderRadius: 7, padding: 6, flexShrink: 0 }}>
                    <div style={{ display: "flex", gap: 5, alignItems: "flex-start" }}>
                      <img src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=48&h=48&fit=crop&auto=format" style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, objectFit: "cover" }} alt="" />
                      <div>
                        <div style={{ fontSize: 7, fontWeight: 700, color: "#1D1D1F", lineHeight: 1.2 }}>The Greens Subang</div>
                        <div style={{ fontSize: 6, color: "#6E6E73" }}>Unit 8-01 · RM 2,100/mo</div>
                        <div style={{ fontSize: 5, color: "#AEAEB2", marginTop: 1 }}>Helen Tan Bee Choo</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#C7C7CC" }}>PWA</div>
            </div>
          </div>

          <p className="kk-land-sample-note" style={{ fontSize: 11, color: "#C7C7CC", marginTop: 10, ...delay(0.44, revealed[2]) }}>
            Sample data for illustration only.
          </p>
        </div>
      </section>

      {/* ── WHATSAPP CALLOUT — third supporting proof beat, after desktop+phone ── */}
      <section style={{ background: "#FBFBFD", padding: "56px 40px 88px" }}>
        <div style={{
          maxWidth: 720, margin: "0 auto",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center",
        }}
        className="kk-land-wa-grid"
        >
          <div>
            <span style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#C7C7CC", marginBottom: 14 }}>
              On your own schedule
            </span>
            <h3 style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "clamp(1.5rem, 2.6vw, 1.9rem)", letterSpacing: "-0.02em", color: "#1D1D1F",
              marginBottom: 12, lineHeight: 1.2,
            }}>
              Send WhatsApp outreach whenever you are free.
            </h3>
            <p style={{ fontSize: 14, color: "#6E6E73", lineHeight: 1.6 }}>
              Branded templates, ready whenever you open the app. No pressure to reply instantly, no one waiting on you.
            </p>
          </div>
          <div style={{
            background: "#E5DDD5", borderRadius: 18, padding: 20,
            boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
          }}>
            <div style={{
              background: "#DCF8C6", borderRadius: "12px 12px 2px 12px",
              padding: "10px 12px", marginLeft: "18%",
            }}>
              <p style={{ fontSize: 12.5, color: "#1D1D1F", lineHeight: 1.5 }}>
                Hi Puan Rozita, your tenancy at Cheras Hartamas renews in 60 days. Let me know if you would like to continue or if I should start finding a new tenant.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 3, marginTop: 4 }}>
                <span style={{ fontSize: 10, color: "#667781" }}>1:42 PM</span>
                <CheckIcon style={{ width: 12, height: 12, color: "#53BDEB" }} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, opacity: 0.6 }}>
              <MessageCircle style={{ width: 13, height: 13, color: "#075E54" }} />
              <span style={{ fontSize: 10.5, color: "#075E54", fontWeight: 600 }}>Sent from renewal template</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          CH3 — CTA
      ══════════════════════════════════════════════════════════════════════ */}
      <section ref={ch3} className="kk-land-chapter" style={{ background: "#fff" }}>
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 720, padding: "80px 40px 48px", textAlign: "center" }}>
          <h2 style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "clamp(2.4rem, 6vw, 4.25rem)",
            lineHeight: 1.08, letterSpacing: "-0.03em", color: "#1D1D1F",
            marginBottom: 18,
            ...delay(0.1, revealed[3]),
          }}>
            kakisewa starts at <span style={{ color: "#34C759" }}>RM1/day.</span>
          </h2>
          <p style={{ fontSize: 17, color: "#AEAEB2", marginBottom: 52, lineHeight: 1.5, ...delay(0.26, revealed[3]) }}>
            2 months free to start. Cancel anytime.
          </p>
          <div style={delay(0.4, revealed[3])}>
            <Link
              href="/sign-up"
              className="kk-land-cta-btn"
              onClick={() => track(ph, "landing_cta_clicked", { cta: "start_trial", location: "hero" })}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: "#34C759", color: "#fff",
                fontSize: 16, fontWeight: 600,
                padding: "16px 40px", borderRadius: 99,
                textDecoration: "none", letterSpacing: "-0.01em",
                position: "relative", overflow: "hidden",
              }}
            >
              Start free trial
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
          <p style={{ marginTop: 22, fontSize: 13, color: "#AEAEB2", ...delay(0.54, revealed[3]) }}>
            Already have an account?{" "}
            <Link href="/sign-in" style={{ color: "#6E6E73", textDecoration: "underline", textUnderlineOffset: 3 }}>Sign in</Link>
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section style={{ background: "#FBFBFD", borderTop: "1px solid #E5E5EA", padding: "80px 40px 88px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "clamp(1.6rem, 3vw, 2.2rem)", letterSpacing: "-0.022em", color: "#1D1D1F", marginBottom: 48,
          }}>
            Common questions
          </h2>
          <Faq />
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer style={{ background: "#fff", borderTop: "1px solid #E5E5EA", padding: "24px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 18, color: "#1D1D1F" }}>k kakisewa</span>
        <span style={{ fontSize: 12, color: "#AEAEB2" }}>&copy; 2026 kakisewa</span>
        <div style={{ display: "flex", gap: 20 }}>
          {[["Terms", "/terms"], ["Privacy", "/privacy"], ["Sign in", "/sign-in"], ["Start trial", "/sign-up"]].map(([l, h]) => (
            <Link key={l} href={h} style={{ fontSize: 12, color: "#AEAEB2", textDecoration: "none" }}
              onClick={() => (l === "Sign in" || l === "Start trial") && track(ph, "landing_cta_clicked", { cta: l === "Sign in" ? "sign_in" : "start_trial", location: "footer" })}
            >{l}</Link>
          ))}
        </div>
      </footer>
    </>
  );
}
