import { getCompetitorLeads, getSoftDeletedTargetLeads } from "@/lib/db";
import { CompetitorBoard } from "@/components/competitor-board";
import { AddCompetitorButton } from "@/components/add-competitor-button";
import { PageHelpButton } from "@/components/page-help-button";
import { DeletedOwnerLeadsPanel } from "@/components/deleted-owner-leads-panel";
import type { OwnerLead } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LostListingPage({ searchParams }: { searchParams: Promise<{ highlight?: string }> }) {
  const { highlight } = await searchParams;
  const [leads, deletedLeads] = await Promise.all([
    getCompetitorLeads(),
    getSoftDeletedTargetLeads(),
  ]);

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="serif kk-display" style={{ color: "var(--kk-accent)" }}>
            Lost listing
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

      <DeletedOwnerLeadsPanel leads={deletedLeads} />

      {leads.length === 0 ? (() => {
        const demoLead: OwnerLead = {
          id: "__demo__",
          owner_name: "Ahmad Razak",
          owner_phone: "0123456789",
          property_name: "Residensi Mutiara",
          unit: "A-12-05",
          stage: "imported",
          competitor_stage: "reach_out",
          competitor_contract_end: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          created_at: new Date().toISOString(),
        };
        return (
          <>
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center max-w-md mx-auto">
              <h2 className="serif kk-h2 mb-3" style={{ color: "var(--kk-ink)" }}>
                Add units to track
              </h2>
              <p className="kk-body-sm mb-6 leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
                Add units you know are managed by other agents. We'll alert you 60 days before their contract ends so you can reach out first.
              </p>
              <div className="flex items-center gap-3">
                <AddCompetitorButton />
              </div>
            </div>
            <p className="text-center text-[12px] mb-4" style={{ color: "var(--kk-ink-faint)" }}>
              Here is a preview of what your board will look like
            </p>
            <div style={{ opacity: 0.35, pointerEvents: "none" }}>
              <CompetitorBoard leads={[demoLead]} highlightId={undefined} />
            </div>
          </>
        );
      })() : (
        <CompetitorBoard leads={leads} highlightId={highlight} />
      )}
    </div>
  );
}
