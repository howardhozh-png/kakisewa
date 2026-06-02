"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// ── Plan data ─────────────────────────────────────────────────────────────────

const TIER_STYLES = {
  Silver: {
    bg: "linear-gradient(145deg, #f5f5f5 0%, #e2e2e2 35%, #ececec 60%, #d0d0d0 100%)",
    shine: "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 50%)",
    shadow: "0 12px 40px rgba(0,0,0,0.13)",
    ink: "#1a1a1a", mute: "#444", faint: "#777",
    roiGreen: "#1F8B4C",
    btnBg: "rgba(255,255,255,0.95)", btnInk: "#1a1a1a",
    btnShadow: "0 2px 8px rgba(0,0,0,0.10)",
  },
  Platinum: {
    bg: "linear-gradient(145deg, #0b1f4a 0%, #1a3464 35%, #152a56 65%, #0a1a3c 100%)",
    shine: "linear-gradient(135deg, rgba(100,160,255,0.18) 0%, rgba(255,255,255,0) 55%)",
    shadow: "0 12px 40px rgba(26,52,100,0.5)",
    ink: "#ffffff", mute: "rgba(255,255,255,0.82)", faint: "rgba(255,255,255,0.6)",
    roiGreen: "#1F8B4C",
    btnBg: "rgba(255,255,255,0.62)", btnInk: "#0b1f4a",
    btnShadow: "0 3px 10px rgba(0,0,30,0.30)",
  },
  Elite: {
    bg: "linear-gradient(145deg, #6b3d1e 0%, #a8692e 25%, #c98840 50%, #9a5e28 75%, #5c3015 100%)",
    shine: "linear-gradient(135deg, rgba(255,210,140,0.18) 0%, rgba(255,255,255,0) 50%)",
    shadow: "0 12px 40px rgba(139,94,60,0.55)",
    ink: "#fff8f0", mute: "rgba(255,240,210,0.88)", faint: "rgba(255,230,190,0.65)",
    roiGreen: "#1F8B4C",
    btnBg: "rgba(255,255,255,0.62)", btnInk: "#5c3015",
    btnShadow: "0 3px 10px rgba(80,40,0,0.28)",
  },
};

const PLANS = [
  {
    name: "Silver" as const, planId: "silver" as const,
    monthly: 198, annualMonthly: 165, annualTotal: 1980, annualSavings: 396,
    monthlyAnnualTotal: 2376,
    roiMonths: "12 months free",
    features: [
      { label: "Bulk owner list upload" },
      { label: "Automatically track owner reply" },
      { label: "Customized and branded tenant pack" },
      { label: "Close more owners" },
    ],
    plusFeatures: [] as string[],
    recommended: "New agents who need support in tracking owner responses and converting more new owners with branded profile and messaging.",
    popular: false,
  },
  {
    name: "Platinum" as const, planId: "platinum" as const,
    monthly: 398, annualMonthly: 332, annualTotal: 3980, annualSavings: 796,
    monthlyAnnualTotal: 4776,
    roiMonths: "6 months free",
    features: [{ label: "Everything in Silver, plus:", italic: true }],
    plusFeatures: ["Unlock \"Existing contracts\"", "Capture all renewal commission", "Contract renewal reminder and messaging"],
    recommended: "Experienced agent who needs support in capturing all contract renewal income by tracking existing contracts.",
    popular: true,
  },
  {
    name: "Elite" as const, planId: "elite" as const,
    monthly: 498, annualMonthly: 415, annualTotal: 4980, annualSavings: 996,
    monthlyAnnualTotal: 5976,
    roiMonths: "5 months free",
    features: [{ label: "Everything in Platinum, plus:", italic: true }],
    plusFeatures: ["Property support management", "Performance dashboard", "Analytics and newsletter"],
    recommended: "Elite agent who wants everything in one-place, including goal planning, performance tracking, property services contacts.",
    popular: false,
  },
];

// ── Confirm dialog ────────────────────────────────────────────────────────────

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
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [loading, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}
      >
        {/* Top section — ~75% of modal real estate */}
        <div className="px-7 pt-8 pb-7 relative" style={{ background: s.bg }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: s.shine }} />
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: s.faint }}>
            Confirm subscription
          </p>
          <p className="text-[28px] font-bold leading-tight mb-5" style={{ color: s.ink }}>
            kakisewa {plan.name}
          </p>

          {/* Price block */}
          <div className="flex items-end gap-2 mb-2">
            <span className="text-[42px] font-bold leading-none tabular-nums" style={{ color: s.ink, letterSpacing: "-0.03em" }}>
              RM {price}
            </span>
            <span className="text-[16px] pb-1.5" style={{ color: s.mute }}>/month</span>
          </div>

          {interval === "annual" ? (
            <div className="space-y-1 mt-3">
              <p className="text-[15px] font-semibold" style={{ color: s.mute }}>
                RM {plan.annualTotal.toLocaleString()} billed annually
              </p>
              <p className="text-[13px] font-semibold" style={{ color: s.roiGreen }}>
                Save RM {plan.annualSavings}/year · 2 months free
              </p>
            </div>
          ) : (
            <p className="text-[14px] mt-3" style={{ color: s.mute }}>
              RM {plan.monthlyAnnualTotal.toLocaleString()} billed monthly over 12 months
            </p>
          )}
        </div>

        {/* Bottom section — compact */}
        <div className="px-6 pt-4 pb-5 space-y-4">
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--kk-ink-faint)" }}>
            You&apos;ll be redirected to Stripe to complete payment securely. Subscription activates immediately after payment.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-opacity hover:opacity-70"
              style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", border: "1px solid var(--kk-line)" }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-opacity hover:opacity-85 flex items-center justify-center gap-1.5"
              style={{ background: "var(--kk-ink)", color: "#fff", opacity: loading ? 0.7 : 1 }}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? "Redirecting…" : "Confirm & Pay →"}
            </button>
          </div>
          <p className="text-[10px] text-center" style={{ color: "var(--kk-ink-faint)" }}>
            Press Esc to cancel
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main client component ──────────────────────────────────────────────────────

interface Props {
  status: string | null;
  trialDaysLeft: number | null;
  currentPlan: string | null;
}

export function SubscriptionClient({ status, trialDaysLeft, currentPlan }: Props) {
  const [pending, setPending] = useState<{ plan: typeof PLANS[number]; interval: "monthly" | "annual" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

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
      setPending(null);
      setLoading(false);
      router.refresh();
    } else if (data.url) {
      window.location.href = data.url;
    } else {
      toast.error(data.error ?? "Something went wrong");
      setLoading(false);
      setPending(null);
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

      <div className="mx-auto max-w-[1040px] px-6 lg:px-10 py-10 lg:py-14">
        {/* Header */}
        <header className="mb-10">
          <h1 className="serif kk-display" style={{ color: "var(--kk-ink)" }}>Subscription</h1>
          <p className="mt-2 kk-body" style={{ color: "var(--kk-ink-mute)" }}>
            If kakisewa helps you <strong style={{ color: "var(--kk-ink)" }}>capture just 1 missed contract renewal at RM 2,000</strong>, it means kakisewa is...
          </p>

          {/* Status pills */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {isOnTrial && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold"
                style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                Trial · {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} remaining — subscribe to keep full access
              </span>
            )}
          </div>
        </header>

        {/* Plan cards */}
        <div className="grid lg:grid-cols-3 gap-5 mb-12">
          {PLANS.map(plan => {
            const s = TIER_STYLES[plan.name];
            const isCurrentPlan = currentPlan === plan.planId;

            return (
              <div key={plan.name} className="flex flex-col">
                {/* ROI label above card */}
                <div className="text-center mb-3 h-8 flex items-end justify-center">
                  <span
                    className="text-[22px] font-bold tracking-tight leading-none"
                    style={{ color: "var(--kk-green)" }}
                  >
                    {plan.roiMonths}
                  </span>
                </div>

                {/* Card */}
                <div
                  className="rounded-2xl flex flex-col overflow-hidden flex-1"
                  style={{
                    background: s.bg,
                    boxShadow: isCurrentPlan
                      ? `0 0 0 3px var(--kk-green), ${s.shadow}`
                      : s.shadow,
                    position: "relative",
                  }}
                >
                  <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ background: s.shine }} />

                  {/* Badge: "Most popular" or "Your plan" — top-right inside card */}
                  {(plan.popular || isCurrentPlan) && (
                    <div className="absolute top-4 right-4 z-10">
                      <span
                        className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest"
                        style={{
                          background: isCurrentPlan ? "var(--kk-green)" : "#EAB308",
                          color: "#fff",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isCurrentPlan ? "Active plan" : "Most popular"}
                      </span>
                    </div>
                  )}

                  <div className="p-6 flex flex-col gap-5 flex-1">
                    {/* Name + price */}
                    <div className={plan.popular || isCurrentPlan ? "pr-24" : ""}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: s.faint }}>{plan.name}</p>
                      <p className="text-[32px] font-bold leading-none tabular-nums" style={{ color: s.ink, letterSpacing: "-0.03em" }}>
                        RM {plan.monthly}
                      </p>
                      <p className="text-[12px] mt-1" style={{ color: s.mute }}>/month</p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2.5 flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          {"italic" in f && f.italic ? null : (
                            <span className="text-[12px] font-bold shrink-0 mt-px" style={{ color: s.roiGreen }}>✓</span>
                          )}
                          <span
                            className="text-[13px] leading-snug"
                            style={{
                              color: "italic" in f && f.italic ? s.faint : s.ink,
                              fontStyle: "italic" in f && f.italic ? "italic" : "normal",
                            }}
                          >
                            {f.label}
                          </span>
                        </li>
                      ))}
                      {plan.plusFeatures.map((f, i) => (
                        <li key={`plus-${i}`} className="flex items-start gap-2.5">
                          <span
                            className="font-black shrink-0 leading-none"
                            style={{ color: s.roiGreen, fontSize: "18px", marginTop: "1px" }}
                          >
                            +
                          </span>
                          <span className="text-[13px] font-semibold leading-snug" style={{ color: s.ink }}>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Recommended for */}
                    <div>
                      <div style={{ borderTop: `1px solid ${s.faint}`, opacity: 0.4, marginBottom: 10 }} />
                      <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: s.faint }}>Recommended for</p>
                      <p className="text-[11px] leading-relaxed" style={{ color: s.mute }}>{plan.recommended}</p>
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-col gap-2">
                      {/* Pay monthly */}
                      <button
                        onClick={() => setPending({ plan, interval: "monthly" })}
                        className="w-full py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col items-center gap-0.5"
                        style={{ background: s.btnBg, color: s.btnInk, border: "none", boxShadow: s.btnShadow }}
                      >
                        <span className="text-[15px] font-bold">Pay monthly</span>
                        <span className="text-[12px] opacity-70">
                          RM {plan.monthlyAnnualTotal.toLocaleString()} total/year
                        </span>
                      </button>

                      {/* Pay annually — strikethrough comparison */}
                      <button
                        onClick={() => setPending({ plan, interval: "annual" })}
                        className="w-full py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col items-center gap-0.5"
                        style={{ background: s.btnBg, color: s.btnInk, border: "none", boxShadow: s.btnShadow }}
                      >
                        <span className="text-[15px] font-bold">Pay annually</span>
                        <span className="text-[12px] flex items-center justify-center gap-1.5 flex-wrap">
                          <span style={{ textDecoration: "line-through", opacity: 0.45 }}>
                            RM {plan.monthlyAnnualTotal.toLocaleString()}
                          </span>
                          <span style={{ color: s.roiGreen, fontWeight: 700 }}>
                            RM {plan.annualTotal.toLocaleString()}/year
                          </span>
                        </span>
                        <span className="text-[11px] font-medium" style={{ color: s.roiGreen }}>
                          save RM {plan.annualSavings} · 2 months free
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Manage billing */}
        <div className="text-center">
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl font-semibold text-[14px] transition-opacity hover:opacity-85"
            style={{
              background: "var(--kk-surface-2)",
              color: "var(--kk-ink)",
              border: "1px solid var(--kk-line-strong)",
              opacity: portalLoading ? 0.6 : 1,
            }}
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
