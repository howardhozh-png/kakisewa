import { headers } from "next/headers";
import { TopNav } from "@/components/top-nav";
import { GreetingBar } from "@/components/greeting-bar";
import { AccentProvider } from "@/components/accent-provider";
import { SpotlightTour } from "@/components/spotlight-tour";
import { OnboardingDemoModal } from "@/components/onboarding-demo-modal";
import { TrialBanner } from "@/components/trial-banner";
import { TrialGate } from "@/components/trial-gate";
import { SessionGuard } from "@/components/session-guard";
import { Toaster } from "@/components/ui/sonner";
import { FeedbackButton } from "@/components/feedback-button";
import { getAgentProfile, recordLoginStreak } from "@/lib/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const agent = await getAgentProfile();
  // Fire streak update without blocking the render — only writes once per day
  recordLoginStreak().catch(() => {});
  const streak = agent.login_streak ?? 0;

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
  const showTrialBanner = !isTrialExpired && status === "trial" && trialDaysLeft !== null && trialDaysLeft <= 7;

  return (
    <div className="flex flex-col min-h-screen">
      <AccentProvider color={agent.accent_color} />
      <div className="sticky top-0 z-50">
        {showTrialBanner && <TrialBanner daysLeft={trialDaysLeft!} />}
        <TopNav agent={agent} isAdmin={isAdmin} trialDaysLeft={trialDaysLeft} />
      </div>
      <GreetingBar name={agent.name} streak={streak} />
      <main className="flex-1">{children}</main>
      <SpotlightTour />
      <OnboardingDemoModal />
      <Toaster richColors position="top-right" closeButton />
      {isTrialExpired && <TrialGate />}
      <FeedbackButton />
      <SessionGuard />
    </div>
  );
}
