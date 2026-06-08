import { headers } from "next/headers";
import { TopNav } from "@/components/top-nav";
import { GreetingBar } from "@/components/greeting-bar";
import { AccentProvider } from "@/components/accent-provider";
import { OnboardingDemoDialog } from "@/components/onboarding-demo-dialog";
import { TrialBanner } from "@/components/trial-banner";
import { TrialGate } from "@/components/trial-gate";
import { BetaFrozenGate } from "@/components/beta-frozen-gate";
import { TrialDowngradeNotice } from "@/components/trial-downgrade-notice";
import { SessionGuard } from "@/components/session-guard";
import { Toaster } from "@/components/ui/sonner";
import { FeedbackButton } from "@/components/feedback-button";
import { getAgentProfile, recordLoginStreak, countOwnerLeads, countLifecycleTenancies, countTenantProfiles, countPropertySupports, getHomeDashboardStats } from "@/lib/db";
import { OnboardingNudge } from "@/components/onboarding-nudge";
import { ProfileSetupDialog } from "@/components/profile-setup-dialog";
import { ProfileProvider } from "@/components/profile-context";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { SidebarNav } from "@/components/sidebar-nav";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { GuideStrip } from "@/components/guide-strip";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const agent = await getAgentProfile();
  const trialStart = agent.trial_started_at ? new Date(agent.trial_started_at) : undefined;
  const [leadCount, contractCount, tenantCount, supportCount, dashStats] = await Promise.all([
    countOwnerLeads().catch(() => null),
    countLifecycleTenancies().catch(() => null),
    countTenantProfiles().catch(() => null),
    countPropertySupports(trialStart).catch(() => null),
    getHomeDashboardStats().catch(() => null),
  ]);
  recordLoginStreak().catch(() => {});
  const streak = agent.login_streak ?? 0;
  const checkedInToday = agent.last_login_date === new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const hdrs = await headers();
  const isAdmin = hdrs.get("x-is-admin") === "true";
  const status = agent.subscription_status ?? null;
  const trialEndsAt = agent.trial_ends_at ? new Date(agent.trial_ends_at) : null;
  const now = new Date();
  const trialDaysLeft = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86400000) : null;
  const isBetaFrozen = !isAdmin && status === "beta_frozen";
  const isTrialExpired = !isAdmin && (
    status === "expired" ||
    (status === "trial" && trialDaysLeft !== null && trialDaysLeft <= 0)
  );
  const showTrialBanner = !isTrialExpired && !isBetaFrozen && (status === "beta" || status === "trial") && trialDaysLeft !== null && trialDaysLeft <= 7;
  const trialStartedAt = trialStart ?? null;
  const daysSinceSignup = trialStartedAt ? Math.floor((now.getTime() - trialStartedAt.getTime()) / 86400000) : 0;
  const isNewAgent = status === "beta" || status === "trial" || daysSinceSignup <= 14;

  const plan = agent.subscription_plan ?? null;
  const uncontacted = dashStats?.uncontacted ?? 0;
  const expiringIn60 = dashStats?.expiringIn60 ?? 0;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--kk-bg)" }}>
      {/* Sidebar / bottom-tab visibility — inlined so it's never stale from CSS cache */}
      <style>{`
        .kk-sidebar-nav { display: flex; flex-direction: column; }
        .kk-bottom-tab  { display: none; }
        .kk-main-col    { padding-left: 64px; }
        @media (max-width: 1023px) {
          .kk-sidebar-nav { display: none; }
          .kk-bottom-tab  { display: flex; }
          .kk-main-col    { padding-left: 0; }
        }
      `}</style>
      <AccentProvider color={agent.accent_color} />

      {/* Left sidebar — desktop only, fixed overlay (doesn't push content) */}
      <SidebarNav plan={plan} status={status} isAdmin={isAdmin} />

      {/* Main column — padding-left matches collapsed sidebar width on desktop */}
      <div className="kk-main-col" style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>

        {/* Top bar — sticky */}
        <div className="sticky top-0 z-50">
          {showTrialBanner && <TrialBanner daysLeft={trialDaysLeft!} isBeta={status === "beta"} />}
          <TopNav agent={agent} isAdmin={isAdmin} trialDaysLeft={trialDaysLeft} hideTabs />
          <PwaInstallBanner />
        </div>

        {/* Contextual guide strip — every page */}
        <GuideStrip uncontacted={uncontacted} expiringIn60={expiringIn60} />

        {/* Streak / greeting bar */}
        <GreetingBar name={agent.name} streak={streak} checkedInToday={checkedInToday} />

        <OnboardingNudge
          isNewAgent={isNewAgent}
          hasLeads={(leadCount ?? 0) > 0}
          hasContracts={(contractCount ?? 0) > 0}
          hasTenants={(tenantCount ?? 0) > 0}
          hasSupports={(supportCount ?? 0) > 0}
        />

        <ProfileProvider profile={agent}>
          {/* pb-20 on mobile leaves room for the bottom tab bar */}
          <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        </ProfileProvider>
      </div>

      {/* Bottom tab bar — mobile only */}
      <BottomTabBar />

      {/* Overlays & dialogs */}
      <OnboardingDemoDialog />
      <TrialDowngradeNotice archivedCount={agent.trial_downgrade_archived_count ?? null} />
      <ProfileSetupDialog
        needsSetup={!isAdmin && (!agent.phone || !agent.ren_number)}
        agentName={agent.name}
      />
      <Toaster richColors position="top-right" closeButton />
      {isBetaFrozen && <BetaFrozenGate />}
      {isTrialExpired && <TrialGate />}
      <FeedbackButton />
      <SessionGuard />
    </div>
  );
}
