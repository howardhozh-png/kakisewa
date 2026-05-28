import { Check } from "lucide-react";

export const dynamic = "force-dynamic";

const FEATURES = [
  "Unlimited properties & tenancies",
  "WhatsApp-style owner & tenant intake forms",
  "AI-powered receipt verification",
  "Tenant matching & share packs",
  "Contract lifecycle board",
  "Commission & performance tracking",
  "LHDN e-Invois generation",
  "CSV bulk import",
];

export default function BillingPage() {
  return (
    <div className="mx-auto max-w-[900px] px-6 lg:px-10 py-12 lg:py-16">
      <header className="mb-12">
        <p className="kk-overline mb-3">Subscription</p>
        <h1 className="serif kk-display" style={{ color: "var(--kk-ink)" }}>Billing</h1>
        <p className="mt-3 kk-body-sm" style={{ color: "var(--kk-ink-mute)" }}>
          One simple plan. Everything included.
        </p>
      </header>

      {/* Current status */}
      <section className="kk-section p-6 lg:p-8 mb-8 flex items-center justify-between gap-6 flex-wrap">
        <div>
          <p className="kk-overline mb-1">Current plan</p>
          <p className="text-[22px] font-semibold" style={{ color: "var(--kk-ink)" }}>kakisewa Pro</p>
          <p className="text-[13px] mt-1" style={{ color: "var(--kk-green)" }}>
            ● Active (dev mode — billing stubbed)
          </p>
        </div>
        <div className="text-right">
          <p className="text-[32px] font-bold tabular-nums" style={{ color: "var(--kk-ink)", letterSpacing: "-0.02em" }}>
            RM 499
          </p>
          <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>per month</p>
        </div>
      </section>

      {/* Plan card */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="kk-section p-6 lg:p-8">
          <p className="kk-overline mb-4">What's included</p>
          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--kk-green-soft)" }}>
                  <Check className="w-3 h-3" style={{ color: "var(--kk-green)" }} />
                </div>
                <span className="text-[14px]" style={{ color: "var(--kk-ink)" }}>{f}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="kk-section p-6 lg:p-8 flex flex-col gap-5">
          <div>
            <p className="kk-overline mb-2">Payment method</p>
            <p className="text-[14px]" style={{ color: "var(--kk-ink-mute)" }}>
              No payment method on file yet.
            </p>
          </div>

          <div className="space-y-3 mt-auto">
            <button
              className="w-full py-3 rounded-xl font-semibold text-[15px] transition-opacity hover:opacity-90"
              style={{ background: "var(--kk-ink)", color: "#fff" }}
              disabled
            >
              Pay with Card (Stripe), coming soon
            </button>
            <button
              className="w-full py-3 rounded-xl font-semibold text-[15px] transition-opacity hover:opacity-90"
              style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)" }}
              disabled
            >
              Pay via FPX (Billplz), coming soon
            </button>
          </div>

          <p className="text-[11px] text-center" style={{ color: "var(--kk-ink-faint)" }}>
            Billing will be activated before public launch. Cancel anytime. No lock-in.
          </p>
        </section>
      </div>
    </div>
  );
}
