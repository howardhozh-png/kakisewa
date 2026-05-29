import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { MoneyCalc } from "./money-calc";
import { PainCards } from "./pain-cards";
import { SolutionCards } from "./solution-cards";
import { SmoothScrollButton } from "./smooth-scroll-button";
import { ScrollSnap } from "./scroll-snap";

function BrandMark({ size = 32, dark = true }: { size?: number; dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" style={{ color: dark ? "var(--kk-ink)" : "#fff" }}>
      <Logo size={size} />
      <span className="flex flex-col leading-none gap-[3px]">
        <span className="serif tracking-tight leading-none" style={{ fontSize: size * 0.625 }}>
          kakisewa
        </span>
        <span
          className="flex justify-between leading-none font-semibold"
          style={{
            fontSize: size * 0.28,
            opacity: dark ? 0.55 : 0.4,
            fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
          }}
        >
          {"カキセワ".split("").map((c, i) => <span key={i}>{c}</span>)}
        </span>
      </span>
    </span>
  );
}

interface Competitor { name: string; note: string; isKaki?: boolean; ticks: (boolean | null)[] }

const FEATURES = [
  { label: "Public property listings",     kaki: false },
  { label: "Tenant credit check (CTOS)",  kaki: false },
  { label: "Contract expiry alerts",       kaki: true },
  { label: "Polished tenant packages",     kaki: true },
  { label: "Home services coordination",   kaki: true },
  { label: "Income & financial planning",   kaki: true },
];

const COMPETITORS: Competitor[] = [
  {
    name: "Spreadsheet\n+ WhatsApp",
    note: "Manual, free",
    ticks: [false, false, false, false, false, false],
  },
  {
    name: "PropertyGuru\niProperty",
    note: "Listing portals",
    ticks: [true, false, false, false, false, false],
  },
  {
    name: "Speedhome",
    note: "Rental platform",
    ticks: [true, true, false, false, false, false],
  },
  {
    name: "kakisewa",
    note: "カキセワ",
    isKaki: true,
    ticks: [false, false, true, true, true, true],
  },
];

function TickCell({ value, isKaki }: { value: boolean | null; isKaki?: boolean }) {
  if (value === true)  return <Check className="w-5 h-5 mx-auto" style={{ color: isKaki ? "#16a34a" : "#6b7280" }} />;
  if (value === false) return <X     className="w-5 h-5 mx-auto" style={{ color: isKaki ? "#B91C1C" : "#d1d5db" }} />;
  return <span style={{ color: "var(--kk-ink-faint)", fontSize: "var(--kk-xs)" }}>N/A</span>;
}

export default function LandingPage() {
  return (
    <>
      <ScrollSnap />
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
              Get early access
            </Link>
          </div>
        </header>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section data-snap className="px-6 lg:px-12 pt-24 pb-28 text-center" style={{ background: "var(--kk-bg)" }}>
          <h1
            className="serif mx-auto mb-8"
            style={{ fontSize: "clamp(3rem, 7vw, 6rem)", lineHeight: 1.05, letterSpacing: "-0.025em", maxWidth: "18ch" }}
          >
            Make more money from property{" "}
            <span style={{ color: "var(--kk-green)" }}>with kakisewa.</span>
          </h1>
          <p
            className="mx-auto mb-10"
            style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)", color: "var(--kk-ink-mute)", lineHeight: 1.6, maxWidth: "46ch" }}
          >
            Track every contract renewal, close every owner lead,
            send polished tenant packages — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--kk-ink)", color: "#fff", fontSize: "var(--kk-body-lg)" }}
            >
              Get early access <ArrowRight className="w-4 h-4" />
            </Link>
            <SmoothScrollButton
              targetId="how"
              className="px-8 py-3.5 rounded-full font-semibold transition-opacity hover:opacity-70"
              style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)", fontSize: "var(--kk-body-lg)" }}
            >
              See how it works
            </SmoothScrollButton>
          </div>
          <p className="mt-8" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>
            No credit card required · Beta pricing locked in for early adopters
          </p>
        </section>

        {/* ── Pain ──────────────────────────────────────────────────────────── */}
        <section data-snap className="px-6 lg:px-12 py-20" style={{ background: "var(--kk-surface-2)" }}>
          <p className="mb-3 font-semibold tracking-widest uppercase" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.12em" }}>
            Sound familiar?
          </p>
          <h2 className="serif mb-10" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.022em" }}>
            Every property agent has said one of these.
          </h2>
          <PainCards />
        </section>

        {/* ── Money calc ────────────────────────────────────────────────────── */}
        <section data-snap id="how" className="px-6 lg:px-12 py-24" style={{ background: "var(--kk-surface)" }}>
          <div className="max-w-[1100px] mx-auto">
            <p className="mb-3 font-semibold tracking-widest uppercase" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.12em" }}>
              The numbers
            </p>
            <h2 className="serif mb-4" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.022em" }}>
              How much are you leaving on the table every month?
            </h2>
            <p className="mb-10" style={{ fontSize: "var(--kk-body-lg)", color: "var(--kk-ink-mute)" }}>
              Put in your numbers. See what kakisewa means for your income.
            </p>
            <MoneyCalc />
          </div>
        </section>

        {/* ── Solution ──────────────────────────────────────────────────────── */}
        <section data-snap className="px-6 lg:px-12 py-24" style={{ background: "var(--kk-surface-2)" }}>
          <div className="max-w-[1100px] mx-auto">
            <p className="mb-3 font-semibold tracking-widest uppercase" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.12em" }}>
              And that is just the start
            </p>
            <h2
              className="serif mb-16"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.08, letterSpacing: "-0.022em" }}
            >
              Four things kakisewa does<br />so you never miss a deal.
            </h2>
            <SolutionCards />
          </div>
        </section>

        {/* ── Competitor ────────────────────────────────────────────────────── */}
        <section data-snap className="px-6 lg:px-12 py-24" style={{ background: "var(--kk-surface)" }}>
          <div className="max-w-[860px] mx-auto">
            <p className="mb-3 font-semibold tracking-widest uppercase" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.12em" }}>
              Why kakisewa
            </p>
            <h2 className="serif mb-4" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.022em" }}>
              Many tools solve side problems, kakisewa solves problems that cost you money every day.
            </h2>
            <p className="mb-12" style={{ fontSize: "var(--kk-body-lg)", color: "var(--kk-ink-mute)", maxWidth: "72ch" }}>
              Built by agents, for agents. kakisewa targets the root of your daily pain, not just the surface.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 520 }}>
                <thead>
                  <tr>
                    <th className="text-left pb-4" style={{ width: "34%", fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid var(--kk-line)" }} />
                    {COMPETITORS.map((c) => (
                      <th key={c.name} className="pb-4 text-center" style={{
                        borderBottom: c.isKaki ? "3px solid #16a34a" : "1px solid var(--kk-line)",
                        background: c.isKaki ? "rgba(22,163,74,0.07)" : "transparent",
                        borderRadius: c.isKaki ? "12px 12px 0 0" : undefined,
                        paddingLeft: c.isKaki ? 12 : undefined,
                        paddingRight: c.isKaki ? 12 : undefined,
                        verticalAlign: "middle",
                      }}>
                        {c.isKaki ? (
                          <span className="flex items-center justify-center">
                            <BrandMark size={22} />
                          </span>
                        ) : (
                          <span className="flex flex-col items-center gap-0.5">
                            <span style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-soft)", whiteSpace: "pre-line", lineHeight: 1.3 }}>{c.name}</span>
                            <span style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", fontWeight: 400 }}>{c.note}</span>
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.flatMap((feat, fi) => {
                    const rows = [];
                    if (fi === 0) {
                      rows.push(
                        <tr key="section-portal">
                          <td colSpan={5} style={{ paddingTop: 24, paddingBottom: 10 }}>
                            <span style={{ fontSize: "var(--kk-xs)", fontWeight: 700, color: "var(--kk-ink-faint)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                              What other platforms handle
                            </span>
                          </td>
                        </tr>
                      );
                    }
                    if (feat.kaki && !FEATURES[fi - 1]?.kaki) {
                      rows.push(
                        <tr key="section-kaki">
                          <td colSpan={5} style={{ paddingTop: 32, paddingBottom: 10 }}>
                            <span style={{ fontSize: "var(--kk-xs)", fontWeight: 700, color: "#16a34a", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                              Actual agent pain point no one solved for
                            </span>
                          </td>
                        </tr>
                      );
                    }
                    rows.push(
                      <tr key={feat.label} style={{
                        borderBottom: feat.kaki ? "1px solid rgba(22,163,74,0.15)" : "1px solid var(--kk-line)",
                        background: feat.kaki ? "rgba(22,163,74,0.04)" : "transparent",
                      }}>
                        <td className="py-4 pr-4">
                          {feat.kaki ? (
                            <div className="flex items-center gap-2.5">
                              <div style={{ width: 3, height: 18, background: "#16a34a", borderRadius: 2, flexShrink: 0 }} />
                              <span style={{ fontSize: "var(--kk-body)", color: "var(--kk-ink)", fontWeight: 500 }}>{feat.label}</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: "var(--kk-body)", color: "var(--kk-ink-faint)" }}>{feat.label}</span>
                          )}
                        </td>
                        {COMPETITORS.map((c) => (
                          <td key={c.name} className="py-4 text-center" style={{
                            opacity: feat.kaki && !c.isKaki ? 0.3 : 1,
                            background: c.isKaki ? "rgba(22,163,74,0.07)" : "transparent",
                          }}>
                            <TickCell value={c.ticks[fi]} isKaki={c.isKaki} />
                          </td>
                        ))}
                      </tr>
                    );
                    return rows;
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-6" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>
              kakisewa is built for agents. Public listings and credit checks are handled by the portals we send clients to.
            </p>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <section data-snap className="px-6 lg:px-12 py-28 text-center" style={{ background: "var(--kk-ink)" }}>
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
              Get early access <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="mt-5" style={{ fontSize: "var(--kk-xs)", color: "rgba(255,255,255,0.25)" }}>
              No credit card required. Cancel anytime.
            </p>
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
            <Link href="/sign-in" className="transition-opacity hover:opacity-70" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>Sign in</Link>
            <Link href="/sign-up" className="transition-opacity hover:opacity-70" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>Get early access</Link>
          </div>
        </footer>
      </main>
    </>
  );
}
