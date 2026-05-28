import { getMonthlyCommissionTimeline, getAgentProfile, getLifetimeCommissionStats } from "@/lib/db";
import { PerformanceOverview } from "@/components/performance-overview";
import { TodayFocus } from "@/components/today-focus";
import { DealMilestone } from "@/components/deal-milestone";
import { GoalProvider } from "@/components/goal-context";

export const dynamic = "force-dynamic";

interface Props { searchParams: Promise<{ year?: string }> }

export default async function PerformancePage({ searchParams }: Props) {
  const { year: yearStr } = await searchParams;
  const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();
  const [timeline, agent, lifetime] = await Promise.all([
    getMonthlyCommissionTimeline(year),
    getAgentProfile(),
    getLifetimeCommissionStats(),
  ]);

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-12 lg:py-16">
      <header className="mb-8">
        <p className="kk-overline mb-3">Income tracker</p>
        <h1 className="serif kk-display" style={{ color: "var(--kk-ink)" }}>
          Track your goals
        </h1>
        <p className="mt-3 kk-body-sm" style={{ color: "var(--kk-ink-mute)" }}>
          Track your earned commissions, set monthly target and plan your goals.
        </p>
      </header>

      <GoalProvider initial={timeline.monthlyGoal ?? 0}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-stretch">
          <DealMilestone
            dealCount={lifetime.dealCount}
            totalEarned={lifetime.totalEarned}
            yearDeals={lifetime.yearDeals}
            yearEarned={lifetime.yearEarned}
            yearGoal={lifetime.yearGoal}
            bestMonthAmount={lifetime.bestMonthAmount}
            bestMonthLabel={lifetime.bestMonthLabel}
            bestMonthThisYearAmount={lifetime.bestMonthThisYearAmount}
            bestMonthThisYearLabel={lifetime.bestMonthThisYearLabel}
          />
          <TodayFocus initialText={agent.today_focus} updatedAt={agent.today_focus_updated_at} initialChecklist={agent.today_checklist} />
        </div>

        <PerformanceOverview
          initialMonths={timeline.months}
          initialMonthlyGoal={timeline.monthlyGoal}
          initialCommissionPct={agent.commission_pct ?? 100}
          ytd={timeline.ytd}
          remainingMonths={timeline.remainingMonths}
          year={year}
        />
      </GoalProvider>

    </div>
  );
}
