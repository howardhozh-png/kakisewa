import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { getAgentProfile, getHomeDashboardStats, getExpandedDashboardStats } from "@/lib/db";
import { getMissingWhatsAppFields } from "@/lib/profile-gate";
import { StatsSection } from "./stats-section";

export const dynamic = "force-dynamic";

type Stats = Awaited<ReturnType<typeof getHomeDashboardStats>>;
type ExpandedStats = Awaited<ReturnType<typeof getExpandedDashboardStats>>;

// ─── Checklist item ───────────────────────────────────────────────────────────

function ChecklistItem({
  done,
  title,
  why,
  href,
  cta,
}: {
  done: boolean;
  title: string;
  why: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex items-start gap-3 py-4" style={{ borderTop: "1px solid var(--kk-line)" }}>
      {done ? (
        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--kk-green)" }} />
      ) : (
        <Circle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--kk-ink-faint)" }} />
      )}
      <div className="flex-1 min-w-0">
        <p
          className="text-[14px] font-semibold leading-snug"
          style={{ color: done ? "var(--kk-ink-faint)" : "var(--kk-ink)", textDecoration: done ? "line-through" : "none" }}
        >
          {title}
        </p>
        <p className="text-[12px] mt-1 leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
          {why}
        </p>
      </div>
      {!done && (
        <Link
          href={href}
          className="kk-pill kk-pill-ghost shrink-0 text-[12px]"
          style={{ whiteSpace: "nowrap" }}
        >
          {cta}
        </Link>
      )}
    </div>
  );
}

// ─── Demo preview cards ───────────────────────────────────────────────────────

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
        {/* Sample lead */}
        <div className="kk-card p-4 mb-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold" style={{ color: "var(--kk-ink)" }}>
              Ahmad Hassan
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-mute)" }}>
              Agile Mont Kiara · A-12-05 · RM 3,200/mo
            </p>
          </div>
          <span className="kk-status kk-status-pending shrink-0" style={{ whiteSpace: "nowrap" }}>
            Not contacted
          </span>
        </div>

        {/* Sample contract */}
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

// ─── Setup state (checklist + demo) ──────────────────────────────────────────

function SetupState({
  firstName,
  leadsComplete,
  contractsComplete,
  profileComplete,
  doneCount,
}: {
  firstName: string | null;
  leadsComplete: boolean;
  contractsComplete: boolean;
  profileComplete: boolean;
  doneCount: number;
}) {
  const progressPct = Math.round((doneCount / 3) * 100);

  return (
    <>
      <div className="kk-card p-5 mb-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[15px] font-semibold" style={{ color: "var(--kk-ink)" }}>
            {firstName ? `Hi ${firstName} — get set up in 10 minutes` : "Get set up in 10 minutes"}
          </p>
          <p className="text-[12px] font-semibold shrink-0 ml-3" style={{ color: "var(--kk-ink-faint)" }}>
            {doneCount} of 3
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: "var(--kk-line)", borderRadius: 2, marginBottom: 4 }}>
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              background: doneCount === 3 ? "var(--kk-green)" : "var(--kk-amber)",
              borderRadius: 2,
              transition: "width 0.4s ease",
            }}
          />
        </div>

        {/* Items */}
        <ChecklistItem
          done={leadsComplete}
          title="Upload your leads"
          why="Never lose a number again. You'll see exactly who you haven't contacted yet."
          href="/potential-listing"
          cta="Start →"
        />
        <ChecklistItem
          done={contractsComplete}
          title="Upload your existing contracts"
          why="We track when each one expires and alert you 60 days before. Every renewal is half a month's rent."
          href="/existing-listing"
          cta="Start →"
        />
        <ChecklistItem
          done={profileComplete}
          title="Complete your profile"
          why="Your name and agency appear in every message you send to owners and tenants."
          href="/settings/account"
          cta="2 min →"
        />
      </div>

      <DemoPreview />
    </>
  );
}

// ─── Active state (full dashboard) ───────────────────────────────────────────

function ActiveState({
  firstName,
  stats,
  expandedStats,
}: {
  firstName: string | null;
  stats: Stats;
  expandedStats: ExpandedStats;
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

      <StatsSection initialStats={expandedStats} />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [agent, stats, expandedStats] = await Promise.all([
    getAgentProfile(),
    getHomeDashboardStats(),
    getExpandedDashboardStats(3),
  ]);
  const firstName = agent.name ? agent.name.trim().split(" ")[0] : null;
  const missingProfileFields = getMissingWhatsAppFields(agent);

  const leadsComplete = stats.totalOwners > 0;
  const contractsComplete = stats.activeContracts > 0;
  const profileComplete = missingProfileFields.length === 0;
  const doneCount = [leadsComplete, contractsComplete, profileComplete].filter(Boolean).length;
  const isSetupComplete = leadsComplete && contractsComplete && profileComplete;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:py-16">
      {isSetupComplete ? (
        <ActiveState firstName={firstName} stats={stats} expandedStats={expandedStats} />
      ) : (
        <SetupState
          firstName={firstName}
          leadsComplete={leadsComplete}
          contractsComplete={contractsComplete}
          profileComplete={profileComplete}
          doneCount={doneCount}
        />
      )}
    </div>
  );
}
