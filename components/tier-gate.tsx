import { getAgentProfile } from "@/lib/db";
import Link from "next/link";

const PLAN_RANK: Record<string, number> = { silver: 1, platinum: 2, elite: 3 };

const TIER_CONFIG = {
  platinum: {
    name: "Platinum",
    gradient: "linear-gradient(145deg, #0b1f4a 0%, #1a3464 50%, #0a1a3c 100%)",
    accent: "#1a3464",
    features: [
      "Track all existing tenancy contracts",
      "Capture renewal commission automatically",
      "Contract expiry reminders & messaging",
    ],
  },
  elite: {
    name: "Elite",
    gradient: "linear-gradient(145deg, #6b3d1e 0%, #c98840 50%, #5c3015 100%)",
    accent: "#a8692e",
    features: [
      "Property support contacts directory",
      "Performance dashboard & income tracking",
      "Analytics, newsletter & priority updates",
    ],
  },
} as const;

function TierGateOverlay({ minPlan }: { minPlan: "platinum" | "elite" }) {
  const cfg = TIER_CONFIG[minPlan];
  return (
    <div
      className="fixed inset-x-0 bottom-0 flex items-center justify-center px-4 z-40"
      style={{ top: 64, background: "rgba(0,0,0,0.18)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }}
      >
        {/* Tier header */}
        <div
          className="px-8 py-7 flex flex-col items-center text-center relative overflow-hidden"
          style={{ background: cfg.gradient }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 60%)" }}
          />
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 relative"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="12" rx="2.5" stroke="white" strokeWidth="2" />
              <path d="M7 11V7.5a5 5 0 0 1 10 0V11" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
            {cfg.name} plan required
          </p>
          <p className="text-[22px] font-bold leading-snug" style={{ color: "#fff" }}>
            Upgrade to unlock this
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          <p className="text-[13px] mb-5" style={{ color: "var(--kk-ink-mute)" }}>
            {cfg.name} members get access to:
          </p>
          <ul className="space-y-3 mb-7">
            {cfg.features.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <span
                  className="text-[16px] font-black leading-none mt-0.5 shrink-0"
                  style={{ color: cfg.accent }}
                >
                  +
                </span>
                <span className="text-[13px] font-medium leading-snug" style={{ color: "var(--kk-ink)" }}>
                  {f}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/subscription"
            className="block w-full py-3.5 rounded-2xl text-center text-[14px] font-bold transition-opacity hover:opacity-85"
            style={{ background: cfg.gradient, color: "#fff" }}
          >
            View {cfg.name} plan →
          </Link>
          <p className="text-center text-[11px] mt-3" style={{ color: "var(--kk-ink-faint)" }}>
            Upgrade takes effect immediately · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}

export async function checkTierGate(minPlan: "platinum" | "elite"): Promise<React.ReactElement | null> {
  const agent = await getAgentProfile();
  if (agent.subscription_status === "trial") return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plan = (agent as any).subscription_plan as string | null;
  if (plan && (PLAN_RANK[plan] ?? 0) >= PLAN_RANK[minPlan]) return null;

  return <TierGateOverlay minPlan={minPlan} />;
}
