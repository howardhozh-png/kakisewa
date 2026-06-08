import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SeeHowButton } from "./see-how-button"

export function AnimatedHero() {
  return (
    <section className="px-6 lg:px-12 pt-24 pb-12 text-center" style={{ background: "var(--kk-bg)" }}>
      <h1
        className="serif mx-auto"
        style={{
          fontSize: "clamp(2.5rem, 6vw, 5rem)",
          lineHeight: 1.08,
          letterSpacing: "-0.025em",
          maxWidth: "22ch",
          marginBottom: 36,
          color: "var(--kk-ink)",
        }}
      >
        Every agent is{" "}
        <span style={{ color: "#DC2626" }}>missing 30 to 40%</span>
        {" "}of their renewal income.{" "}
        <span style={{ color: "var(--kk-ink-mute)" }}>The ones earning RM100k just don&apos;t feel it yet.</span>
      </h1>

      <p
        className="mx-auto mb-10"
        style={{
          fontSize: "clamp(1rem, 2vw, 1.2rem)",
          color: "var(--kk-ink-mute)",
          lineHeight: 1.6,
          maxWidth: "48ch",
        }}
      >
        The more leases you manage, the more slip through. Most agents lose renewals not from laziness, but because they have no system. kakisewa puts every expiry on your radar so the next agent never gets the call first.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--kk-ink)", color: "#fff", fontSize: "var(--kk-body-lg)" }}
        >
          Start free trial <ArrowRight className="w-4 h-4" />
        </Link>
        <SeeHowButton />
      </div>
      <p className="mt-4 text-xs" style={{ color: "var(--kk-ink-faint)" }}>
        Limited spots available
      </p>
    </section>
  )
}
