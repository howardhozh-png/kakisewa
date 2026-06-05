import { headers } from "next/headers";
import { TopNav } from "@/components/top-nav";
import { GreetingBar } from "@/components/greeting-bar";
import { AccentProvider } from "@/components/accent-provider";
import { OnboardingDemoModal } from "@/components/onboarding-demo-modal";
import { TrialBanner } from "@/components/trial-banner";
import { TrialGate } from "@/components/trial-gate";
import { TrialDowngradeNotice } from "@/components/trial-downgrade-notice";
import { SessionGuard } from "@/components/session-guard";
import { Toaster } from "@/components/ui/sonner";
import { FeedbackButton } from "@/components/feedback-button";
import { getAgentProfile, recordLoginStreak, countOwnerLeads, countLifecycleTenancies, countTenantProfiles, countPropertySupports } from "@/lib/db";
import { OnboardingNudge } from "@/components/onboarding-nudge";
import { ProfileSetupModal } from "@/components/profile-setup-modal";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const agent = await getAgentProfile();
  const trialStart = agent.trial_started_at ? new Date(agent.trial_started_at) : undefined;
  const [leadCount, contractCount, tenantCount, supportCount] = await Promise.all([
    countOwnerLeads().catch(() => null),
    countLifecycleTenancies().catch(() => null),
    countTenantProfiles().catch(() => null),
    countPropertySupports(trialStart).catch(() => null),
  ]);
  // Fire streak update without blocking the render — only writes once per day
  recordLoginStreak().catch(() => {});
  const streak = agent.login_streak ?? 0;
  const checkedInToday = agent.last_login_date === new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const hdrs = await headers();
  const isAdmin = hdrs.get("x-is-admin") === "true";
  const status = agent.subscription_status ?? null;
  const trialEndsAt = agent.trial_ends_at ? new Date(agent.trial_ends_at) : null;
  const now = new Date();
  const trialDaysLeft = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86400000) : null;
  // TrialGate (blocking overlay) never shows for admins; banner + countdown show for all users on trial
  const isTrialExpired = !isAdmin && (
    status === "expired" ||
    (status === "trial" && trialDaysLeft !== null && trialDaysLeft <= 0)
  );
  const showTrialBanner = !isTrialExpired && status === "trial" && trialDaysLeft !== null && trialDaysLeft <= 14;
  const trialStartedAt = trialStart ?? null;
  const daysSinceSignup = trialStartedAt ? Math.floor((now.getTime() - trialStartedAt.getTime()) / 86400000) : 999;
  const isNewAgent = daysSinceSignup <= 30;

  return (
    <div className="flex flex-col min-h-screen">
      <AccentProvider color={agent.accent_color} />
      <div className="sticky top-0 z-50">
        {showTrialBanner && <TrialBanner daysLeft={trialDaysLeft!} />}
        <TopNav agent={agent} isAdmin={isAdmin} trialDaysLeft={trialDaysLeft} />
      </div>
      <GreetingBar name={agent.name} streak={streak} checkedInToday={checkedInToday} />
      <OnboardingNudge
        isNewAgent={isNewAgent}
        hasLeads={(leadCount ?? 0) > 0}
        hasContracts={(contractCount ?? 0) > 0}
        hasTenants={(tenantCount ?? 0) > 0}
        hasSupports={(supportCount ?? 0) > 0}
      />
      <main className="flex-1">{children}</main>
      <OnboardingDemoModal />
      <TrialDowngradeNotice archivedCount={agent.trial_downgrade_archived_count ?? null} />
      <ProfileSetupModal
        needsSetup={!isAdmin && (!agent.phone || !agent.ren_number)}
        agentName={agent.name}
      />
      <Toaster richColors position="top-right" closeButton />
      {isTrialExpired && <TrialGate />}
      <FeedbackButton />
      <SessionGuard />
    </div>
  );
}
