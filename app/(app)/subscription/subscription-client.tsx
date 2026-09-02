"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, animate } from "framer-motion";
import { Loader2, Copy, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { PlanId } from "@/lib/plans";

// ── Plan data ─────────────────────────────────────────────────────────────────

const TIER_STYLES = {
  Silver: {
    bg: "linear-gradient(145deg, #f5f5f5 0%, #e2e2e2 35%, #ececec 60%, #d0d0d0 100%)",
    shine: "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 50%)",
    border: "rgba(0,0,0,0.15)",
    shadow: "5px 5px 0 0 rgba(0,0,0,0.12)",
    shadowHover: "8px 8px 0 0 rgba(0,0,0,0.16)",
    ink: "#1a1a1a", mute: "#555", faint: "#888",
    btnBg: "#1a1a1a", btnInk: "#fff",
    accent: "#16a34a", accentInk: "#fff",
  },
  Gold: {
    bg: "linear-gradient(145deg, #92400e 0%, #b45309 15%, #d97706 35%, #eab308 55%, #fcd34d 68%, #ca8a04 85%, #92400e 100%)",
    shine: "linear-gradient(135deg, rgba(255,255,180,0.55) 0%, rgba(255,255,255,0) 55%)",
    border: "rgba(234,179,8,0.5)",
    shadow: "5px 5px 0 0 rgba(100,60,0,0.3)",
    shadowHover: "8px 8px 0 0 rgba(100,60,0,0.4)",
    ink: "#fff8e1", mute: "rgba(255,248,220,0.85)", faint: "rgba(255,235,150,0.65)",
    btnBg: "rgba(255,255,255,0.95)", btnInk: "#92400e",
    accent: "#fde68a", accentInk: "#92400e",
  },
  Platinum: {
    bg: "linear-gradient(145deg, #0b1f4a 0%, #1a3464 35%, #152a56 65%, #0a1a3c 100%)",
    shine: "linear-gradient(135deg, rgba(100,160,255,0.18) 0%, rgba(255,255,255,0) 55%)",
    border: "rgba(100,160,255,0.35)",
    shadow: "5px 5px 0 0 rgba(10,26,60,0.55)",
    shadowHover: "8px 8px 0 0 rgba(10,26,60,0.65)",
    ink: "#ffffff", mute: "rgba(255,255,255,0.80)", faint: "rgba(255,255,255,0.55)",
    btnBg: "rgba(255,255,255,0.95)", btnInk: "#0b1f4a",
    accent: "#4ade80", accentInk: "#0b1f4a",
  },
  Elite: {
    bg: "linear-gradient(145deg, #6b3d1e 0%, #a8692e 25%, #c98840 50%, #9a5e28 75%, #5c3015 100%)",
    shine: "linear-gradient(135deg, rgba(255,210,140,0.22) 0%, rgba(255,255,255,0) 50%)",
    border: "rgba(255,200,100,0.35)",
    shadow: "5px 5px 0 0 rgba(80,40,0,0.45)",
    shadowHover: "8px 8px 0 0 rgba(80,40,0,0.55)",
    ink: "#fff8f0", mute: "rgba(255,240,210,0.85)", faint: "rgba(255,220,170,0.6)",
    btnBg: "rgba(255,255,255,0.95)", btnInk: "#5c3015",
    accent: "#fbbf24", accentInk: "#5c3015",
  },
};

type TierName = "Silver" | "Gold" | "Platinum" | "Elite";

interface PlanData {
  planId: PlanId;
  name: TierName;
  cards: number;
  betaMonthly: number;
  y1Monthly: number;
  y2Monthly: number;
  y1Annual: number;
  y2Annual: number;
  headline: string;
  archetype: string;
  quote: string;
  popular: boolean;
}

const PLANS: PlanData[] = [
  { planId: "silver",   name: "Silver",   cards: 50,   betaMonthly: 19,  y1Monthly: 29,  y2Monthly: 29,  y1Annual: 348,  y2Annual: 348,  headline: "Move your pipeline.",       archetype: "New/Part-time agent <5k/month",      quote: "I want to start building my portfolio and learn renewal cycle",                          popular: false },
  { planId: "gold",     name: "Gold",     cards: 150,  betaMonthly: 29,  y1Monthly: 49,  y2Monthly: 69,  y1Annual: 588,  y2Annual: 828,  headline: "Scale your portfolio.",      archetype: "Growing agent RM5-10k/month",         quote: "I have enough existing contracts and I don't want to miss them",                        popular: false },
  { planId: "platinum", name: "Platinum", cards: 400,  betaMonthly: 39,  y1Monthly: 99,  y2Monthly: 139, y1Annual: 1188, y2Annual: 1668, headline: "Never miss a renewal.",      archetype: "Established agent RM10-20k/month",   quote: "Renewal contract is a big portion of my passive income and I must capture them",      popular: true  },
  { planId: "elite",    name: "Elite",    cards: 1000, betaMonthly: 69,  y1Monthly: 159, y2Monthly: 219, y1Annual: 1908, y2Annual: 2628, headline: "Your all-in-one hub.",       archetype: "Elite agent >RM20k/month",           quote: "I am successful, and I want to build my own personal brand",                           popular: false },
];

// ── Copy button ────────────────────────────────────────────────────────────────

function CopyButton({ text, compact }: { text: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-[12px] transition-opacity hover:opacity-80 shrink-0"
      style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", border: "1px solid var(--kk-line)" }}
    >
      {copied ? <Check className="w-3 h-3" style={{ color: "var(--kk-green)" }} /> : <Copy className="w-3 h-3" />}
      {!compact && (copied ? "Copied" : "Copy")}
    </button>
  );
}

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
  plan, interval, billingYear, isCurrentPlan, isSelected,
  onCardClick, onSelect, isOnTrial, currentCardCount, betaPrice,
}: {
  plan: PlanData;
  interval: "monthly" | "annual";
  billingYear: 1 | 2;
  isCurrentPlan: boolean;
  isSelected: boolean;
  onCardClick: () => void;
  onSelect: () => void;
  isOnTrial?: boolean;
  currentCardCount: number;
  betaPrice?: number;
}) {
  const s = TIER_STYLES[plan.name];
  const tooManyCards = currentCardCount > plan.cards;
  const disabled = tooManyCards;

  const monthlyPrice = billingYear === 1 ? plan.y1Monthly : plan.y2Monthly;
  const annualTotal  = betaPrice ? betaPrice * 12 : (billingYear === 1 ? plan.y1Annual : plan.y2Annual);
  const annualMonthly = betaPrice ?? Math.round(annualTotal / 12);
  const price = betaPrice ?? (interval === "annual" ? annualMonthly : monthlyPrice);
  const showFreeMonths = !betaPrice && interval === "annual" && billingYear === 1 && plan.planId !== "silver";
  const y2PriceDisplay = interval === "annual" ? Math.round(plan.y2Annual / 12) : plan.y2Monthly;
  const showStrikethrough = !betaPrice && billingYear === 1 && plan.y1Monthly !== plan.y2Monthly;

  return (
    <motion.div
      whileHover={disabled ? {} : { scale: 1.02, transition: { type: "spring", stiffness: 300, damping: 22 } }}
      className="flex flex-col h-full rounded-2xl overflow-hidden"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: disabled ? 0.55 : 1, y: 0 }}
      transition={{ duration: 0.4, delay: PLANS.indexOf(plan) * 0.07 }}
      onClick={disabled ? undefined : onCardClick}
      style={{ cursor: disabled ? "not-allowed" : "pointer" }}
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
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.boxShadow = isCurrentPlan ? "8px 8px 0 0 rgba(22,163,74,0.45)" : s.shadowHover; }}
        onMouseLeave={e => { if (!disabled) e.currentTarget.style.boxShadow = isCurrentPlan ? "5px 5px 0 0 rgba(22,163,74,0.4)" : isSelected ? `0 0 0 3px rgba(255,255,255,0.2), ${s.shadowHover}` : s.shadow; }}
      >
        <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ background: s.shine }} />

        <div className="absolute top-4 right-4 z-10">
          {tooManyCards ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1"
              style={{ background: "rgba(255,59,48,0.9)", color: "#fff" }}>
              <AlertTriangle className="w-3 h-3" />
              Over limit
            </span>
          ) : isCurrentPlan ? (
            <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide"
              style={{ background: "#16a34a", color: "#fff" }}>
              Active plan
            </span>
          ) : plan.popular ? (
            <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide"
              style={{ background: "#eab308", color: "#fff" }}>
              Most popular
            </span>
          ) : null}
        </div>

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
            {betaPrice && (
              <div className="mb-1 flex flex-col gap-0.5">
                <p className="text-[11px]" style={{ color: s.faint, textDecoration: "line-through" }}>
                  RM {plan.y1Monthly}/mo Year 1
                </p>
                {plan.y2Monthly !== plan.y1Monthly && (
                  <p className="text-[11px]" style={{ color: s.faint, textDecoration: "line-through" }}>
                    RM {plan.y2Monthly}/mo Year 2
                  </p>
                )}
              </div>
            )}
            {!betaPrice && showStrikethrough && (
              <p className="text-[11px] mb-0.5" style={{ color: s.faint, textDecoration: "line-through" }}>
                RM {y2PriceDisplay}/mo Year 2
              </p>
            )}
            <div className="flex items-end gap-1.5">
              <span className="text-[12px] font-medium pb-1" style={{ color: s.mute }}>RM</span>
              <span className="text-[34px] font-black leading-none" style={{ letterSpacing: "-0.04em" }}>
                <AnimatedPrice value={price} ink={s.ink} />
              </span>
              <span className="text-[12px] pb-1" style={{ color: s.mute }}>/mo</span>
              {showStrikethrough && (
                <span className="text-[10px] pb-1.5" style={{ color: s.faint }}>for Year 1</span>
              )}
            </div>
            {interval === "annual" ? (
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                {showFreeMonths && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: s.accent, color: s.accentInk }}>
                    Pay 12, get 14 months
                  </span>
                )}
                {plan.planId === "silver" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: "rgba(110,110,115,0.14)", color: "#6E6E73", border: "1px solid rgba(110,110,115,0.22)" }}>
                    Exempted
                  </span>
                )}
                <span className="text-[10px]" style={{ color: s.faint }}>
                  RM {annualTotal.toLocaleString()}/year
                </span>
              </div>
            ) : (
              <p className="mt-1 text-[10px]" style={{ color: s.faint }}>
                {betaPrice || plan.y1Monthly === plan.y2Monthly
                  ? "Fixed rate, no increase"
                  : showStrikethrough
                  ? null
                  : `Year 2: RM ${plan.y2Monthly}/mo`}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold tabular-nums" style={{ color: s.faint }}>
              {plan.cards.toLocaleString()} total cards
            </span>
          </div>

          <div style={{ height: 1, background: s.faint, opacity: 0.25, marginTop: 4 }} />

          <div className="flex-1 flex items-end pb-1">
            <p className="text-[11px] leading-relaxed italic" style={{ color: s.mute }}>
              &ldquo;{plan.quote}&rdquo;
            </p>
          </div>

          <button
            onClick={disabled ? undefined : (e) => { e.stopPropagation(); onSelect(); }}
            disabled={disabled}
            className="w-full py-3 rounded-xl font-bold text-[13px] transition-all active:scale-95"
            style={{
              background: disabled ? "rgba(128,128,128,0.25)" : s.btnBg,
              color: disabled ? "rgba(200,200,200,0.7)" : s.btnInk,
              border: "none",
              boxShadow: disabled ? "none" : "3px 3px 0 0 rgba(0,0,0,0.15)",
              letterSpacing: "-0.01em",
              cursor: disabled ? "not-allowed" : "pointer",
            }}
            onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = "translate(-1px,-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translate(0,0)"; }}
          >
            {tooManyCards
              ? `${currentCardCount}/${plan.cards} cards — reduce first`
              : isOnTrial
              ? `Save card — then RM ${betaPrice ?? monthlyPrice}/mo`
              : interval === "annual"
              ? `Pay RM ${annualTotal.toLocaleString()}/year`
              : `Pay RM ${betaPrice ?? monthlyPrice}/month`}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Confirm dialog ─────────────────────────────────────────────────────────────

interface ConfirmProps {
  plan: PlanData;
  interval: "monthly" | "annual";
  billingYear: 1 | 2;
  isUpgrade: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
  isOnTrial?: boolean;
  trialDaysLeft?: number | null;
  betaPrice?: number;
}

function ConfirmDialog({ plan, interval, billingYear, isUpgrade, onCancel, onConfirm, loading, isOnTrial, trialDaysLeft, betaPrice }: ConfirmProps) {
  const s = TIER_STYLES[plan.name];
  const effectiveYear: 1 | 2 = billingYear;
  const monthlyPrice = effectiveYear === 1 ? plan.y1Monthly : plan.y2Monthly;
  const annualTotal  = betaPrice ? betaPrice * 12 : (effectiveYear === 1 ? plan.y1Annual : plan.y2Annual);
  const price = interval === "annual" ? annualTotal : (betaPrice ?? monthlyPrice);

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
            <span className="text-[38px] font-black leading-none tabular-nums" style={{ color: s.ink, letterSpacing: "-0.03em" }}>RM {price.toLocaleString()}</span>
            <span className="text-[15px] pb-1.5" style={{ color: s.mute }}>{interval === "annual" ? "/year" : "/month"}</span>
          </div>
          {interval === "annual" ? (
            <div className="space-y-1 mt-3">
              {!betaPrice && effectiveYear === 1 && plan.planId !== "silver" && (
                <p className="text-[13px] font-semibold" style={{ color: s.accent }}>Pay 12 months, get 14 months</p>
              )}
            </div>
          ) : (
            <p className="text-[13px] mt-3" style={{ color: s.mute }}>RM {betaPrice ?? monthlyPrice}/month · cancel anytime</p>
          )}
        </div>
        <div className="px-6 pt-4 pb-5 space-y-4">
          {isOnTrial && trialDaysLeft && trialDaysLeft > 0 ? (
            <div className="rounded-xl p-3" style={{ background: "var(--kk-green-soft)", border: "1px solid rgba(52,199,89,0.3)" }}>
              <p className="text-[11px] font-semibold mb-1" style={{ color: "var(--kk-green-ink)" }}>
                No charge today
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--kk-green-ink)" }}>
                Your card is saved securely. You will only be charged after your {trialDaysLeft}-day trial ends.
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
              {loading ? "Redirecting…" : isOnTrial && trialDaysLeft && trialDaysLeft > 0 ? "Save card" : "Confirm"}
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
  isAdmin?: boolean;
  isBetaUser?: boolean;
  hasStripeCustomer?: boolean;
  status: string | null;
  trialDaysLeft: number | null;
  currentPlan: string | null;
  subscriptionYear: 1 | 2;
  currentCardCount: number;
  referralCode: string | null;
  referralCount: number;
  referralPaidCount: number;
  creditBalanceMyr: number;
  pendingCreditMyr?: number;
  totalCreditEarnedMyr?: number;
}

export function SubscriptionClient({
  isAdmin, isBetaUser, hasStripeCustomer, status, trialDaysLeft, currentPlan,
  subscriptionYear, currentCardCount, referralCode, referralCount, referralPaidCount,
  creditBalanceMyr, pendingCreditMyr = 0, totalCreditEarnedMyr = 0,
}: Props) {
  const [interval, setInterval] = useState<"monthly" | "annual">("annual");
  const [selectedPlanId, setSelectedPlanId] = useState<string>(currentPlan ?? "platinum");
  const [pending, setPending] = useState<{ plan: PlanData; interval: "monthly" | "annual"; isUpgrade: boolean; betaPrice?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const isOnTrial = (status === "beta" || status === "trial") && trialDaysLeft !== null && trialDaysLeft > 0;
  // Trial/beta users are treated as Y1 (they'll start Y1 when trial ends)
  const effectiveBillingYear: 1 | 2 = (status === "trial" || status === "beta") ? 1 : subscriptionYear;

  const selectedPlan = PLANS.find(p => p.planId === selectedPlanId) ?? PLANS[2];

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

  function handleSelectPlan(plan: PlanData, betaPrice?: number) {
    const isUpgrade = status === "active" && currentPlan !== null && plan.planId !== currentPlan;
    setPending({ plan, interval, isUpgrade, betaPrice });
  }

  async function handleConfirm() {
    if (!pending) return;
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: pending.plan.planId,
        interval: pending.interval,
        ...(isOnTrial && trialDaysLeft !== null && trialDaysLeft > 0 ? { trialDaysLeft } : {}),
      }),
    });
    const data = await res.json();
    if (res.status === 422 && data.error === "card_count_exceeded") {
      toast.error(`You have ${data.current} cards. This plan supports up to ${data.cap}. Delete some cards first.`);
      setLoading(false); setPending(null);
    } else if (data.upgraded) {
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

  const referralLink = referralCode ? `https://kakisewa.com/sign-up?ref=${referralCode}` : null;

  // Current plan cap for usage display
  const currentPlanData = PLANS.find(p => p.planId === currentPlan);
  const planCap = isOnTrial ? 1000 : (currentPlanData?.cards ?? null);

  return (
    <>
      {pending && (
        <ConfirmDialog
          plan={pending.plan}
          interval={pending.interval}
          billingYear={effectiveBillingYear}
          isUpgrade={pending.isUpgrade}
          onCancel={() => { if (!loading) setPending(null); }}
          onConfirm={handleConfirm}
          loading={loading}
          isOnTrial={isOnTrial}
          trialDaysLeft={trialDaysLeft}
          betaPrice={pending.betaPrice}
        />
      )}

      <div className="mx-auto max-w-[1200px] px-6 lg:px-10 py-10 lg:py-16">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="serif kk-display mb-3" style={{ color: "var(--kk-ink)" }}>
            Choose your plan
          </h1>

          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {status === "lifetime" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold"
                style={{ background: "var(--kk-green-soft)", color: "var(--kk-green-ink)", border: "1px solid rgba(52,199,89,0.3)" }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--kk-green)" }} />
                Lifetime member
              </span>
            )}
            {isOnTrial && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold"
                style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                {status === "beta" ? "Beta" : "Trial"} · {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} remaining
              </span>
            )}
            {planCap !== null && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold"
                style={{
                  background: currentCardCount >= planCap ? "var(--kk-red)" : currentCardCount > planCap * 0.8 ? "#fef3c7" : "var(--kk-surface-2)",
                  color: currentCardCount >= planCap ? "#fff" : currentCardCount > planCap * 0.8 ? "#92400e" : "var(--kk-ink-mute)",
                  border: `1px solid ${currentCardCount >= planCap ? "var(--kk-red)" : currentCardCount > planCap * 0.8 ? "#fcd34d" : "var(--kk-line)"}`,
                }}>
                {currentCardCount} / {planCap} cards used
              </span>
            )}
          </div>
        </div>

        {/* Pricing */}
        <><div className="flex justify-center mb-10">
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
              {!isBetaUser && effectiveBillingYear === 1 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                  style={{ background: interval === "annual" ? "#16a34a" : "var(--kk-line)", color: interval === "annual" ? "#fff" : "var(--kk-ink-faint)" }}>
                  2mo free
                </span>
              )}
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
              billingYear={effectiveBillingYear}
              isCurrentPlan={currentPlan === plan.planId}
              isSelected={selectedPlanId === plan.planId}
              onCardClick={() => setSelectedPlanId(plan.planId)}
              onSelect={() => handleSelectPlan(plan, isBetaUser ? plan.betaMonthly : undefined)}
              isOnTrial={isOnTrial}
              currentCardCount={currentCardCount}
              betaPrice={isBetaUser ? plan.betaMonthly : undefined}
            />
          ))}
        </div>

        {/* Per-plan per-card callout */}
        <div className="mb-14">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.12em] mb-8" style={{ color: "var(--kk-ink-faint)" }}>
            {isBetaUser ? "Beta pricing: what you pay per card" : "Annual billing: what you pay per card (year 1)"}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10 mx-2">
            {PLANS.map(plan => (
              <div key={plan.planId} className="relative text-center" style={{ padding: "20px 18px 18px", backgroundColor: "var(--kk-surface)" }}>
                <div className="absolute" style={{ top: "-6px", left: "6px", right: "6px", height: "6px", backgroundColor: "var(--kk-ink)" }} />
                <div className="absolute" style={{ bottom: "-6px", left: "6px", right: "6px", height: "6px", backgroundColor: "var(--kk-ink)" }} />
                <div className="absolute" style={{ left: "-6px", top: "6px", bottom: "6px", width: "6px", backgroundColor: "var(--kk-ink)" }} />
                <div className="absolute" style={{ right: "-6px", top: "6px", bottom: "6px", width: "6px", backgroundColor: "var(--kk-ink)" }} />
                <div className="absolute" style={{ top: "0px", left: "0px", width: "6px", height: "6px", backgroundColor: "var(--kk-ink)" }} />
                <div className="absolute" style={{ top: "0px", right: "0px", width: "6px", height: "6px", backgroundColor: "var(--kk-ink)" }} />
                <div className="absolute" style={{ bottom: "0px", left: "0px", width: "6px", height: "6px", backgroundColor: "var(--kk-ink)" }} />
                <div className="absolute" style={{ bottom: "0px", right: "0px", width: "6px", height: "6px", backgroundColor: "var(--kk-ink)" }} />
                <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-2" style={{ color: "var(--kk-ink-faint)" }}>
                  {plan.name}
                </p>
                <div className="flex items-baseline justify-center gap-1 flex-wrap">
                  <span className="text-[12px] font-bold" style={{ color: "var(--kk-ink-mute)" }}>RM</span>
                  <span className="text-[28px] font-black tabular-nums" style={{ color: "var(--kk-ink)", letterSpacing: "-0.04em", lineHeight: "1" }}>
                    {((isBetaUser ? plan.betaMonthly : plan.y1Monthly) / plan.cards).toFixed(2)}
                  </span>
                  <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>/card/mo</span>
                </div>
                <p className="mt-1.5 text-[11px]" style={{ color: "var(--kk-ink-mute)" }}>
                  {plan.cards.toLocaleString()} cards included
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison table */}
        <div className="mb-12 overflow-x-auto">
          <p className="text-[11px] font-semibold mb-4 ml-1" style={{ color: "var(--kk-ink-faint)" }}>
            Card limit is shared across My Listing, Existing Listing, and Lost Listing
          </p>
          <table className="w-full text-left border-collapse" style={{ fontSize: "var(--kk-sm)" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--kk-line-strong)" }}>
                <th className="py-3 pl-5 pr-6 font-semibold" style={{ color: "var(--kk-ink-mute)", width: "24%" }} />
                {PLANS.map(p => (
                  <th key={p.name} className="py-3 px-3 font-bold text-center" style={{ color: "var(--kk-ink)", width: "19%" }}>
                    <div>{p.name}</div>
                    <div className="text-[11px] font-normal mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>
                      RM {isBetaUser ? p.betaMonthly : p.y1Monthly}/mo
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {([
                ["Total cards",           "50",      "150",     "400",     "1,000",              "header"],
                ["Email notifications",   "Yes",     "Yes",     "Yes",     "Yes",                "normal"],
                ["Push notifications",    "Yes",     "Yes",     "Yes",     "Yes",                "normal"],
                ["Agent profile",         "—",       "—",       "Private", "Public + searchable","normal"],
                ["Performance dashboard", "—",       "—",       "—",       "Yes",                "normal"],
              ] as [string,string,string,string,string,string][]).map(([feature, silver, gold, platinum, elite, rowType], i) => {
                const isHeader = rowType === "header";
                return (
                  <tr key={feature} style={{
                    borderBottom: "1px solid var(--kk-line)",
                    background: isHeader ? "rgba(52,199,89,0.08)" : i % 2 === 0 ? "transparent" : "var(--kk-surface-2)",
                  }}>
                    <td className="py-2.5 pl-5 pr-6"
                      style={{ color: isHeader ? "#1F8B4C" : "var(--kk-ink-mute)", fontWeight: isHeader ? 700 : 500 }}>
                      {feature}
                    </td>
                    {[silver, gold, platinum, elite].map((val, j) => (
                      <td key={j} className="py-2.5 px-3 text-center"
                        style={{
                          color: val === "—" ? "var(--kk-ink-faint)" : isHeader ? "#1F8B4C" : "var(--kk-ink)",
                          fontWeight: isHeader ? 700 : val !== "—" ? 500 : 400,
                        }}>
                        {val}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div></>


        {/* Referral section */}
        {referralCode && (
          <div className="mb-12 rounded-2xl p-6" style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}>
            <p className="kk-overline mb-3">Referral program</p>
            <p className="text-[17px] font-bold mb-1" style={{ color: "var(--kk-ink)" }}>
              Refer 12 agents, get 1 full year free
            </p>
            <p className="text-[13px] mb-5" style={{ color: "var(--kk-ink-mute)" }}>
              Each agent who signs up with your code and pays their first month gives you full credit for that amount. Refer 12 and you have covered a full year on us.
            </p>

            {/* 4 stat boxes — 2×2 grid */}
            {(() => {
              const creditBalance = creditBalanceMyr + pendingCreditMyr;
              const isPending = pendingCreditMyr > 0 && creditBalanceMyr === 0;
              const stats = [
                {
                  label: "Signed up",
                  value: String(referralCount),
                  sub: referralCount === 0 ? "Share your link to start" : "Used your code",
                  green: false,
                },
                {
                  label: "Converted to paid",
                  value: String(referralPaidCount),
                  sub: referralPaidCount >= 12 ? "Goal reached!" : referralPaidCount === 0 ? "Made first payment" : `${12 - referralPaidCount} to go`,
                  green: referralPaidCount >= 12,
                },
                {
                  label: "Total credit earned",
                  value: `RM ${totalCreditEarnedMyr.toFixed(2)}`,
                  sub: totalCreditEarnedMyr === 0 ? "From paid referrals" : `From ${referralPaidCount} paid referral${referralPaidCount !== 1 ? "s" : ""}`,
                  green: totalCreditEarnedMyr > 0,
                },
                {
                  label: "Credit balance",
                  value: `RM ${creditBalance.toFixed(2)}`,
                  sub: isPending ? "Applied at first invoice" : creditBalance > 0 ? "Auto-applied to next invoice" : "Builds as referrals pay",
                  green: creditBalance > 0,
                },
              ];
              return (
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {stats.map((s) => (
                    <div key={s.label} className="rounded-xl px-3 py-3 flex flex-col gap-1"
                      style={{
                        background: s.green ? "var(--kk-green-soft)" : "var(--kk-surface-2)",
                        border: s.green ? "1px solid rgba(52,199,89,0.25)" : "1px solid var(--kk-line)",
                      }}>
                      <p className="text-[10px] font-semibold leading-tight"
                        style={{ color: s.green ? "var(--kk-green-ink)" : "var(--kk-ink-faint)" }}>
                        {s.label}
                      </p>
                      <p className="text-[15px] font-black tabular-nums leading-tight"
                        style={{ color: s.green ? "var(--kk-green-ink)" : "var(--kk-ink)" }}>
                        {s.value}
                      </p>
                      <p className="text-[10px] leading-tight"
                        style={{ color: s.green ? "var(--kk-green-ink)" : "var(--kk-ink-faint)", opacity: s.green ? 0.8 : 1 }}>
                        {s.sub}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}


            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--kk-ink-faint)" }}>Your referral code</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2.5 rounded-xl font-mono font-bold text-[14px] tracking-widest"
                    style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)", border: "1px solid var(--kk-line)" }}>
                    {referralCode.toUpperCase()}
                  </div>
                  <CopyButton text={referralCode.toUpperCase()} />
                </div>
              </div>

              {referralLink && (
                <div>
                  <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--kk-ink-faint)" }}>Share link</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2.5 rounded-xl text-[12px] truncate"
                      style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", border: "1px solid var(--kk-line)" }}>
                      {referralLink}
                    </div>
                    <CopyButton text={referralLink} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manage billing — always visible; API returns a clear error for non-subscribed users */}
        <div className="text-center">
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl font-semibold text-[14px] transition-opacity hover:opacity-85"
            style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink)", border: "1px solid var(--kk-line-strong)", opacity: portalLoading ? 0.6 : 1 }}
          >
            {portalLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {portalLoading ? "Opening…" : "Manage billing"}
          </button>
          <p className="mt-3 text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
            Secure payment via Stripe · No lock-in · Cancel anytime
          </p>
        </div>
      </div>
    </>
  );
}
