import { getCompetitorLeads } from "@/lib/db";
import { CompetitorBoard } from "@/components/competitor-board";

export const dynamic = "force-dynamic";

export default async function TargetUnitsPage() {
  const leads = await getCompetitorLeads();

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-16 flex flex-col" style={{ height: "calc(100dvh - 64px)" }}>
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="serif kk-display" style={{ color: "var(--kk-accent)" }}>
            Target units
          </h1>
          <p className="mt-3 kk-body-sm max-w-2xl" style={{ color: "var(--kk-ink-mute)" }}>
            Track units rented by other agents. Reach out 60 days before renewal and win them over.
          </p>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <CompetitorBoard leads={leads} />
      </div>
    </div>
  );
}
