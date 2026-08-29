import { getAgentProfile, getHomeDashboardStats, getExpandedDashboardStats, getCalendarEventsForMonth, getPerformanceSummary, getUpcomingViewings } from "@/lib/db";
import type { CalendarEvent } from "@/lib/db";
import { StatsSection } from "./stats-section";
import { getTotalCardCount, TOTAL_CARD_CAP, effectivePlan } from "@/lib/plan-caps";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { ReferralBanner } from "@/components/referral-banner";
import { BetaSurveyModal } from "@/components/beta-survey-modal";
import { AnnouncementCard } from "@/components/announcement-card";
import { getUnreadAnnouncements } from "@/lib/announcements";

export const dynamic = "force-dynamic";

type Stats = Awaited<ReturnType<typeof getHomeDashboardStats>>;
type ExpandedStats = Awaited<ReturnType<typeof getExpandedDashboardStats>>;

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
  // Reuse cached agent profile -- getUnreadAnnouncements reads profile data already in memory
  const unreadAnnouncements = await getUnreadAnnouncements(agent).catch(() => []);
  const monthEvents = spansNextMonth ? [...monthEventsBase, ...nextMonthEvents] : monthEventsBase;
  const firstName = agent.name ? agent.name.trim().split(" ")[0] : null;

  // Card usage — always fetch for donut display
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
      <AnnouncementCard announcements={unreadAnnouncements} />
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
    </div>
  );
}
