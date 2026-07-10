import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/top-nav";
import { GreetingBar } from "@/components/greeting-bar";
import { AccentProvider } from "@/components/accent-provider";
import { OnboardingDemoDialog } from "@/components/onboarding-demo-dialog";
import { TrialBanner } from "@/components/trial-banner";
import { TrialCardNudge } from "@/components/trial-card-nudge";
import { TrialWelcomeBanner } from "@/components/trial-welcome-banner";
import { ReferralTopBanner } from "@/components/referral-top-banner";
import { PushTopBanner } from "@/components/push-top-banner";
import { TrialGate } from "@/components/trial-gate";
import { BetaFrozenGate } from "@/components/beta-frozen-gate";
import { CancelledGate } from "@/components/cancelled-gate";
import { OnboardingGate } from "@/components/onboarding-gate";
import { TrialDowngradeNotice } from "@/components/trial-downgrade-notice";
import { SessionGuard } from "@/components/session-guard";
import { FaqChatbot } from "@/components/faq-chatbot";
import { Toaster } from "@/components/ui/sonner";
import { FeedbackButton } from "@/components/feedback-button";
import { getAgentProfile, recordLoginStreak, countPushSubscriptions, countOwnerLeads, countLifecycleTenancies } from "@/lib/db";
import { getTotalCardCount } from "@/lib/plan-caps";
import { createClient } from "@/lib/supabase/server";
import { PushNudge } from "@/components/push-nudge";
import { ProfileSetupDialog } from "@/components/profile-setup-dialog";
import { ProfileProvider } from "@/components/profile-context";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { PwaGate } from "@/components/pwa-gate";
import { SidebarNav } from "@/components/sidebar-nav";
import { Suspense } from "react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const agent = await getAgentProfile();
  if (agent.id === 0) redirect("/login");
  const [pushSubCount, ownerLeadCount, lifecycleTenancyCount] = await Promise.all([
    countPushSubscriptions().catch(() => null),
    countOwnerLeads().catch(() => null),
    countLifecycleTenancies().catch(() => null),
  ]);
  recordLoginStreak().catch(() => {});
  const streak = agent.login_streak ?? 0;
  const checkedInToday = agent.last_login_date === new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });

  const hdrs = await headers();
  const isAdmin = hdrs.get("x-is-admin") === "true";
  const userId = hdrs.get("x-user-id");
  const status = agent.subscription_status ?? null;
  const trialEndsAt = agent.trial_ends_at ? new Date(agent.trial_ends_at) : null;
  const now = new Date();
  const trialDaysLeft = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86400000) : null;
  const isBetaFrozen = !isAdmin && status === "beta_frozen";
  const isTrialExpired = !isAdmin && (
    status === "expired" ||
    (status === "trial" && trialDaysLeft !== null && trialDaysLeft <= 0)
  );
  const isCancelled = !isAdmin && status === "cancelled";
  const showTrialBanner = !isTrialExpired && !isBetaFrozen && status === "trial" && trialDaysLeft !== null && trialDaysLeft <= 7;
  // Fetch card count once for trial banner (only when banner will show)
  let trialCardCount: number | undefined;
  if (showTrialBanner && userId) {
    try {
      const supabase = await createClient();
      trialCardCount = await getTotalCardCount(supabase, userId);
    } catch {}
  }
  // Show card nudge 8-30 days before trial ends (distinct from the urgent 7-day banner);
  // escalates to a red/urgent style once 15 days or fewer remain
  const showCardNudge = !isTrialExpired && !isBetaFrozen && status === "trial" && trialDaysLeft !== null && trialDaysLeft > 7 && trialDaysLeft <= 30 && !agent.stripe_subscription_id;
  const cardNudgeUrgent = trialDaysLeft !== null && trialDaysLeft <= 15;

  const plan = agent.subscription_plan ?? null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--kk-bg)" }}>
      {/* Sidebar visibility — inlined to avoid Turbopack CSS chunk caching */}
      <style>{`
        :root { --kk-sidebar-w: 64px; }
        .kk-sidebar-nav { display: flex; flex-direction: column; }
        .kk-main-col    { padding-left: var(--kk-sidebar-w, 64px); transition: padding-left 0.22s cubic-bezier(0.4,0,0.2,1); }
        /* Extend top bar left to cover the fixed sidebar — tracks sidebar width via CSS var */
        .kk-top-bar     { margin-left: calc(-1 * var(--kk-sidebar-w, 64px)); width: calc(100% + var(--kk-sidebar-w, 64px)); padding-left: var(--kk-sidebar-w, 64px); background: var(--kk-topnav-bg); transition: margin-left 0.22s cubic-bezier(0.4,0,0.2,1), width 0.22s cubic-bezier(0.4,0,0.2,1), padding-left 0.22s cubic-bezier(0.4,0,0.2,1); }
        @media (max-width: 1023px) {
          /* Slide sidebar off-screen by default; React overrides transform when open */
          .kk-sidebar-nav { transform: translateX(-220px); }
          .kk-main-col    { padding-left: 0; transition: none; }
          .kk-top-bar     { margin-left: 0; width: 100%; padding-left: 0; transition: none; }
        }
      `}</style>
      <AccentProvider color={agent.accent_color} />

      {/* Left sidebar — desktop only, fixed overlay (doesn't push content) */}
      <Suspense fallback={null}><SidebarNav plan={plan} status={status} isAdmin={isAdmin} /></Suspense>

      {/* Main column — padding-left matches collapsed sidebar width on desktop */}
      <div className="kk-main-col" style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>

        {/* Top bar — sticky, extends left to cover sidebar rail */}
        <div className="kk-top-bar sticky top-0 z-50">
          {showCardNudge && <TrialCardNudge daysLeft={trialDaysLeft!} urgent={cardNudgeUrgent} />}
          {showTrialBanner && <TrialBanner daysLeft={trialDaysLeft!} isBeta={false} currentCardCount={trialCardCount} />}
          <TopNav agent={agent} isAdmin={isAdmin} trialDaysLeft={trialDaysLeft} hideTabs />
          <PwaInstallBanner />
        </div>

        {/* Streak / greeting bar */}
        <GreetingBar name={agent.name} streak={streak} checkedInToday={checkedInToday} />

        {/* Persistent banners — below greeting row, clear of sticky nav + sidebar */}
        {status === "trial" && trialDaysLeft !== null && trialDaysLeft > 30 && !agent.stripe_subscription_id && (
          <TrialWelcomeBanner trialDaysLeft={trialDaysLeft} />
        )}
        {status === "trial" && agent.referral_slug && !agent.stripe_subscription_id && (
          <ReferralTopBanner referralSlug={agent.referral_slug} />
        )}
        <PushTopBanner hasPushEnabled={(pushSubCount ?? 0) > 0} />

        <ProfileProvider profile={agent}>
          <main className="flex-1">{children}</main>
        </ProfileProvider>
      </div>

      {/* Overlays & dialogs */}
      <PwaGate />
      <PushNudge hasPushEnabled={(pushSubCount ?? 0) > 0} />
      <OnboardingDemoDialog />
      <TrialDowngradeNotice archivedCount={agent.trial_downgrade_archived_count ?? null} />
      <ProfileSetupDialog
        needsSetup={!isAdmin && (!agent.phone || !agent.ren_number)}
        agentName={agent.name}
      />
      <Toaster richColors position="top-right" closeButton />
      {isBetaFrozen && <BetaFrozenGate />}
      {isTrialExpired && <TrialGate />}
      {isCancelled && <CancelledGate />}
      {!isAdmin && !isBetaFrozen && !isTrialExpired && !isCancelled && (
        <OnboardingGate
          contractsComplete={(lifecycleTenancyCount ?? 0) > 0}
          leadsComplete={(ownerLeadCount ?? 0) > 0}
        />
      )}
      <FeedbackButton />
      <FaqChatbot />
      <SessionGuard />
    </div>
  );
}
