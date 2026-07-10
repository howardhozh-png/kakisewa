import Link from "next/link";
import { getAgentProfile, getHomeDashboardStats, getExpandedDashboardStats, getCalendarEventsForMonth, getPerformanceSummary, getUpcomingViewings } from "@/lib/db";
import type { CalendarEvent } from "@/lib/db";
import { StatsSection } from "./stats-section";
import { getTotalCardCount, TOTAL_CARD_CAP, effectivePlan } from "@/lib/plan-caps";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { ReferralBanner } from "@/components/referral-banner";
import { BetaSurveyModal } from "@/components/beta-survey-modal";

export const dynamic = "force-dynamic";

type Stats = Awaited<ReturnType<typeof getHomeDashboardStats>>;
type ExpandedStats = Awaited<ReturnType<typeof getExpandedDashboardStats>>;

// ─── Demo preview card ────────────────────────────────────────────────────────

function DemoPreview() {
  return (
    <div className="mt-8">
      <p
        className="text-[11px] font-semibold uppercase tracking-widest text-center mb-4"
        style={{ color: "var(--kk-ink-faint)" }}
      >
        Here's what you're setting up
      </p>
      <div style={{ opacity: 0.4, pointerEvents: "none", userSelect: "none" }}>
        <div className="kk-card p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold" style={{ color: "var(--kk-ink)" }}>
              Sarah Chong
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>
              Sunway Velocity · D-5-12 · RM 2,500/mo
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[12px] font-semibold" style={{ color: "#DC2626" }}>
              Expires in 45 days
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>
              RM 1,250 on renewal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Setup state (single gate + demo) ────────────────────────────────────────

function SetupState({
  firstName,
  cardCount,
  cardCap,
  planName,
}: {
  firstName: string | null;
  cardCount: number;
  cardCap: number;
  planName: string;
}) {
  return (
    <>
      <div className="mb-4">
        <CardDonut used={cardCount} cap={cardCap} planName={planName} />
      </div>

      <div className="kk-card p-5 mb-2">
        <p className="text-[15px] font-semibold mb-2" style={{ color: "var(--kk-ink)" }}>
          {firstName ? `Hi ${firstName} — add your first listing` : "Add your first listing"}
        </p>
        <p className="text-[13px] leading-relaxed mb-4" style={{ color: "var(--kk-ink-mute)" }}>
          We track when each one expires and alert you 60 days before. Every renewal is half a month's rent.
        </p>
        <Link
          href="/existing-listing"
          className="kk-pill kk-pill-primary text-[13px]"
          style={{ display: "inline-flex" }}
        >
          Add your first listing →
        </Link>
      </div>

      <DemoPreview />
    </>
  );
}

// ─── Card usage donut ─────────────────────────────────────────────────────────

function CardDonut({ used, cap, planName }: { used: number; cap: number; planName: string }) {
  const pct = cap > 0 ? Math.min(used / cap, 1) : 0;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  const isHigh = pct >= 0.8;
  const color = pct >= 1 ? "var(--kk-red)" : isHigh ? "var(--kk-amber)" : "var(--kk-green)";

  return (
    <Link href="/subscription" className="kk-card p-4 flex items-center gap-4 hover:opacity-80 transition-opacity">
      <svg width={68} height={68} viewBox="0 0 68 68">
        <circle cx={34} cy={34} r={r} fill="none" strokeWidth={7} stroke="var(--kk-line)" />
        <circle
          cx={34} cy={34} r={r} fill="none" strokeWidth={7}
          stroke={color}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 34 34)"
        />
        <text x={34} y={34} textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: 13, fontWeight: 700, fill: "var(--kk-ink)", fontFamily: "inherit" }}>
          {used}
        </text>
      </svg>
      <div className="min-w-0">
        <p className="kk-overline mb-0.5">Card usage</p>
        <p className="text-[20px] font-bold tabular-nums leading-tight" style={{ color: "var(--kk-ink)" }}>
          {used} <span className="text-[14px] font-medium" style={{ color: "var(--kk-ink-mute)" }}>/ {cap.toLocaleString()}</span>
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: isHigh ? "var(--kk-amber)" : "var(--kk-ink-faint)" }}>
          {planName} plan{isHigh && used < cap ? " — nearing limit" : used >= cap ? " — at limit" : ""}
        </p>
      </div>
    </Link>
  );
}

// ─── Active state (full dashboard) ───────────────────────────────────────────

function ActiveState({
  firstName,
  stats,
  expandedStats,
  monthEvents,
  currentMonth,
  cardCount,
  cardCap,
  planName,
  mtdCommission,
  closedThisMonth,
  upcomingViewings,
}: {
  firstName: string | null;
  stats: Stats;
  expandedStats: ExpandedStats;
  monthEvents: CalendarEvent[];
  currentMonth: string;
  cardCount: number;
  cardCap: number;
  planName: string;
  mtdCommission: number;
  closedThisMonth: number;
  upcomingViewings: CalendarEvent[];
}) {
  return (
    <>
      <div className="mb-6">
        <h1
          className="serif text-[26px] md:text-[36px] leading-tight tracking-tight"
          style={{ color: "var(--kk-ink)" }}
        >
          {firstName ? `${firstName}.` : "Your portfolio."}
        </h1>
        <p className="text-[13px] mt-1.5" style={{ color: "var(--kk-ink-mute)" }}>
          Good job showing up today, this is your pipeline snapshot.
        </p>
      </div>

      <StatsSection
        initialStats={expandedStats}
        monthEvents={monthEvents}
        currentMonth={currentMonth}
        mtdCommission={mtdCommission}
        closedThisMonth={closedThisMonth}
        upcomingViewings={upcomingViewings}
        cardCount={cardCount}
        cardCap={cardCap}
        planName={planName}
      />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const currentMonth = todayStr.slice(0, 7); // "2026-06"

  // Compute the Sunday of the current week to detect month-boundary overflow
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const todayDate = new Date(ty, tm - 1, td);
  const dow = (todayDate.getDay() + 6) % 7; // 0=Mon
  const sundayDate = new Date(ty, tm - 1, td - dow + 6);
  const sundayMonth = `${sundayDate.getFullYear()}-${String(sundayDate.getMonth() + 1).padStart(2, "0")}`;
  const spansNextMonth = sundayMonth !== currentMonth;

  const hdrs = await headers();
  const userId = hdrs.get("x-user-id");

  const [agent, stats, expandedStats, monthEventsBase, nextMonthEvents, perf, upcomingViewings] = await Promise.all([
    getAgentProfile(),
    getHomeDashboardStats(),
    getExpandedDashboardStats(1, currentMonth),
    getCalendarEventsForMonth(currentMonth),
    spansNextMonth ? getCalendarEventsForMonth(sundayMonth) : Promise.resolve([] as Awaited<ReturnType<typeof getCalendarEventsForMonth>>),
    getPerformanceSummary(),
    getUpcomingViewings(14),
  ]);
  const monthEvents = spansNextMonth ? [...monthEventsBase, ...nextMonthEvents] : monthEventsBase;
  const firstName = agent.name ? agent.name.trim().split(" ")[0] : null;

  const contractsComplete = stats.activeContracts > 0;
  const isSetupComplete = contractsComplete;

  // Card usage — always fetch for donut display in both setup and active states
  let cardCount = 0;
  if (userId) {
    try {
      const supabase = await createClient();
      cardCount = await getTotalCardCount(supabase, userId);
    } catch {}
  }
  const plan = effectivePlan(agent);
  const cardCap = TOTAL_CARD_CAP[plan] ?? 1000;
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <div className="mx-auto max-w-[1440px] px-4 lg:px-8 py-6 lg:py-16">
      <BetaSurveyModal surveyCompleted={!!agent.survey_completed_at || !!agent.is_test_account} />
      <ReferralBanner />
      {isSetupComplete ? (
        <ActiveState
          firstName={firstName}
          stats={stats}
          expandedStats={expandedStats}
          monthEvents={monthEvents}
          currentMonth={currentMonth}
          cardCount={cardCount}
          cardCap={cardCap}
          planName={planLabel}
          mtdCommission={perf.mtdCommission}
          closedThisMonth={perf.signedThisMonth}
          upcomingViewings={upcomingViewings}
        />
      ) : (
        <SetupState
          firstName={firstName}
          cardCount={cardCount}
          cardCap={cardCap}
          planName={planLabel}
        />
      )}
    </div>
  );
}
