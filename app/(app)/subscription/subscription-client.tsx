"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, animate } from "framer-motion";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";

// ── Plan data ─────────────────────────────────────────────────────────────────

const TIER_STYLES = {
  Silver: {
    bg: "linear-gradient(145deg, #f5f5f5 0%, #e2e2e2 35%, #ececec 60%, #d0d0d0 100%)",
    shine: "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 50%)",
    border: "rgba(0,0,0,0.15)",
    shadow: "5px 5px 0 0 rgba(0,0,0,0.12)",
    shadowHover: "8px 8px 0 0 rgba(0,0,0,0.16)",
    ink: "#1a1a1a", mute: "#555", faint: "#888",
    roiGreen: "#15803d",
    btnBg: "#1a1a1a", btnInk: "#fff",
    accent: "#16a34a",
  },
  Platinum: {
    bg: "linear-gradient(145deg, #0b1f4a 0%, #1a3464 35%, #152a56 65%, #0a1a3c 100%)",
    shine: "linear-gradient(135deg, rgba(100,160,255,0.18) 0%, rgba(255,255,255,0) 55%)",
    border: "rgba(100,160,255,0.35)",
    shadow: "5px 5px 0 0 rgba(10,26,60,0.55)",
    shadowHover: "8px 8px 0 0 rgba(10,26,60,0.65)",
    ink: "#ffffff", mute: "rgba(255,255,255,0.80)", faint: "rgba(255,255,255,0.55)",
    roiGreen: "#4ade80",
    btnBg: "rgba(255,255,255,0.95)", btnInk: "#0b1f4a",
    accent: "#4ade80",
  },
  Elite: {
    bg: "linear-gradient(145deg, #6b3d1e 0%, #a8692e 25%, #c98840 50%, #9a5e28 75%, #5c3015 100%)",
    shine: "linear-gradient(135deg, rgba(255,210,140,0.22) 0%, rgba(255,255,255,0) 50%)",
    border: "rgba(255,200,100,0.35)",
    shadow: "5px 5px 0 0 rgba(80,40,0,0.45)",
    shadowHover: "8px 8px 0 0 rgba(80,40,0,0.55)",
    ink: "#fff8f0", mute: "rgba(255,240,210,0.85)", faint: "rgba(255,220,170,0.6)",
    roiGreen: "#fbbf24",
    btnBg: "rgba(255,255,255,0.95)", btnInk: "#5c3015",
    accent: "#fbbf24",
  },
};

const PLANS = [
  {
    name: "Silver" as const, planId: "silver" as const,
    monthly: 79, annualMonthly: 59, annualTotal: 708, annualSavings: 240,
    monthlyAnnualTotal: 948,
    savingsLabel: "3 months free",
    headline: "Get your pipeline moving.",
    tagline: "Track owner responses and close more leads with a branded profile and tenant pack.",
    features: [
      "Owner pipeline (unlimited)",
      "5 renewal tracking cards",
      "12-month forward timeline",
      "Vacancy planner",
      "Contract document storage",
    ],
    recommended: "New agents who need support in tracking owner responses and converting more new owners.",
    archetype: "New hustler · <RM6k/month",
    popular: false,
  },
  {
    name: "Platinum" as const, planId: "platinum" as const,
    monthly: 159, annualMonthly: 119, annualTotal: 1428, annualSavings: 480,
    monthlyAnnualTotal: 1908,
    savingsLabel: "3 months free",
    headline: "Never miss a renewal.",
    tagline: "One missed renewal at RM 2,000 pays for years of kakisewa. Capture every one.",
    features: [
      "Everything in Silver, plus:",
      "Unlimited renewal cards",
      "24-month timeline + history",
      "WA reminders — 60, 30, 7 days",
      "24-month commission history",
      "Directory",
      "Private agent profile",
    ],
    recommended: "Experienced agent who needs to capture all contract renewal income by tracking existing contracts.",
    archetype: "Steady operator · RM7-12k/month",
    popular: true,
  },
  {
    name: "Elite" as const, planId: "elite" as const,
    monthly: 299, annualMonthly: 229, annualTotal: 2748, annualSavings: 840,
    monthlyAnnualTotal: 3588,
    savingsLabel: "3 months free",
    headline: "Your complete ops hub.",
    tagline: "Goal planning, performance tracking, and property services — everything in one place.",
    features: [
      "Everything in Platinum, plus:",
      "WA reminder same-day trigger",
      "Commission forecast",
      "Benchmarking",
      "Portfolio score",
      "Public + searchable agent profile",
    ],
    recommended: "Elite agent who wants everything in one place, including goal planning and performance tracking.",
    archetype: "High earner · >RM12k/month",
    popular: false,
  },
];

// ── Animated price ─────────────────────────────────────────────────────────────

function AnimatedPrice({ value, ink }: { value: number; ink: string }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 0.45,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    prev.current = value;
    return controls.stop;
  }, [value]);

  return (
    <span className="tabular-nums" style={{ color: ink }}>
      {display}
    </span>
  );
}

// ── 3D card ────────────────────────────────────────────────────────────────────

function PricingCard({
  plan,
  interval,
  isCurrentPlan,
  isSelected,
  onCardClick,
  onSelect,
}: {
  plan: typeof PLANS[number];
  interval: "monthly" | "annual";
  isCurrentPlan: boolean;
  isSelected: boolean;
  onCardClick: () => void;
  onSelect: () => void;
}) {
  const s = TIER_STYLES[plan.name];
  const price = interval === "annual" ? plan.annualMonthly : plan.monthly;

  return (
    <motion.div
      whileHover={{ scale: 1.03, transition: { type: "spring", stiffness: 300, damping: 22 } }}
      className="flex flex-col h-full rounded-2xl overflow-hidden cursor-pointer"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: PLANS.indexOf(plan) * 0.08 }}
      onClick={onCardClick}
    >
      <div
        className="flex flex-col h-full"
        style={{
          background: s.bg,
          border: `2px solid ${isCurrentPlan ? "var(--kk-green)" : isSelected ? "rgba(255,255,255,0.6)" : s.border}`,
          borderRadius: 16,
          boxShadow: isCurrentPlan
            ? `5px 5px 0 0 rgba(22,163,74,0.4)`
            : isSelected ? `0 0 0 3px rgba(255,255,255,0.2), ${s.shadowHover}` : s.shadow,
          position: "relative",
          transition: "box-shadow 0.2s, border-color 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = isCurrentPlan ? "8px 8px 0 0 rgba(22,163,74,0.45)" : s.shadowHover)}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = isCurrentPlan ? "5px 5px 0 0 rgba(22,163,74,0.4)" : isSelected ? `0 0 0 3px rgba(255,255,255,0.2), ${s.shadowHover}` : s.shadow)}
      >
        {/* Shine overlay */}
        <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ background: s.shine }} />

        {/* Badge */}
        {(plan.popular || isCurrentPlan) && (
          <div className="absolute top-4 right-4 z-10">
            <span
              className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide"
              style={{
                background: isCurrentPlan ? "#16a34a" : "#eab308",
                color: "#fff",
              }}
            >
              {isCurrentPlan ? "Active plan" : "Most popular"}
            </span>
          </div>
        )}

        <div className="p-6 flex flex-col gap-5 flex-1 relative z-10">
          {/* Header */}
          <div style={{ minHeight: 110 }}>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-2.5" style={{ color: s.faint }}>
              {plan.name}
            </p>
            <p className="text-[22px] font-bold leading-[1.2]" style={{ color: s.ink }}>
              {plan.headline}
            </p>
            <p className="text-[12px] mt-2 leading-relaxed" style={{ color: s.mute }}>
              {plan.tagline}
            </p>
          </div>

          {/* Price */}
          <div>
            <div className="flex items-end gap-1.5">
              <span className="text-[13px] font-medium pb-1.5" style={{ color: s.mute }}>RM</span>
              <span className="text-[38px] font-black leading-none" style={{ letterSpacing: "-0.04em" }}>
                <AnimatedPrice value={price} ink={s.ink} />
              </span>
              <span className="text-[13px] pb-1.5" style={{ color: s.mute }}>/mo</span>
            </div>
            {interval === "annual" ? (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: s.accent, color: plan.name === "Silver" ? "#fff" : plan.name === "Platinum" ? "#0b1f4a" : "#5c3015" }}>
                  {plan.savingsLabel}
                </span>
                <span className="text-[11px]" style={{ color: s.faint }}>
                  RM {plan.annualTotal.toLocaleString()}/year · save RM {plan.annualSavings}
                </span>
              </div>
            ) : (
              <p className="mt-2 text-[11px]" style={{ color: s.faint }}>
                Switch to annual and save RM {plan.annualSavings}/year
              </p>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: s.faint, opacity: 0.25 }} />

          {/* Features */}
          <ul className="space-y-2 flex-1">
            {plan.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5">
                {i === 0 && (plan.planId === "platinum" || plan.planId === "elite") ? (
                  <span className="text-[12px] leading-snug mt-0.5 w-3 shrink-0" />
                ) : (
                  <Check className="shrink-0 mt-0.5" size={13} style={{ color: s.accent }} strokeWidth={3} />
                )}
                <span
                  className="text-[13px] leading-snug"
                  style={{
                    color: i === 0 && (plan.planId === "platinum" || plan.planId === "elite") ? s.faint : s.ink,
                    fontStyle: i === 0 && (plan.planId === "platinum" || plan.planId === "elite") ? "italic" : "normal",
                    fontWeight: i > 0 && (plan.planId === "platinum" || plan.planId === "elite") ? 600 : 400,
                  }}
                >
                  {f}
                </span>
              </li>
            ))}
          </ul>

          {/* Best for */}
          <div>
            <div style={{ height: 1, background: s.faint, opacity: 0.2, marginBottom: 10 }} />
            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: s.faint }}>Best for</p>
            <p className="text-[12px] font-bold mb-1" style={{ color: s.ink }}>{plan.archetype}</p>
            <p className="text-[11px] leading-relaxed" style={{ color: s.mute }}>{plan.recommended}</p>
          </div>

          {/* CTA */}
          <button
            onClick={onSelect}
            className="w-full py-3.5 rounded-xl font-bold text-[14px] transition-all active:scale-95"
            style={{
              background: s.btnBg,
              color: s.btnInk,
              border: "none",
              boxShadow: `3px 3px 0 0 rgba(0,0,0,0.15)`,
              letterSpacing: "-0.01em",
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translate(-1px,-1px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "translate(0,0)")}
          >
            {interval === "annual"
              ? `Pay RM ${plan.annualTotal.toLocaleString()}/year`
              : `Pay RM ${plan.monthly}/month`}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Confirm dialog ─────────────────────────────────────────────────────────────

interface ConfirmProps {
  plan: typeof PLANS[number];
  interval: "monthly" | "annual";
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}

function ConfirmDialog({ plan, interval, onCancel, onConfirm, loading }: ConfirmProps) {
  const s = TIER_STYLES[plan.name];
  const price = interval === "annual" ? plan.annualMonthly : plan.monthly;

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape" && !loading) onCancel(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [loading, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}
      >
        <div className="px-7 pt-8 pb-7 relative" style={{ background: s.bg }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: s.shine }} />
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: s.faint }}>Confirm subscription</p>
          <p className="text-[26px] font-bold leading-tight mb-5" style={{ color: s.ink }}>kakisewa {plan.name}</p>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-[38px] font-black leading-none tabular-nums" style={{ color: s.ink, letterSpacing: "-0.03em" }}>RM {price}</span>
            <span className="text-[15px] pb-1.5" style={{ color: s.mute }}>/month</span>
          </div>
          {interval === "annual" ? (
            <div className="space-y-1 mt-3">
              <p className="text-[14px] font-semibold" style={{ color: s.mute }}>RM {plan.annualTotal.toLocaleString()} billed annually</p>
              <p className="text-[13px] font-semibold" style={{ color: s.accent }}>Save RM {plan.annualSavings}/year · {plan.savingsLabel}</p>
            </div>
          ) : (
            <p className="text-[13px] mt-3" style={{ color: s.mute }}>RM {plan.monthlyAnnualTotal.toLocaleString()} billed monthly over 12 months</p>
          )}
        </div>
        <div className="px-6 pt-4 pb-5 space-y-4">
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--kk-ink-faint)" }}>
            You&apos;ll be redirected to Stripe to complete payment securely. Subscription activates immediately after payment.
          </p>
          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-opacity hover:opacity-70"
              style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", border: "1px solid var(--kk-line)" }}>
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
              style={{ background: "var(--kk-ink)", color: "#fff", opacity: loading ? 0.7 : 1 }}>
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? "Redirecting…" : "Confirm & Pay →"}
            </button>
          </div>
          <p className="text-[10px] text-center" style={{ color: "var(--kk-ink-faint)" }}>Press Esc to cancel</p>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

interface Props {
  status: string | null;
  trialDaysLeft: number | null;
  currentPlan: string | null;
}

export function SubscriptionClient({ status, trialDaysLeft, currentPlan }: Props) {
  const [interval, setInterval] = useState<"monthly" | "annual">("annual");
  const [selectedPlanId, setSelectedPlanId] = useState<string>(currentPlan ?? "platinum");
  const [pending, setPending] = useState<{ plan: typeof PLANS[number]; interval: "monthly" | "annual" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const selectedPlan = PLANS.find(p => p.planId === selectedPlanId) ?? PLANS[1];
  const headerPrice = interval === "annual" ? selectedPlan.annualMonthly : selectedPlan.monthly;

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      toast.success("Subscription activated — welcome aboard!");
      router.replace("/subscription");
    } else if (searchParams.get("cancelled") === "1") {
      toast.info("Checkout cancelled.");
      router.replace("/subscription");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isOnTrial = status === "trial" && trialDaysLeft !== null && trialDaysLeft > 0;

  async function handleConfirm() {
    if (!pending) return;
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: pending.plan.planId, interval: pending.interval }),
    });
    const data = await res.json();
    if (data.upgraded) {
      toast.success("Plan updated — prorated charge applied to your next invoice.");
      setPending(null); setLoading(false); router.refresh();
    } else if (data.url) {
      window.location.href = data.url;
    } else {
      toast.error(data.error ?? "Something went wrong");
      setLoading(false); setPending(null);
    }
  }

  async function openPortal() {
    setPortalLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { toast.error(data.error ?? "No active subscription found"); setPortalLoading(false); }
  }

  return (
    <>
      {pending && (
        <ConfirmDialog
          plan={pending.plan}
          interval={pending.interval}
          onCancel={() => { if (!loading) setPending(null); }}
          onConfirm={handleConfirm}
          loading={loading}
        />
      )}

      <div className="mx-auto max-w-[1100px] px-6 lg:px-10 py-10 lg:py-16">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="serif kk-display mb-3" style={{ color: "var(--kk-ink)" }}>
            Choose your plan
          </h1>
          <p className="kk-body max-w-md mx-auto" style={{ color: "var(--kk-ink-mute)" }}>
            You spend{" "}
            <span style={{ color: "#DC2626", fontWeight: 600 }}>RM 800-1,000/month</span>
            {" "}on PropertyGuru to find tenants.
          </p>
          <p className="kk-body max-w-md mx-auto mt-1" style={{ color: "var(--kk-ink-mute)" }}>
            Pay{" "}
            <span style={{ color: "var(--kk-green)", fontWeight: 700 }}>RM <AnimatedPrice value={headerPrice} ink="var(--kk-green)" />/month</span>
            {" "}to kakisewa so you never lose them.
          </p>

          {isOnTrial && (
            <div className="mt-4 flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold"
                style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                Trial · {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} remaining
              </span>
            </div>
          )}
        </div>

        {/* Toggle */}
        <div className="flex justify-center mb-10">
          <div
            className="inline-flex rounded-full p-1"
            style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line-strong)" }}
          >
            <button
              onClick={() => setInterval("monthly")}
              className="px-5 py-1.5 rounded-full text-[13px] font-semibold transition-all"
              style={{
                background: interval === "monthly" ? "var(--kk-ink)" : "transparent",
                color: interval === "monthly" ? "#fff" : "var(--kk-ink-mute)",
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("annual")}
              className="px-5 py-1.5 rounded-full text-[13px] font-semibold transition-all flex items-center gap-2"
              style={{
                background: interval === "annual" ? "var(--kk-ink)" : "transparent",
                color: interval === "annual" ? "#fff" : "var(--kk-ink-mute)",
              }}
            >
              Annual
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                style={{
                  background: interval === "annual" ? "#16a34a" : "var(--kk-line)",
                  color: interval === "annual" ? "#fff" : "var(--kk-ink-faint)",
                }}
              >
                −25%
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid lg:grid-cols-3 gap-6 mb-12" style={{ perspective: 1200 }}>
          {PLANS.map(plan => (
            <PricingCard
              key={plan.name}
              plan={plan}
              interval={interval}
              isCurrentPlan={currentPlan === plan.planId}
              isSelected={selectedPlanId === plan.planId}
              onCardClick={() => setSelectedPlanId(plan.planId)}
              onSelect={() => setPending({ plan, interval })}
            />
          ))}
        </div>

        {/* Comparison table */}
        <div className="mb-12 overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ fontSize: "var(--kk-sm)" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--kk-line-strong)" }}>
                <th className="py-3 pr-6 font-semibold" style={{ color: "var(--kk-ink-mute)", width: "25%" }} />
                {PLANS.map(p => (
                  <th key={p.name} className="py-3 px-3 font-bold text-center" style={{ color: "var(--kk-ink)", width: "25%" }}>
                    <div>{p.name}</div>
                    <div className="text-[11px] font-normal mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>
                      RM {p.monthly}/mo
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Owner pipeline",        "Unlimited",    "Unlimited",        "Unlimited"],
                ["Renewal tracking",      "5 cards",      "Unlimited",        "Unlimited"],
                ["Renewal timeline",      "12 mo fwd",    "24 mo + history",  "24 mo + history"],
                ["Vacancy planner",       "Flexible",     "Flexible",         "Flexible"],
                ["WA reminders",          "—",            "60/30/7 days",     "60/30/7d + same day"],
                ["Commission history",    "—",            "24 months",        "24 months"],
                ["Directory",             "—",            "Yes",              "Yes"],
                ["Contract documents",    "Yes",          "Yes",              "Yes"],
                ["Agent profile",         "—",            "Private",          "Public + searchable"],
                ["Commission forecast",   "—",            "—",                "Yes"],
                ["Benchmarking",          "—",            "—",                "Yes"],
                ["Portfolio score",       "—",            "—",                "Yes"],
              ].map(([feature, silver, platinum, elite], i) => (
                <tr
                  key={feature}
                  style={{
                    borderBottom: "1px solid var(--kk-line)",
                    background: i % 2 === 0 ? "transparent" : "var(--kk-surface-2)",
                  }}
                >
                  <td className="py-2.5 pr-6 font-medium" style={{ color: "var(--kk-ink-mute)" }}>{feature}</td>
                  {[silver, platinum, elite].map((val, j) => (
                    <td key={j} className="py-2.5 px-3 text-center" style={{ color: val === "—" ? "var(--kk-ink-faint)" : "var(--kk-ink)", fontWeight: val !== "—" ? 500 : 400 }}>
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Manage billing */}
        <div className="text-center">
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl font-semibold text-[14px] transition-opacity hover:opacity-85"
            style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)", border: "1px solid var(--kk-line-strong)", opacity: portalLoading ? 0.6 : 1 }}
          >
            {portalLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {portalLoading ? "Opening…" : "Manage billing →"}
          </button>
          <p className="mt-3 text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
            Secure payment via Stripe · No lock-in · Cancel anytime
          </p>
        </div>
      </div>
    </>
  );
}
