import Link from "next/link";
import { AlertCircle, ChevronRight, UserCircle2, ArrowRight } from "lucide-react";
import { getAgentProfile, getHomeDashboardStats } from "@/lib/db";
import { getMissingWhatsAppFields } from "@/lib/profile-gate";

export const dynamic = "force-dynamic";

type Stats = Awaited<ReturnType<typeof getHomeDashboardStats>>;

function ProfileNudge({ fields }: { fields: { label: string }[] }) {
  return (
    <Link
      href="/settings/account"
      className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-6 transition-opacity hover:opacity-80"
      style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.18)", textDecoration: "none" }}
    >
      <UserCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#DC2626" }} />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-snug" style={{ color: "#991B1B" }}>
          Your profile is incomplete
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: "#B91C1C" }}>
          Missing: {fields.map(f => f.label).join(", ")}. WhatsApp messages will show blank fields.
        </p>
      </div>
      <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#DC2626" }} />
    </Link>
  );
}

const CONTRACT_FIELDS = [
  "Property name",
  "Unit number",
  "Owner contact",
  "Contract start date",
  "Duration (we default to 1 year if blank)",
];

function LeadsCard() {
  return (
    <Link href="/new-owners" className="kk-card block p-6" style={{ textDecoration: "none" }}>
      <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--kk-green)" }}>
        Leads
      </p>
      <h2 className="text-[18px] font-semibold mb-2" style={{ color: "var(--kk-ink)", letterSpacing: "-0.015em" }}>
        Track the owners you're chasing
      </h2>
      <p className="text-[13px] leading-relaxed mb-5" style={{ color: "var(--kk-ink-mute)" }}>
        Upload your list once. Every owner stays here forever. No more lost numbers, no more forgotten follow-ups.
      </p>
      <span className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "var(--kk-green)" }}>
        Upload leads <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  );
}

function ContractsCard() {
  return (
    <Link href="/existing-contracts" className="kk-card block p-6" style={{ textDecoration: "none" }}>
      <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--kk-amber)" }}>
        Contracts
      </p>
      <h2 className="text-[18px] font-semibold mb-2" style={{ color: "var(--kk-ink)", letterSpacing: "-0.015em" }}>
        Track your existing tenants
      </h2>
      <p className="text-[13px] leading-relaxed mb-4" style={{ color: "var(--kk-ink-mute)" }}>
        We alert you 60 days before any contract expires. Every renewal is half a month's rent, yours.
      </p>
      <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--kk-ink-soft)" }}>
        Make sure these fields are filled in:
      </p>
      <ul className="space-y-1.5 mb-5">
        {CONTRACT_FIELDS.map((f) => (
          <li key={f} className="flex items-center gap-2 text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--kk-amber)" }} />
            {f}
          </li>
        ))}
      </ul>
      <span className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "var(--kk-amber)" }}>
        Upload contracts <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  );
}

function EmptyState({ firstName }: { firstName: string | null }) {
  return (
    <>
      <div className="mb-8">
        <h1 className="serif text-[26px] md:text-[36px] leading-tight tracking-tight mb-3" style={{ color: "var(--kk-ink)" }}>
          {firstName ? `Hi ${firstName}. Let's replace your spreadsheet.` : "Let's replace your spreadsheet."}
        </h1>
        <p className="text-[15px]" style={{ color: "var(--kk-ink-mute)" }}>
          Two things to track. Both earn you money.
        </p>
      </div>
      <div className="space-y-4">
        <LeadsCard />
        <ContractsCard />
      </div>
    </>
  );
}

function LeadsOnlyState({ stats }: { stats: Stats }) {
  return (
    <>
      <div className="mb-8">
        <h1 className="serif text-[26px] md:text-[36px] leading-tight tracking-tight mb-3" style={{ color: "var(--kk-ink)" }}>
          {stats.totalOwners} lead{stats.totalOwners !== 1 ? "s" : ""} tracked. Good start.
        </h1>
        <p className="text-[15px]" style={{ color: "var(--kk-ink-mute)" }}>
          Now bring in your existing tenants.
        </p>
      </div>

      {stats.uncontacted > 0 && (
        <Link
          href="/new-owners"
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-4 transition-opacity hover:opacity-80"
          style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)", textDecoration: "none" }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "#B45309" }} />
          <p className="text-[13px] font-semibold" style={{ color: "#92400E" }}>
            {stats.uncontacted} owner{stats.uncontacted !== 1 ? "s" : ""} not yet contacted
          </p>
          <ChevronRight className="w-4 h-4 shrink-0 ml-auto" style={{ color: "#B45309" }} />
        </Link>
      )}

      <ContractsCard />
    </>
  );
}

function ActiveState({ firstName, stats }: { firstName: string | null; stats: Stats }) {
  return (
    <>
      <div className="mb-6">
        <h1 className="serif text-[26px] md:text-[36px] leading-tight tracking-tight" style={{ color: "var(--kk-ink)" }}>
          {firstName ? `${firstName}.` : "Your portfolio."}
        </h1>
      </div>

      {stats.expiringIn60 > 0 && (
        <Link
          href="/existing-contracts"
          className="flex items-center gap-3 rounded-2xl px-4 py-4 mb-4 transition-opacity hover:opacity-80"
          style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", textDecoration: "none" }}
        >
          <AlertCircle className="w-5 h-5 shrink-0" style={{ color: "#DC2626" }} />
          <div>
            <p className="text-[14px] font-semibold" style={{ color: "#991B1B" }}>
              {stats.expiringIn60} contract{stats.expiringIn60 !== 1 ? "s" : ""} expiring within 60 days
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "#B91C1C" }}>
              Act before another agent does
            </p>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0 ml-auto" style={{ color: "#DC2626" }} />
        </Link>
      )}

      {stats.uncontacted > 0 && (
        <Link
          href="/new-owners"
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-4 transition-opacity hover:opacity-80"
          style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)", textDecoration: "none" }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "#B45309" }} />
          <p className="text-[13px] font-semibold" style={{ color: "#92400E" }}>
            {stats.uncontacted} lead{stats.uncontacted !== 1 ? "s" : ""} not yet contacted
          </p>
          <ChevronRight className="w-4 h-4 shrink-0 ml-auto" style={{ color: "#B45309" }} />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 mt-2">
        <Link href="/existing-contracts" className="kk-card p-4" style={{ textDecoration: "none" }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--kk-ink-faint)" }}>
            Contracts
          </p>
          <p className="text-[28px] font-bold tabular-nums leading-none" style={{ color: "var(--kk-ink)" }}>
            {stats.activeContracts}
          </p>
          <p className="text-[12px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>active</p>
        </Link>
        <Link href="/new-owners?tab=pipeline" className="kk-card p-4" style={{ textDecoration: "none" }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--kk-ink-faint)" }}>
            Pipeline
          </p>
          <p className="text-[28px] font-bold tabular-nums leading-none" style={{ color: "var(--kk-ink)" }}>
            {stats.pipeline}
          </p>
          <p className="text-[12px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>deals in progress</p>
        </Link>
      </div>

      {stats.totalOwners > 0 && (
        <div className="mt-4">
          <Link href="/new-owners" className="kk-card p-4 flex items-center justify-between" style={{ textDecoration: "none" }}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--kk-ink-faint)" }}>
                Leads
              </p>
              <p className="text-[15px] font-semibold" style={{ color: "var(--kk-ink)" }}>
                {stats.totalOwners} owner{stats.totalOwners !== 1 ? "s" : ""} tracked
              </p>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: "var(--kk-ink-faint)" }} />
          </Link>
        </div>
      )}
    </>
  );
}

export default async function HomePage() {
  const [agent, stats] = await Promise.all([
    getAgentProfile(),
    getHomeDashboardStats(),
  ]);
  const firstName = agent.name ? agent.name.trim().split(" ")[0] : null;
  const missingProfileFields = getMissingWhatsAppFields(agent);

  const isEmpty = stats.totalOwners === 0 && stats.activeContracts === 0;
  const isActive = stats.activeContracts > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-16">
      {missingProfileFields.length > 0 && (
        <ProfileNudge fields={missingProfileFields} />
      )}
      {isEmpty ? (
        <EmptyState firstName={firstName} />
      ) : isActive ? (
        <ActiveState firstName={firstName} stats={stats} />
      ) : (
        <LeadsOnlyState stats={stats} />
      )}
    </div>
  );
}
