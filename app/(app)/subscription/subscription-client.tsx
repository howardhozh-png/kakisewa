"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, animate } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PLAN_PRICES } from "@/lib/plans";

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
  Gold: {
    bg: "linear-gradient(145deg, #92400e 0%, #b45309 15%, #d97706 35%, #eab308 55%, #fcd34d 68%, #ca8a04 85%, #92400e 100%)",
    shine: "linear-gradient(135deg, rgba(255,255,180,0.55) 0%, rgba(255,255,255,0) 55%)",
    border: "rgba(234,179,8,0.5)",
    shadow: "5px 5px 0 0 rgba(100,60,0,0.3)",
    shadowHover: "8px 8px 0 0 rgba(100,60,0,0.4)",
    ink: "#fff8e1", mute: "rgba(255,248,220,0.85)", faint: "rgba(255,235,150,0.65)",
    roiGreen: "#fde68a",
    btnBg: "rgba(255,255,255,0.95)", btnInk: "#92400e",
    accent: "#fde68a",
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
    ...PLAN_PRICES.silver,
    headline: "Move your pipeline.",
    archetype: "New agent · <RM4k/month",
    quote: "I want to start building my portfolio and learn renewal cycle",
    popular: false,
  },
  {
    name: "Gold" as const, planId: "gold" as const,
    ...PLAN_PRICES.gold,
    headline: "Scale your portfolio.",
    archetype: "Growing agent · RM4-8k/month",
    quote: "I have enough existing contracts and I don't want to miss them",
    popular: false,
  },
  {
    name: "Platinum" as const, planId: "platinum" as const,
    ...PLAN_PRICES.platinum,
    headline: "Never miss a renewal.",
    archetype: "Established agent · RM8-15k/month",
    quote: "Renewal contract is a big portion of my passive income and I must capture them",
    popular: true,
  },
  {
    name: "Elite" as const, planId: "elite" as const,
    ...PLAN_PRICES.elite,
    headline: "Your all-in-one hub.",
    archetype: "Elite agent · >RM15k/month",
    quote: "I am successful, and I want to build my own personal brand",
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
  plan, interval, isCurrentPlan, isSelected, onCardClick, onSelect, isOnTrial,
}: {
  plan: typeof PLANS[number];
  interval: "monthly" | "annual";
  isCurrentPlan: boolean;
  isSelected: boolean;
  onCardClick: () => void;
  onSelect: () => void;
  isOnTrial?: boolean;
}) {
  const s = TIER_STYLES[plan.name];
  const price = interval === "annual" ? plan.annualMonthly : plan.monthly;

  return (
    <motion.div
      whileHover={{ scale: 1.02, transition: { type: "spring", stiffness: 300, damping: 22 } }}
      className="flex flex-col h-full rounded-2xl overflow-hidden cursor-pointer"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: PLANS.indexOf(plan) * 0.07 }}
      onClick={onCardClick}
    >
      <div
        className="flex flex-col h-full"
        style={{
          background: s.bg,
          border: `2px solid ${isCurrentPlan ? "var(--kk-green)" : isSelected ? "rgba(255,255,255,0.6)" : s.border}`,
          borderRadius: 16,
          boxShadow: isCurrentPlan
            ? "5px 5px 0 0 rgba(22,163,74,0.4)"
            : isSelected ? `0 0 0 3px rgba(255,255,255,0.2), ${s.shadowHover}` : s.shadow,
          position: "relative",
          transition: "box-shadow 0.2s, border-color 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = isCurrentPlan ? "8px 8px 0 0 rgba(22,163,74,0.45)" : s.shadowHover)}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = isCurrentPlan ? "5px 5px 0 0 rgba(22,163,74,0.4)" : isSelected ? `0 0 0 3px rgba(255,255,255,0.2), ${s.shadowHover}` : s.shadow)}
      >
        <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ background: s.shine }} />

        {(plan.popular || isCurrentPlan) && (
          <div className="absolute top-4 right-4 z-10">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide"
              style={{ background: isCurrentPlan ? "#16a34a" : "#eab308", color: "#fff" }}>
              {isCurrentPlan ? "Active plan" : "Most popular"}
            </span>
          </div>
        )}

        <div className="p-5 flex flex-col gap-3 flex-1 relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: s.faint }}>
            {plan.name}
          </p>

          <p className="text-[20px] font-bold leading-[1.2]" style={{ color: s.ink }}>
            {plan.headline}
          </p>

          <div>
            <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: s.faint }}>Best for</p>
            <p className="text-[11px] font-bold" style={{ color: s.ink }}>{plan.archetype}</p>
          </div>

          <div>
            <div className="flex items-end gap-1.5">
              <span className="text-[12px] font-medium pb-1" style={{ color: s.mute }}>RM</span>
              <span className="text-[34px] font-black leading-none" style={{ letterSpacing: "-0.04em" }}>
                <AnimatedPrice value={price} ink={s.ink} />
              </span>
              <span className="text-[12px] pb-1" style={{ color: s.mute }}>/mo</span>
            </div>
            {interval === "annual" ? (
              <>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: s.accent, color: plan.name === "Silver" ? "#fff" : plan.name === "Gold" ? "#92400e" : plan.name === "Platinum" ? "#0b1f4a" : "#5c3015" }}>
                    2 months free
                  </span>
                  <span className="text-[10px]" style={{ color: s.faint }}>
                    RM {plan.annualTotal}/year
                  </span>
                </div>
                <p className="mt-1 text-[10px]" style={{ color: s.faint }}>
                  RM {(plan.annualTotal / 365).toFixed(2)}/day on annual plan
                </p>
              </>
            ) : (
              <p className="mt-1 text-[10px]" style={{ color: s.faint }}>
                RM {plan.perDay}/day · annual saves RM {plan.annualSavings}
              </p>
            )}
          </div>

          <div style={{ height: 1, background: s.faint, opacity: 0.25, marginTop: 4 }} />

          <div className="flex-1 flex items-end pb-1">
            <p className="text-[11px] leading-relaxed italic" style={{ color: s.mute }}>
              &ldquo;{plan.quote}&rdquo;
            </p>
          </div>

          <button
            onClick={onSelect}
            className="w-full py-3 rounded-xl font-bold text-[13px] transition-all active:scale-95"
            style={{
              background: s.btnBg, color: s.btnInk,
              border: "none",
              boxShadow: "3px 3px 0 0 rgba(0,0,0,0.15)",
              letterSpacing: "-0.01em",
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translate(-1px,-1px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "translate(0,0)")}
          >
            {isOnTrial
              ? "Save card — free until trial ends"
              : interval === "annual"
              ? `Pay RM ${plan.annualTotal}/year`
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
  isOnTrial?: boolean;
  trialDaysLeft?: number | null;
}

function ConfirmDialog({ plan, interval, onCancel, onConfirm, loading, isOnTrial, trialDaysLeft }: ConfirmProps) {
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
              <p className="text-[13px] font-semibold" style={{ color: s.accent }}>Save RM {plan.annualSavings}/year · 2 months free</p>
            </div>
          ) : (
            <p className="text-[13px] mt-3" style={{ color: s.mute }}>RM {plan.monthly}/month · cancel anytime</p>
          )}
        </div>
        <div className="px-6 pt-4 pb-5 space-y-4">
          {isOnTrial && trialDaysLeft && trialDaysLeft > 0 ? (
            <div className="rounded-xl p-3" style={{ background: "var(--kk-green-soft, #f0fdf4)", border: "1px solid var(--kk-green, #34C759)" }}>
              <p className="text-[11px] font-semibold mb-1" style={{ color: "var(--kk-green-ink, #1F8B4C)" }}>
                No charge today
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--kk-green-ink, #1F8B4C)" }}>
                Your card is saved securely. You will only be charged after your {trialDaysLeft}-day trial ends. Cancel anytime before then at no cost.
              </p>
            </div>
          ) : (
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--kk-ink-faint)" }}>
              You&apos;ll be redirected to Stripe to complete payment securely. Subscription activates immediately after payment.
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-opacity hover:opacity-70"
              style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", border: "1px solid var(--kk-line)" }}>
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
              style={{ background: "var(--kk-ink)", color: "#fff", opacity: loading ? 0.7 : 1 }}>
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? "Redirecting…" : isOnTrial && trialDaysLeft && trialDaysLeft > 0 ? "Save card →" : "Confirm & Pay →"}
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

  const selectedPlan = PLANS.find(p => p.planId === selectedPlanId) ?? PLANS[2];
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

  const isOnTrial = (status === "beta" || status === "trial") && trialDaysLeft !== null && trialDaysLeft > 0;

  async function handleConfirm() {
    if (!pending) return;
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: pending.plan.planId,
        interval: pending.interval,
        ...(isOnTrial && trialDaysLeft !== null && trialDaysLeft > 0
          ? { trialDaysLeft }
          : {}),
      }),
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
          isOnTrial={isOnTrial}
          trialDaysLeft={trialDaysLeft}
        />
      )}

      <div className="mx-auto max-w-[1200px] px-6 lg:px-10 py-10 lg:py-16">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="serif kk-display mb-3" style={{ color: "var(--kk-ink)" }}>
            Choose your plan
          </h1>

          {isOnTrial && (
            <div className="mt-4 flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold"
                style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                {status === "beta" ? "Beta" : "Trial"} · {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} remaining
              </span>
            </div>
          )}
        </div>

        {/* Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-full p-1"
            style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line-strong)" }}>
            <button
              onClick={() => setInterval("monthly")}
              className="px-5 py-1.5 rounded-full text-[13px] font-semibold transition-all"
              style={{ background: interval === "monthly" ? "var(--kk-ink)" : "transparent", color: interval === "monthly" ? "#fff" : "var(--kk-ink-mute)" }}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("annual")}
              className="px-5 py-1.5 rounded-full text-[13px] font-semibold transition-all flex items-center gap-2"
              style={{ background: interval === "annual" ? "var(--kk-ink)" : "transparent", color: interval === "annual" ? "#fff" : "var(--kk-ink-mute)" }}
            >
              Annual
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                style={{ background: interval === "annual" ? "#16a34a" : "var(--kk-line)", color: interval === "annual" ? "#fff" : "var(--kk-ink-faint)" }}>
                2mo free
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid lg:grid-cols-4 gap-5 mb-12" style={{ perspective: 1200 }}>
          {PLANS.map(plan => (
            <PricingCard
              key={plan.name}
              plan={plan}
              interval={interval}
              isCurrentPlan={currentPlan === plan.planId}
              isSelected={selectedPlanId === plan.planId}
              onCardClick={() => setSelectedPlanId(plan.planId)}
              onSelect={() => setPending({ plan, interval })}
              isOnTrial={isOnTrial}
            />
          ))}
        </div>

        {/* Per-plan per-day callout */}
        <div className="mb-14">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.12em] mb-8" style={{ color: "var(--kk-ink-faint)" }}>
            Annual billing: what you pay per day
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10 mx-2">
            {([
              { plan: PLANS[0], food: null },
              { plan: PLANS[1], food: "1 kopitiam egg/day" },
              { plan: PLANS[2], food: "2 kopitiam eggs/day" },
              { plan: PLANS[3], food: "1 set kopitiam egg and butter kaya toast/day" },
            ] as { plan: typeof PLANS[number]; food: string | null }[]).map(({ plan, food }) => (
              <div key={plan.planId} className="relative text-center" style={{ padding: "20px 18px 18px", backgroundColor: "var(--kk-surface)" }}>
                {/* pixel border top */}
                <div className="absolute" style={{ top: "-6px", left: "6px", right: "6px", height: "6px", backgroundColor: "var(--kk-ink)" }} />
                {/* pixel border bottom */}
                <div className="absolute" style={{ bottom: "-6px", left: "6px", right: "6px", height: "6px", backgroundColor: "var(--kk-ink)" }} />
                {/* pixel border left */}
                <div className="absolute" style={{ left: "-6px", top: "6px", bottom: "6px", width: "6px", backgroundColor: "var(--kk-ink)" }} />
                {/* pixel border right */}
                <div className="absolute" style={{ right: "-6px", top: "6px", bottom: "6px", width: "6px", backgroundColor: "var(--kk-ink)" }} />
                {/* corner pixels */}
                <div className="absolute" style={{ top: "0px", left: "0px", width: "6px", height: "6px", backgroundColor: "var(--kk-ink)" }} />
                <div className="absolute" style={{ top: "0px", right: "0px", width: "6px", height: "6px", backgroundColor: "var(--kk-ink)" }} />
                <div className="absolute" style={{ bottom: "0px", left: "0px", width: "6px", height: "6px", backgroundColor: "var(--kk-ink)" }} />
                <div className="absolute" style={{ bottom: "0px", right: "0px", width: "6px", height: "6px", backgroundColor: "var(--kk-ink)" }} />
                {/* content */}
                <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-2" style={{ color: "var(--kk-ink-faint)" }}>
                  {plan.name}
                </p>
                <div className="flex items-baseline justify-center gap-1 flex-wrap">
                  <span className="text-[12px] font-bold" style={{ color: "var(--kk-ink-mute)" }}>RM</span>
                  <span className="text-[28px] font-black tabular-nums" style={{ color: "var(--kk-ink)", letterSpacing: "-0.04em", lineHeight: "1" }}>
                    {(plan.annualTotal / 365).toFixed(2)}
                  </span>
                  <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>/day</span>
                </div>
                {food && (
                  <p className="mt-1.5 text-[11px]" style={{ color: "var(--kk-ink-mute)" }}>
                    or {food}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Comparison table */}
        <div className="mb-12 overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ fontSize: "var(--kk-sm)" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--kk-line-strong)" }}>
                <th className="py-3 pl-5 pr-6 font-semibold" style={{ color: "var(--kk-ink-mute)", width: "24%" }} />
                {PLANS.map(p => (
                  <th key={p.name} className="py-3 px-3 font-bold text-center" style={{ color: "var(--kk-ink)", width: "19%" }}>
                    <div>{p.name}</div>
                    <div className="text-[11px] font-normal mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>
                      RM {p.monthly}/mo
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {([
                ["Total cards",           "70",       "200",       "700",       "2,000",              "header"],
                ["My listing",            "40 cards", "100 cards", "300 cards", "800 cards",          "sub"],
                ["Existing listing",      "20 cards", "60 cards",  "200 cards", "700 cards",          "sub"],
                ["Lost listing",        "10 cards", "40 cards",  "100 cards", "500 cards",          "sub"],
                ["Email notifications",   "Yes",      "Yes",       "Yes",       "Yes",                "normal"],
                ["Push notifications",    "Yes",      "Yes",       "Yes",       "Yes",                "normal"],
                ["Agent profile",         "—",        "—",         "Private",   "Public + searchable","normal"],
                ["Performance dashboard", "—",        "—",         "—",         "Yes",                "normal"],
              ] as [string,string,string,string,string,string][]).map(([feature, silver, gold, platinum, elite, rowType], i) => {
                const isHeader = rowType === "header";
                const isSub    = rowType === "sub";
                return (
                  <tr key={feature} style={{
                    borderBottom: "1px solid var(--kk-line)",
                    background: (isHeader || isSub) ? "rgba(52,199,89,0.08)" : i % 2 === 0 ? "transparent" : "var(--kk-surface-2)",
                  }}>
                    <td className="py-2.5 pr-6" style={{
                      paddingLeft: isSub ? 28 : 20,
                      color: (isHeader || isSub) ? "#1F8B4C" : "var(--kk-ink-mute)",
                      fontWeight: isHeader ? 700 : isSub ? 500 : 500,
                      fontSize: isSub ? 12 : undefined,
                    }}>
                      {feature}
                    </td>
                    {[silver, gold, platinum, elite].map((val, j) => (
                      <td key={j} className="py-2.5 px-3 text-center"
                        style={{
                          color: val === "—" ? "var(--kk-ink-faint)" : (isHeader || isSub) ? "#1F8B4C" : "var(--kk-ink)",
                          fontWeight: isHeader ? 700 : val !== "—" ? 500 : 400,
                          fontSize: isSub ? 12 : undefined,
                        }}>
                        {val}
                      </td>
                    ))}
                  </tr>
                );
              })}
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
