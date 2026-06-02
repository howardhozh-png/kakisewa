import { Suspense } from "react";
import { getOwnerLeads, getTenantsForOwnerLeads, getRankedLeadIds } from "@/lib/db";
import { OwnerPipelineBoard } from "@/components/owner-pipeline-board";
import { UploadOwnerCsvDialog } from "@/components/upload-owner-csv-dialog";
import { NewListingButton } from "@/components/new-listing-button";
import { LeadsSubNav } from "@/components/leads-sub-nav";
import { OutreachTable } from "@/components/outreach-table";
import { PageHelpButton } from "@/components/page-help-button";
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
  searchParams: Promise<{ tab?: string; open?: string; highlight?: string }>;
}

export default async function LeadsPage({ searchParams }: Props) {
  const { tab, open, highlight } = await searchParams;
  const activeTab = tab === "pipeline" ? "pipeline" : "outreach";

  const ownerLeads = await getOwnerLeads();
  const matchedLeadIds = ownerLeads.filter((l) => l.stage === "matched").map((l) => l.id);
  const [tenantsByLeadId, rankedLeadIds] = await Promise.all([
    getTenantsForOwnerLeads(matchedLeadIds),
    getRankedLeadIds(),
  ]);
  // Count only leads visible in the Listing kanban (not own_stay/archived/commission-collected)
  const pipelineLeads = ownerLeads.filter((l) => {
    if (["own_stay", "archived", "imported"].includes(l.stage)) return false;
    if (l.stage === "matched" && tenantsByLeadId[l.id]?.lifecycle_stage === "active") return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-12 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="serif kk-display" style={{ color: "var(--kk-accent)" }}>
              New Owners
            </h1>
            <PageHelpButton
              module={0}
              pageTitle="New Owners — find and convert landlords"
              bullets={[
                "Upload your Excel owner list or add owners one by one",
                "Download the bulk-send sheet and text all owners via WhatsApp Business",
                "Or tap the WhatsApp icon to send each owner a personalised intake link",
                "Move interested owners to Active Deals and send them a tenant pack",
              ]}
            />
          </div>
          <p className="mt-3 kk-body-sm max-w-2xl" style={{ color: "var(--kk-ink-mute)" }}>
            Track every owner from first message to listing in one place.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NewListingButton />
          <UploadOwnerCsvDialog />
        </div>
      </header>

      <Suspense fallback={null}>
        <LeadsSubNav
          tab={activeTab}
          outreachCount={ownerLeads.length}
          pipelineCount={pipelineLeads.length}
        />
      </Suspense>

      {activeTab === "outreach" ? (
        <OutreachTable leads={ownerLeads} />
      ) : pipelineLeads.length === 0 ? (
        <div style={{ opacity: 0.5, pointerEvents: "none" }}>
          <OwnerPipelineBoard
            leads={[DEMO_LEAD]}
            openLeadId={undefined}
            highlightId={undefined}
            tenantsByLeadId={{}}
            rankedLeadIds={new Set<string>()}
          />
        </div>
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
