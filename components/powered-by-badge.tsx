import Image from "next/image"

// Quiet infra trust line for the auth pages — replaces the loss-aversion
// floating cards. Only names services kakisewa actually runs on.
export function PoweredByBadge() {
  return (
    <div className="flex items-center justify-center gap-2 mt-4" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>
      <span style={{ textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 10 }}>Powered by</span>
      <span className="inline-flex items-center gap-1 font-semibold" style={{ color: "var(--kk-ink-mute)" }}>
        <Image src="/logos/supabase.svg" alt="" width={11} height={11} aria-hidden="true" />
        Supabase
      </span>
      <span aria-hidden="true" style={{ color: "var(--kk-line-strong)" }}>&middot;</span>
      <span className="font-semibold" style={{ color: "var(--kk-ink-mute)" }}>Stripe</span>
    </div>
  )
}
