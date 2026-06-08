import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { Faq } from "./faq";
import { AnimatedHero } from "./animated-hero";
import { ComparisonSlider } from "./comparison-slider";
import { FeatureSection } from "./feature-section";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { PLAN_MONTHLY_PRICE } from "@/lib/pricing";

function BrandMark({ size = 32, dark = true }: { size?: number; dark?: boolean }) {
  return (
    <span style={{ color: dark ? "var(--kk-ink)" : "#fff" }}>
      <Logo variant="wordmark" size={size} />
    </span>
  );
}

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
            Start free trial
          </Link>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <AnimatedHero />

      {/* ── Product reveal (scroll animation) ─────────────────────────────── */}
      <section style={{ background: "var(--kk-bg)", borderTop: "1px solid var(--kk-line)" }}>
        <ContainerScroll
          titleComponent={
            <p
              className="uppercase font-semibold"
              style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.14em" }}
            >
              Today vs with kakisewa
            </p>
          }
        >
          <ComparisonSlider />
        </ContainerScroll>
      </section>

      {/* ── Feature section ───────────────────────────────────────────────── */}
      <FeatureSection />

      {/* ── Platform callout ──────────────────────────────────────────────── */}
      <section className="px-6 lg:px-12 py-14" style={{ background: "#fff", borderTop: "1px solid var(--kk-line)" }}>
        <div className="max-w-[760px] mx-auto text-center">
          <p className="uppercase font-semibold mb-6" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.14em" }}>
            Two tools. Two kinds of income.
          </p>
          <p className="serif" style={{ fontSize: "clamp(1.4rem, 2.8vw, 2.1rem)", lineHeight: 1.25, letterSpacing: "-0.02em", color: "var(--kk-ink-mute)" }}>
            Your property platform earns you new tenants.
          </p>
          <p className="serif mt-3" style={{ fontSize: "clamp(1.4rem, 2.8vw, 2.1rem)", lineHeight: 1.25, letterSpacing: "-0.02em", color: "var(--kk-ink)" }}>
            kakisewa earns you the{" "}
            <span style={{ color: "var(--kk-green)", fontWeight: 700 }}>30 to 40% income</span>
            {" "}you forgot to capture today.
          </p>
          <p className="mt-5" style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)" }}>
            One plan. <span style={{ fontWeight: 600, color: "var(--kk-ink)" }}>RM {PLAN_MONTHLY_PRICE}/month.</span> No commitment.
          </p>
        </div>
      </section>

      {/* ── Beta notice ───────────────────────────────────────────────────── */}
      <section className="px-6 lg:px-12 py-16" style={{ background: "var(--kk-ink)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-[760px] mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full font-bold text-[11px] tracking-widest uppercase" style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", letterSpacing: "0.12em" }}>
              Beta
            </span>
            <span style={{ fontSize: "var(--kk-xs)", color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Early access</span>
          </div>
          <h2 className="serif text-white mb-4" style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", lineHeight: 1.15, letterSpacing: "-0.022em" }}>
            We&apos;re just getting started.
          </h2>
          <p style={{ fontSize: "var(--kk-body)", color: "rgba(255,255,255,0.55)", maxWidth: "50ch", lineHeight: 1.7, marginBottom: 20 }}>
            kakisewa is in beta. Early adopters lock in pricing before rates increase and shape what we build next.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[580px]">
            {[
              "Automated renewal messaging",
              "Owner WhatsApp integration",
              "Team and agency accounts",
              "Tenant screening and ranking AI",
              "Income forecasting dashboard",
              "Property management requests",
            ].map(feat => (
              <div key={feat} className="flex items-center gap-2.5" style={{ fontSize: "var(--kk-sm)", color: "rgba(255,255,255,0.55)" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.25)", flexShrink: 0, display: "inline-block" }} />
                {feat}
              </div>
            ))}
          </div>
          <p className="mt-6" style={{ fontSize: "var(--kk-xs)", color: "rgba(255,255,255,0.3)" }}>
            Features are being rolled out progressively. Beta subscribers get access first.
          </p>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="px-6 lg:px-12 py-24" style={{ background: "var(--kk-surface-2)", borderTop: "1px solid var(--kk-line)" }}>
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

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
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
          <Link href="/sign-up" className="transition-opacity hover:opacity-70" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>Start trial</Link>
        </div>
      </footer>
    </main>
  );
}
