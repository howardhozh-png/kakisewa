import { getOwnerLeads, getTenantsForOwnerLeads, getRankedLeadIds, getSoftDeletedMyListingLeads } from "@/lib/db";
import { OwnerPipelineBoard } from "@/components/owner-pipeline-board";
import { AddListingButton } from "@/components/add-listing-button";
import { ActiveDealsEmptyState } from "@/components/active-deals-empty-state";
import { PageHelpButton } from "@/components/page-help-button";
import { DeletedOwnerLeadsPanel } from "@/components/deleted-owner-leads-panel";
import type { OwnerLead } from "@/lib/types";

const DEMO_LEAD: OwnerLead = {
  id: "__demo__",
  owner_name: "Ahmad Hassan",
  owner_phone: "0123456789",
  property_name: "Agile Mont Kiara",
  unit: "A-12-05",
  expected_rent: 3200,
  bedrooms: 3,
  bathrooms: 2,
  stage: "listed",
  source: "manual",
  outreach_count: 1,
  created_at: new Date().toISOString(),
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ open?: string; highlight?: string }>;
}

export default async function TrackListingPage({ searchParams }: Props) {
  const { open, highlight } = await searchParams;
  const [ownerLeads, rankedLeadIds, deletedLeads] = await Promise.all([
    getOwnerLeads(),
    getRankedLeadIds(),
    getSoftDeletedMyListingLeads(),
  ]);
  const matchedLeadIds = ownerLeads.filter((l) => l.stage === "matched").map((l) => l.id);
  const tenantsByLeadId = await getTenantsForOwnerLeads(matchedLeadIds);
  const pipelineLeads = ownerLeads.filter((l) => {
    if (["own_stay", "archived", "imported"].includes(l.stage)) return false;
    if (l.stage === "matched" && l.has_active_tenancy) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="serif kk-display" style={{ color: "var(--kk-accent)" }}>
            My listing
          </h1>
          <p className="mt-3 kk-body-sm max-w-2xl" style={{ color: "var(--kk-ink-mute)" }}>
            Send your tenant pack and track every active listing.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <PageHelpButton
            variant="question"
            module={1}
            pageTitle="My listing — send your tenant pack"
            bullets={[
              "Move owners here once they respond and want to proceed",
              "Send your branded tenant pack link to build trust and credibility",
              "kakisewa auto-tracks when owners open your pack and their interest level",
              "Once matched with a tenant, the deal moves to Existing listing",
            ]}
          />
          <AddListingButton ownerLeads={ownerLeads} />
        </div>
      </header>

      <DeletedOwnerLeadsPanel leads={deletedLeads} />

      {pipelineLeads.length === 0 ? (
        <>
          <ActiveDealsEmptyState />
          <div style={{ opacity: 0.4, pointerEvents: "none" }}>
            <OwnerPipelineBoard
              leads={[DEMO_LEAD]}
              openLeadId={undefined}
              highlightId={undefined}
              tenantsByLeadId={{}}
              rankedLeadIds={new Set<string>()}
            />
          </div>
        </>
      ) : (
        <OwnerPipelineBoard
          leads={ownerLeads}
          openLeadId={open}
          highlightId={highlight}
          tenantsByLeadId={tenantsByLeadId}
          rankedLeadIds={rankedLeadIds}
        />
      )}
    </div>
  );
}
