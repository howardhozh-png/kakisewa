"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

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

const PLANS = [
  {
    id: "silver" as const,
    name: "Silver",
    monthly: 198,
    annual: 1980,
    annualMonthly: 165,
    desc: "For agents starting to systematise their portfolio.",
  },
  {
    id: "platinum" as const,
    name: "Platinum",
    monthly: 398,
    annual: 3980,
    annualMonthly: 332,
    desc: "For full-time agents managing a growing book.",
  },
  {
    id: "elite" as const,
    name: "Elite",
    monthly: 498,
    annual: 4980,
    annualMonthly: 415,
    desc: "For top performers who want every edge.",
    highlight: true,
  },
];

export default function BillingPage() {
  const router = useRouter();
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState<string | null>(null);

  async function startCheckout(plan: string) {
    setLoading(plan);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, interval }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error ?? "Something went wrong");
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { alert(data.error ?? "No active subscription found"); setLoading(null); }
  }

  return (
    <div className="mx-auto max-w-[960px] px-6 lg:px-10 py-12 lg:py-16">
      <header className="mb-10">
        <p className="kk-overline mb-3">Subscription</p>
        <h1 className="serif kk-display" style={{ color: "var(--kk-ink)" }}>Billing</h1>
        <p className="mt-3 kk-body-sm" style={{ color: "var(--kk-ink-mute)" }}>
          Beta pricing locked in for early adopters. Cancel anytime.
        </p>
      </header>

      {/* Interval toggle */}
      <div className="flex items-center gap-1 mb-8 p-1 rounded-xl w-fit" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
        {(["monthly", "annual"] as const).map(iv => (
          <button key={iv} onClick={() => setInterval(iv)}
            className="px-5 py-2 rounded-lg text-[13px] font-semibold transition-all"
            style={{
              background: interval === iv ? "var(--kk-ink)" : "transparent",
              color: interval === iv ? "#fff" : "var(--kk-ink-mute)",
            }}>
            {iv === "monthly" ? "Monthly" : "Annual"}
            {iv === "annual" && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: "rgba(52,199,89,0.18)", color: "#1F8B4C" }}>
                2 months free
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Plan cards */}
      <div className="grid lg:grid-cols-3 gap-4 mb-10">
        {PLANS.map(plan => (
          <div key={plan.id} className="kk-section p-6 flex flex-col gap-4"
            style={plan.highlight ? { border: "2px solid var(--kk-green)", boxShadow: "0 0 0 4px rgba(52,199,89,0.08)" } : {}}>
            <div>
              {plan.highlight && (
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-2 inline-block"
                  style={{ background: "rgba(52,199,89,0.12)", color: "var(--kk-green)" }}>
                  Most popular
                </span>
              )}
              <p className="font-bold text-[17px]" style={{ color: "var(--kk-ink)" }}>{plan.name}</p>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>{plan.desc}</p>
            </div>
            <div>
              <span className="text-[28px] font-bold tabular-nums" style={{ color: "var(--kk-ink)", letterSpacing: "-0.02em" }}>
                RM {interval === "monthly" ? plan.monthly : plan.annualMonthly}
              </span>
              <span className="text-[12px] ml-1" style={{ color: "var(--kk-ink-mute)" }}>/mo</span>
              {interval === "annual" && (
                <p className="text-[11px] mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>RM {plan.annual} billed annually</p>
              )}
            </div>
            <button
              onClick={() => startCheckout(plan.id)}
              disabled={!!loading}
              className="w-full py-2.5 rounded-xl font-semibold text-[14px] transition-opacity hover:opacity-85"
              style={{
                background: plan.highlight ? "var(--kk-ink)" : "var(--kk-surface-2)",
                color: plan.highlight ? "#fff" : "var(--kk-ink)",
                border: plan.highlight ? "none" : "1px solid var(--kk-line-strong)",
                opacity: loading ? 0.6 : 1,
              }}>
              {loading === plan.id ? "Redirecting…" : "Subscribe"}
            </button>
          </div>
        ))}
      </div>

      {/* Features included */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="kk-section p-6 lg:p-8">
          <p className="kk-overline mb-4">Everything included in all plans</p>
          <ul className="space-y-3">
            {FEATURES.map(f => (
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
            <p className="kk-overline mb-2">Manage subscription</p>
            <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)", lineHeight: 1.6 }}>
              Update payment method, download invoices, change plan, or cancel — all from the Stripe customer portal.
            </p>
          </div>
          <button
            onClick={openPortal}
            disabled={!!loading}
            className="w-full py-3 rounded-xl font-semibold text-[14px] transition-opacity hover:opacity-85"
            style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)", border: "1px solid var(--kk-line-strong)", opacity: loading ? 0.6 : 1 }}>
            {loading === "portal" ? "Opening portal…" : "Manage billing →"}
          </button>
          <p className="text-[11px] text-center" style={{ color: "var(--kk-ink-faint)" }}>
            No lock-in. Cancel anytime from the portal.
          </p>
        </section>
      </div>
    </div>
  );
}
