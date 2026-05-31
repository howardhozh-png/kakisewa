import { headers } from "next/headers";
import { TopNav } from "@/components/top-nav";
import { GreetingBar } from "@/components/greeting-bar";
import { AccentProvider } from "@/components/accent-provider";
import { SpotlightTour } from "@/components/spotlight-tour";
import { TrialBanner } from "@/components/trial-banner";
import { TrialGate } from "@/components/trial-gate";
import { Toaster } from "@/components/ui/sonner";
import { getAgentProfile, recordLoginStreak } from "@/lib/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const agent = await getAgentProfile();
  // Fire streak update without blocking the render — only writes once per day
  recordLoginStreak().catch(() => {});
  const streak = agent.login_streak ?? 0;

  // Compute trial state — admins (x-is-admin header set by middleware) are always active
  const hdrs = await headers();
  const isAdmin = hdrs.get("x-is-admin") === "true";
  const status = agent.subscription_status ?? null;
  const trialEndsAt = agent.trial_ends_at ? new Date(agent.trial_ends_at) : null;
  const now = new Date();
  const trialDaysLeft = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86400000) : null;
  const isTrialExpired = !isAdmin && (
    status === "expired" ||
    (status === "trial" && trialDaysLeft !== null && trialDaysLeft <= 0)
  );
  const showTrialBanner = !isAdmin && !isTrialExpired && status === "trial" && trialDaysLeft !== null && trialDaysLeft <= 7;

  return (
    <div className="flex flex-col min-h-screen">
      <AccentProvider color={agent.accent_color} />
      {showTrialBanner && <TrialBanner daysLeft={trialDaysLeft!} />}
      <TopNav agent={agent} isAdmin={isAdmin} />
      <GreetingBar name={agent.name} streak={streak} />
      <main className="flex-1">{children}</main>
      <SpotlightTour />
      <Toaster richColors position="top-right" closeButton />
      {isTrialExpired && <TrialGate />}
    </div>
  );
}
