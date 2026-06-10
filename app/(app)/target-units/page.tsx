import { getCompetitorLeads } from "@/lib/db";
import { CompetitorBoard } from "@/components/competitor-board";
import { AddCompetitorButton } from "@/components/add-competitor-button";
import { PageHelpButton } from "@/components/page-help-button";

export const dynamic = "force-dynamic";

export default async function TargetUnitsPage() {
  const leads = await getCompetitorLeads();

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="serif kk-display" style={{ color: "var(--kk-accent)" }}>
            Target units
          </h1>
          <p className="mt-3 kk-body-sm max-w-2xl" style={{ color: "var(--kk-ink-mute)" }}>
            Track units rented by competitors. Reach out 60 days before renewal and win them over.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <PageHelpButton
            variant="question"
            module={0}
            pageTitle="Target units — win over competitor properties"
            bullets={[
              "Add units you know are managed by other agents",
              "Track when their contracts expire and reach out before renewal",
              "Move leads through Watch, Reach Out, In Talks, and Won",
              "Each win is a new listing for you",
            ]}
          />
          <AddCompetitorButton />
        </div>
      </header>

      <CompetitorBoard leads={leads} />
    </div>
  );
}
