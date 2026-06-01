import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { SolutionCards } from "./solution-cards";

interface Comparison {
  before: string;
  after: string;
}

const COMPARISONS: Comparison[] = [
  {
    before: "Tracks owner interest manually on Excel — no visibility on who responded or dropped off",
    after: "KakiSewa auto-tracks every owner response and pings you the moment interest comes in",
  },
  {
    before: "Memorises (or forgets) contract expiry dates across dozens of listings — finds out too late",
    after: "Automatic 60-day reminder so you follow up first, before another agent takes your listing",
  },
  {
    before: "Sends tenant profiles one-by-one on WhatsApp with no branding — looks like everyone else",
    after: "One branded tenant pack link. Owner picks from a shortlist. You close without the back-and-forth.",
  },
  {
    before: "Hard to look professional or trustworthy, especially with new owners who don't know you",
    after: "First message already looks like a top agency — structured owner form + polished tenant pack from day one",
  },
];

function BrandMark({ size = 32, dark = true }: { size?: number; dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" style={{ color: dark ? "var(--kk-ink)" : "#fff" }}>
      <Logo size={size} />
      <span className="serif tracking-tight leading-none" style={{ fontSize: size * 0.625 }}>
        kakisewa
      </span>
    </span>
  );
}

interface Point {
  num: string;
  hook: React.ReactNode;
  quote: string;
  role: string;
  bg: string;
}

const POINTS: Point[] = [
  {
    num: "01",
    hook: (
      <>
        You&rsquo;re leaking{" "}
        <span style={{ color: "#DC2626" }}>−RM 6,000</span>
        {" "}every month.{" "}
        <span style={{ color: "var(--kk-ink-mute)" }}>You just don&rsquo;t know it.</span>
      </>
    ),
    quote: "I forgot which contract was expiring. Found out when the owner texted me asking for a new tenant. Someone else was already showing the unit by then.",
    role: "Property agent · 6 years · Kuala Lumpur",
    bg: "var(--kk-bg)",
  },
  {
    num: "02",
    hook: (
      <>
        2–3 hours{" "}
        <span style={{ color: "#DC2626" }}>managing leads</span>
        {" "}
        <span style={{ color: "var(--kk-ink-mute)" }}>without clear interest tracking.</span>
      </>
    ),
    quote: "I had no idea who was still interested. Just names on WhatsApp and gut feel. No stages, no history. I still missed deals.",
    role: "Independent negotiator · 4 years · Petaling Jaya",
    bg: "var(--kk-surface-2)",
  },
  {
    num: "03",
    hook: (
      <>
        Every lead you can&rsquo;t track is{" "}
        <span style={{ color: "#DC2626" }}>income you&rsquo;ll never see.</span>
      </>
    ),
    quote: "I keep feeling like money is slipping through my fingers but I can't prove it. I don't even know how many deals I've lost because I had no system to follow up.",
    role: "Real estate agent · 3 years · Shah Alam",
    bg: "var(--kk-bg)",
  },
];

export default function LandingPage() {
  return (
    <main style={{ background: "var(--kk-bg)", color: "var(--kk-ink)" }}>

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 lg:px-12 py-3.5"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--kk-line)",
        }}
      >
        <Link href="/"><BrandMark size={28} /></Link>
        <div className="flex items-center gap-5">
          <Link href="/sign-in" className="font-medium transition-opacity hover:opacity-60" style={{ fontSize: "var(--kk-body)", color: "var(--kk-ink-mute)" }}>
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="px-5 py-2 rounded-full font-semibold transition-opacity hover:opacity-90"
            style={{ background: "var(--kk-ink)", color: "#fff", fontSize: "var(--kk-body)" }}
          >
            Start free trial
          </Link>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="px-6 lg:px-12 pt-24 pb-28 text-center" style={{ background: "var(--kk-bg)" }}>
        <h1
          className="serif mx-auto"
          style={{ fontSize: "clamp(3rem, 7vw, 6rem)", lineHeight: 1.05, letterSpacing: "-0.025em", maxWidth: "18ch", marginBottom: 36 }}
        >
          Make more money from property{" "}
          <span style={{ color: "var(--kk-green)" }}>with kakisewa.</span>
        </h1>

        <p
          className="mx-auto mb-10"
          style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)", color: "var(--kk-ink-mute)", lineHeight: 1.6, maxWidth: "48ch" }}
        >
          Other agents track renewals on Excel, forget expiry dates, and lose listings.
          kakisewa handles it for you — automatically.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold transition-opacity hover:opacity-90"
            style={{ background: "var(--kk-ink)", color: "#fff", fontSize: "var(--kk-body-lg)" }}
          >
            Start free trial <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#calculator"
            className="px-8 py-3.5 rounded-full font-semibold transition-opacity hover:opacity-70"
            style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)", fontSize: "var(--kk-body-lg)" }}
          >
            See how it works
          </a>
        </div>
      </section>

      {/* ── 3 Pain Points ─────────────────────────────────────────────────── */}
      <section className="px-6 lg:px-10 py-20 lg:py-28" style={{ background: "var(--kk-bg)", borderTop: "1px solid var(--kk-line)" }}>
        <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-3 lg:divide-x divide-[color:var(--kk-line)]">
          {POINTS.map((pt, i) => (
            <div
              key={pt.num}
              className={`text-center flex flex-col py-12 lg:py-0${i > 0 ? " border-t lg:border-t-0" : ""}`}
              style={{
                paddingLeft: i > 0 ? "clamp(2.5rem, 5vw, 5rem)" : 0,
                paddingRight: i < 2 ? "clamp(2.5rem, 5vw, 5rem)" : 0,
              }}
            >
              <p
                className="serif font-black"
                style={{
                  fontSize: "clamp(3.5rem, 5vw, 5.5rem)",
                  color: "var(--kk-line-strong)",
                  lineHeight: 1,
                  marginBottom: "1.75rem",
                  letterSpacing: "-0.04em",
                }}
              >
                {pt.num}
              </p>
              <h2
                className="serif mb-5"
                style={{
                  fontSize: "clamp(1.7rem, 2.2vw, 2.6rem)",
                  lineHeight: 1.15,
                  letterSpacing: "-0.022em",
                  color: "var(--kk-ink)",
                }}
              >
                {pt.hook}
              </h2>
              <p
                className="mb-4"
                style={{
                  fontSize: "clamp(0.78rem, 0.9vw, 0.88rem)",
                  color: "var(--kk-ink-faint)",
                  fontStyle: "italic",
                  lineHeight: 1.75,
                }}
              >
                &ldquo;{pt.quote}&rdquo;
              </p>
              <p
                style={{
                  fontSize: "var(--kk-xs)",
                  color: "var(--kk-ink-faint)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  marginTop: "auto",
                  opacity: 0.6,
                }}
              >
                {pt.role}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Today vs KakiSewa ─────────────────────────────────────────────── */}
      <section className="px-6 lg:px-12 py-24" style={{ background: "#fff", borderTop: "1px solid var(--kk-line)" }}>
        <div className="max-w-[960px] mx-auto">
          <div className="text-center mb-14">
            <p
              className="uppercase font-semibold mb-5"
              style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.14em" }}
            >
              The difference
            </p>
            <h2
              className="serif mx-auto"
              style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.022em", maxWidth: "28ch" }}
            >
              How agents work{" "}
              <span style={{ color: "#DC2626" }}>today</span>{" "}
              vs{" "}
              <span style={{ color: "var(--kk-green)" }}>with kakisewa</span>
            </h2>
          </div>

          {/* Column headers */}
          <div
            className="grid gap-px mb-px"
            style={{ gridTemplateColumns: "1fr 1fr", background: "var(--kk-line)" }}
          >
            <div className="flex items-center gap-2 px-7 py-3.5" style={{ background: "#FEF2F2" }}>
              <span style={{ fontSize: "1rem" }}>✕</span>
              <span
                className="font-semibold uppercase tracking-widest"
                style={{ fontSize: "var(--kk-xs)", color: "#DC2626", letterSpacing: "0.12em" }}
              >
                Agents today
              </span>
            </div>
            <div className="flex items-center gap-2 px-7 py-3.5" style={{ background: "#F0FDF4" }}>
              <span style={{ fontSize: "1rem", color: "var(--kk-green)" }}>✓</span>
              <span
                className="font-semibold uppercase tracking-widest"
                style={{ fontSize: "var(--kk-xs)", color: "var(--kk-green)", letterSpacing: "0.12em" }}
              >
                With kakisewa
              </span>
            </div>
          </div>

          {/* Comparison rows */}
          {COMPARISONS.map((row, i) => (
            <div
              key={i}
              className="grid gap-px mb-px"
              style={{ gridTemplateColumns: "1fr 1fr", background: "var(--kk-line)" }}
            >
              <div
                className="flex items-start gap-3 px-7 py-6"
                style={{ background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}
              >
                <span style={{ color: "#DC2626", fontSize: "0.875rem", marginTop: "0.2rem", flexShrink: 0 }}>✕</span>
                <p style={{ fontSize: "var(--kk-sm)", lineHeight: 1.65, color: "var(--kk-ink-mute)" }}>{row.before}</p>
              </div>
              <div
                className="flex items-start gap-3 px-7 py-6"
                style={{ background: i % 2 === 0 ? "#F9FFF9" : "#F4FCF4" }}
              >
                <span style={{ color: "var(--kk-green)", fontSize: "0.875rem", marginTop: "0.2rem", flexShrink: 0 }}>✓</span>
                <p style={{ fontSize: "var(--kk-sm)", lineHeight: 1.65, color: "var(--kk-ink)", fontWeight: 500 }}>{row.after}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Solution ──────────────────────────────────────────────────────── */}
      <section className="px-6 lg:px-12 py-24" style={{ background: "var(--kk-surface-2)", borderTop: "1px solid var(--kk-line)" }}>
        <div className="max-w-[1100px] mx-auto">
          <h2
            className="serif mb-16"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.08, letterSpacing: "-0.022em", maxWidth: "22ch" }}
          >
            Stop losing deals to agents with better tools.
          </h2>
          <SolutionCards />
        </div>
      </section>

      {/* ── Numbers ───────────────────────────────────────────────────────── */}
      <section id="calculator" className="px-6 lg:px-12 py-20 lg:py-24" style={{ background: "var(--kk-surface-2)", borderTop: "1px solid var(--kk-line)" }}>
        <div className="max-w-[1400px] mx-auto">

          <p className="font-semibold tracking-widest uppercase mb-12 text-center"
            style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.14em" }}>
            The math behind your decision
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-px" style={{ background: "var(--kk-line)" }}>

            {/* Stat 1 — The problem */}
            <div className="px-8 py-10" style={{ background: "var(--kk-surface-2)" }}>
              <p className="serif font-black tabular-nums mb-3" style={{ fontSize: "clamp(2.6rem, 4vw, 3.5rem)", color: "#DC2626", letterSpacing: "-0.04em", lineHeight: 1 }}>
                −RM 6,000
              </p>
              <p className="mb-5" style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.6 }}>
                On average, a Malaysian property agent misses <strong style={{ color: "var(--kk-ink)" }}>RM 6,000 every month</strong> without realising it.
              </p>
              <div className="flex items-center gap-6">
                <div>
                  <p className="tabular-nums font-bold" style={{ fontSize: "1rem", color: "var(--kk-ink)" }}>RM 2,000</p>
                  <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", marginTop: 2 }}>from missed renewals</p>
                </div>
                <span style={{ color: "var(--kk-line-strong)", fontSize: "1.2rem", fontWeight: 300 }}>+</span>
                <div>
                  <p className="tabular-nums font-bold" style={{ fontSize: "1rem", color: "var(--kk-ink)" }}>RM 4,000</p>
                  <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", marginTop: 2 }}>from missed leads</p>
                </div>
              </div>
            </div>

            {/* Stat 2 — The ROI */}
            <div className="px-8 py-10" style={{ background: "var(--kk-surface-2)" }}>
              <p className="serif font-black mb-3" style={{ fontSize: "clamp(2.6rem, 4vw, 3.5rem)", color: "var(--kk-green)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                10 months free
              </p>
              <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.6 }}>
                Capture just <strong style={{ color: "var(--kk-ink)" }}>1 missed renewal at RM 2,000</strong> and kakisewa is essentially free for 10 months on Silver, 5 months on Platinum, 4 months on Elite. Every renewal and lead captured after that are pure profit.
              </p>
            </div>

            {/* Stat 3 — The scale proof */}
            <div className="px-8 py-10" style={{ background: "var(--kk-surface-2)" }}>
              <p className="serif font-black mb-3" style={{ fontSize: "clamp(2.6rem, 4vw, 3.5rem)", color: "var(--kk-ink)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                50% miss rate
              </p>
              <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.6, marginBottom: "1rem" }}>
                Property agents on average miss <strong style={{ color: "var(--kk-ink)" }}>50% of renewals</strong> due to lack of tracking. kakisewa helps you capture all of them.
              </p>
              <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.6 }}>
                Agents with ~20 listings will have an additional <strong style={{ color: "var(--kk-ink)" }}>~10 renewals captured</strong> — that&apos;s around <strong style={{ color: "var(--kk-ink)" }}>RM 20,000 per year</strong>, or RM 1,667 per month.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="px-6 lg:px-12 py-28 text-center" style={{ background: "var(--kk-ink)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-[560px] mx-auto">
          <div className="flex justify-center mb-8"><BrandMark size={32} dark={false} /></div>
          <h2 className="serif text-white mb-4" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.022em" }}>
            Your first closed renewal<br />pays for the whole year.
          </h2>
          <p className="mb-10" style={{ fontSize: "var(--kk-body-lg)", color: "rgba(255,255,255,0.5)", maxWidth: "38ch", margin: "0 auto 40px" }}>
            One plan. Everything included. Beta pricing locked in for early adopters.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#fff", color: "var(--kk-ink)", fontSize: "var(--kk-body-lg)" }}
          >
            Start free trial <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer
        className="px-6 lg:px-12 py-8 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ background: "var(--kk-surface)", borderTop: "1px solid var(--kk-line)" }}
      >
        <BrandMark size={24} />
        <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>© {new Date().getFullYear()} kakisewa</p>
        <div className="flex items-center gap-5">
          <Link href="/terms" className="transition-opacity hover:opacity-70" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>Terms</Link>
          <Link href="/privacy" className="transition-opacity hover:opacity-70" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>Privacy</Link>
          <Link href="/sign-in" className="transition-opacity hover:opacity-70" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>Sign in</Link>
          <Link href="/sign-up" className="transition-opacity hover:opacity-70" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>Start free trial</Link>
        </div>
      </footer>
    </main>
  );
}
