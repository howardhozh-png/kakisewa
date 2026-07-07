"use client";

import { usePathname } from "next/navigation";
import { ArrowRight, Snowflake } from "lucide-react";

const ALLOWED_PATHS = ["/home", "/subscription", "/faq", "/support"];

const PLANS = [
  { name: "Silver",   price: 29,  desc: "Start building your pipeline and renewal tracking." },
  { name: "Gold",     price: 49,  desc: "Scale your portfolio with full renewal history." },
  { name: "Platinum", price: 99,  desc: "Never miss a renewal. 400 active contracts.", featured: true },
  { name: "Elite",    price: 159, desc: "Your all-in-one hub. Up to 1,000 contracts + public profile." },
];

export function BetaFrozenGate() {
  const pathname = usePathname();
  if (ALLOWED_PATHS.includes(pathname) || pathname.startsWith("/settings")) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.80)", zIndex: 9999, backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md rounded-3xl px-8 py-10 text-center"
        style={{ background: "#fff", boxShadow: "0 32px 80px rgba(0,0,0,0.28)" }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: "rgba(59,130,246,0.10)" }}
        >
          <Snowflake className="w-5 h-5" style={{ color: "#3b82f6" }} />
        </div>

        <h2 className="serif mb-2" style={{ fontSize: "1.6rem", lineHeight: 1.15, letterSpacing: "-0.022em", color: "var(--kk-ink)" }}>
          Your account has been paused.
        </h2>
        <p className="mb-6" style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.65 }}>
          Your data is safe. You can still view your homepage, account settings, and help & support. Subscribe now to restore full access.
        </p>

        <div className="flex flex-col gap-2 mb-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="px-5 py-3.5 rounded-2xl text-left"
              style={{
                background: plan.featured ? "var(--kk-green-soft)" : "var(--kk-surface-2)",
                border: plan.featured ? "1.5px solid rgba(52,199,89,0.35)" : "1px solid var(--kk-line)",
              }}
            >
              <div className="flex items-center justify-between mb-0.5">
                <p className="font-semibold text-sm" style={{ color: "var(--kk-ink)" }}>{plan.name}</p>
                <p className="font-bold text-sm tabular-nums" style={{ color: plan.featured ? "#1F8B4C" : "var(--kk-ink)" }}>
                  RM {plan.price}/mo
                </p>
              </div>
              <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-mute)" }}>{plan.desc}</p>
            </div>
          ))}
        </div>

        <a
          href="/subscription"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-opacity hover:opacity-85 w-full justify-center"
          style={{ background: "var(--kk-ink)", color: "#fff", fontSize: "var(--kk-body)" }}
        >
          Subscribe to continue <ArrowRight className="w-4 h-4" />
        </a>

        <p className="mt-4" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>
          Cancel anytime. Your data is always safe.
        </p>
      </div>
    </div>
  );
}
