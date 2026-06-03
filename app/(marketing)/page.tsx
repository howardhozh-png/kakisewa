import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { HowItWorks } from "./how-it-works";
import { Faq } from "./faq";
import { SeeHowButton } from "./see-how-button";

const X = () => <span style={{ color: "#DC2626", fontWeight: 900, fontSize: "1.1em", marginRight: 6 }}>✗</span>;
const V = () => <span style={{ color: "#16a34a", fontWeight: 900, fontSize: "1.1em", marginRight: 6 }}>✓</span>;

interface Comparison {
  before: React.ReactNode;
  after: React.ReactNode;
}

const COMPARISONS: Comparison[] = [
  {
    before: <><X />Closes a deal. Earns nothing when it renews.</>,
    after: <><V /><strong>Every renewal = half a month's rent.</strong> Tracked automatically.</>,
  },
  {
    before: <><X />No idea which contracts expire next month. Or next year.</>,
    after: <><V /><strong>60-day alert.</strong> You follow up before anyone else does.</>,
  },
  {
    before: <><X />Zero visibility into income 6, 12, 24 months from now.</>,
    after: <><V /><strong>See your full pipeline 1-3 years ahead.</strong> Plan, don't react.</>,
  },
  {
    before: <><X />Texts owners. No brand. No tracking. Low reply rate.</>,
    after: <><V /><strong>Branded profile.</strong> Owners know who you are before they reply.</>,
  },
  {
    before: <><X />Sends tenant profiles one by one. Looks like spam.</>,
    after: <><V /><strong>One tenant pack link.</strong> Owners take you seriously instantly.</>,
  },
];

function BrandMark({ size = 32, dark = true }: { size?: number; dark?: boolean }) {
  return (
    <span style={{ color: dark ? "var(--kk-ink)" : "#fff" }}>
      <Logo variant="wordmark" size={size} />
    </span>
  );
}

interface Point {
  num: string;
  hook: React.ReactNode;
  quote: string;
  role: string;
}

const POINTS: Point[] = [
  {
    num: "01",
    hook: (
      <>
        You&rsquo;re losing{" "}
        <span style={{ color: "#DC2626" }}>passive income</span>
        {" "}every month.{" "}
        <span style={{ color: "var(--kk-ink-mute)" }}>You just can&rsquo;t see it.</span>
      </>
    ),
    quote: "I forgot which contract was expiring. Found out when the owner texted asking for a new tenant. Someone else was already showing the unit. That renewal commission was mine and I lost it.",
    role: "Property agent · 6 years · Kuala Lumpur",
  },
  {
    num: "02",
    hook: (
      <>
        You can&rsquo;t see{" "}
        <span style={{ color: "#DC2626" }}>the next 3 years</span>
        {" "}
        <span style={{ color: "var(--kk-ink-mute)" }}>of your own income.</span>
      </>
    ),
    quote: "I had no idea which contracts were expiring or which owners would be free in 6 months. I was always reacting. kakisewa shows me the next 2 years at a glance.",
    role: "Independent negotiator · 4 years · Petaling Jaya",
  },
  {
    num: "03",
    hook: (
      <>
        Sending WhatsApp texts to owners.{" "}
        <span style={{ color: "#DC2626" }}>No brand, no tracking.</span>
        {" "}
        <span style={{ color: "var(--kk-ink-mute)" }}>Converting far fewer leads than you should.</span>
      </>
    ),
    quote: "I'd send 10 WhatsApp messages and get 1 reply. Once I started using a branded tenant pack link, owners responded faster and took me more seriously. Conversion went up straight away.",
    role: "Senior negotiator · 5 years · Subang Jaya",
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
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="font-medium transition-opacity hover:opacity-60 whitespace-nowrap" style={{ fontSize: 13, color: "var(--kk-ink-mute)" }}>
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 rounded-full font-semibold transition-opacity hover:opacity-90 whitespace-nowrap"
            style={{ background: "var(--kk-ink)", color: "#fff", fontSize: 13 }}
          >
            Free trial
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
          Renewal commission is passive income. Most agents leave it on the table
          because they have no system. kakisewa makes sure you never miss another one.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold transition-opacity hover:opacity-90"
            style={{ background: "var(--kk-ink)", color: "#fff", fontSize: "var(--kk-body-lg)" }}
          >
            Start trial, expiring soon <ArrowRight className="w-4 h-4" />
          </Link>
          <SeeHowButton />
        </div>
      </section>

      {/* ── 3 Pain Points ─────────────────────────────────────────────────── */}
      <section className="px-6 lg:px-10 py-20 lg:py-28" style={{ background: "var(--kk-surface-2)", borderTop: "1px solid var(--kk-line)" }}>
        <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-3 lg:divide-x divide-[color:var(--kk-line)]">
          {POINTS.map((pt, i) => (
            <div
              key={pt.num}
              className={[
                "text-center flex flex-col py-12 lg:py-0 px-6 sm:px-12",
                i === 0 ? "lg:pl-0 lg:pr-[clamp(2.5rem,5vw,5rem)]" : "",
                i === 1 ? "lg:px-[clamp(2.5rem,5vw,5rem)]" : "",
                i === 2 ? "lg:pr-0 lg:pl-[clamp(2.5rem,5vw,5rem)]" : "",
                i > 0 ? "border-t lg:border-t-0" : "",
              ].filter(Boolean).join(" ")}
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
      <section id="comparison" className="px-6 lg:px-12 py-24" style={{ background: "#fff", borderTop: "1px solid var(--kk-line)" }}>
        <div className="max-w-[960px] mx-auto">
          <div className="text-center mb-14">
            <p
              className="uppercase font-semibold mb-5"
              style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.14em" }}
            >
              The income gap
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
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="px-4 sm:px-7 py-4" style={{ borderTop: "3px solid #DC2626" }}>
              <span
                className="font-semibold uppercase"
                style={{ fontSize: "var(--kk-xs)", color: "#DC2626", letterSpacing: "0.12em" }}
              >
                Agents today
              </span>
            </div>
            <div className="px-4 sm:px-7 py-4" style={{ borderTop: "3px solid var(--kk-green)", borderLeft: "1px solid var(--kk-line)" }}>
              <span
                className="font-semibold uppercase"
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
              className="grid"
              style={{ gridTemplateColumns: "1fr 1fr", borderTop: "1px solid var(--kk-line)" }}
            >
              <div
                className="px-4 sm:px-7 py-5 sm:py-6"
                style={{ background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}
              >
                <p style={{ fontSize: "var(--kk-sm)", lineHeight: 1.65, color: "var(--kk-ink-mute)" }}>{row.before}</p>
              </div>
              <div
                className="px-4 sm:px-7 py-5 sm:py-6"
                style={{ background: i % 2 === 0 ? "#fff" : "#FAFAFA", borderLeft: "1px solid var(--kk-line)" }}
              >
                <p style={{ fontSize: "var(--kk-sm)", lineHeight: 1.65, color: "var(--kk-ink)" }}>{row.after}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="px-6 lg:px-12 py-24" style={{ background: "var(--kk-surface-2)", borderTop: "1px solid var(--kk-line)" }}>
        <div className="max-w-[1100px] mx-auto">
          <h2
            className="serif mb-16"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.08, letterSpacing: "-0.022em", maxWidth: "22ch" }}
          >
            Set up in minutes.<br />See results in days.
          </h2>
          <HowItWorks />
        </div>
      </section>

      {/* ── Numbers ───────────────────────────────────────────────────────── */}
      <section id="calculator" className="px-6 lg:px-12 py-20 lg:py-24" style={{ background: "#fff", borderTop: "1px solid var(--kk-line)" }}>
        <div className="max-w-[1400px] mx-auto">

          <p className="font-semibold tracking-widest uppercase mb-12 text-center"
            style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.14em" }}>
            The math behind your decision
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-px" style={{ background: "var(--kk-line)" }}>

            <div className="px-8 py-10" style={{ background: "#fff" }}>
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

            <div className="px-8 py-10" style={{ background: "#fff" }}>
              <p className="serif font-black mb-3" style={{ fontSize: "clamp(2.6rem, 4vw, 3.5rem)", color: "var(--kk-green)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                10 months free
              </p>
              <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.6 }}>
                Capture just <strong style={{ color: "var(--kk-ink)" }}>1 missed renewal at RM 2,000</strong> and kakisewa is essentially free for 10 months on Silver, 5 months on Platinum, 4 months on Elite. Every renewal and lead captured after that are pure profit.
              </p>
            </div>

            <div className="px-8 py-10" style={{ background: "#fff" }}>
              <p className="serif font-black mb-3" style={{ fontSize: "clamp(2.6rem, 4vw, 3.5rem)", color: "var(--kk-ink)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                50% miss rate
              </p>
              <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.6, marginBottom: "1rem" }}>
                Property agents on average miss <strong style={{ color: "var(--kk-ink)" }}>50% of renewals</strong> due to lack of tracking. kakisewa helps you capture all of them.
              </p>
              <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.6 }}>
                Agents with ~20 listings will have an additional <strong style={{ color: "var(--kk-ink)" }}>~10 renewals captured</strong>, around <strong style={{ color: "var(--kk-ink)" }}>RM 20,000 per year</strong>, or RM 1,667 per month.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Mid-page CTA ──────────────────────────────────────────────────── */}
      <section className="px-6 lg:px-12 py-16 text-center" style={{ background: "var(--kk-surface-2)", borderTop: "1px solid var(--kk-line)" }}>
        <p
          className="serif mx-auto mb-2"
          style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", lineHeight: 1.15, letterSpacing: "-0.022em", maxWidth: "30ch", color: "var(--kk-ink)" }}
        >
          One renewal pays for a whole year of kakisewa.
        </p>
        <p className="mb-8" style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)" }}>
          Start your free trial. No credit card needed.
        </p>
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 px-7 py-3 rounded-full font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--kk-ink)", color: "#fff", fontSize: "var(--kk-body)" }}
        >
          Start trial, expiring soon <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="px-6 lg:px-12 py-24" style={{ background: "#fff", borderTop: "1px solid var(--kk-line)" }}>
        <div className="max-w-[720px] mx-auto">
          <div className="text-center mb-14">
            <p
              className="uppercase font-semibold mb-5"
              style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.14em" }}
            >
              Common questions
            </p>
            <h2
              className="serif"
              style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", lineHeight: 1.1, letterSpacing: "-0.022em" }}
            >
              Got questions?
            </h2>
          </div>
          <Faq />
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
            Start trial, expiring soon <ArrowRight className="w-4 h-4" />
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
          <Link href="/sign-up" className="transition-opacity hover:opacity-70" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>Start trial</Link>
        </div>
      </footer>
    </main>
  );
}
