import { Suspense } from "react";
import { getOwnerLeads, getTenantsForOwnerLeads, getRankedLeadIds } from "@/lib/db";
import { OwnerPipelineBoard } from "@/components/owner-pipeline-board";
import { UploadOwnerCsvDialog } from "@/components/upload-owner-csv-dialog";
import { AddOutreachButton } from "@/components/add-outreach-button";
import { AddListingButton } from "@/components/add-listing-button";
import { LeadsSubNav } from "@/components/leads-sub-nav";
import { OutreachTable } from "@/components/outreach-table";
import { OutreachEmptyState } from "@/components/outreach-empty-state";
import { ActiveDealsEmptyState } from "@/components/active-deals-empty-state";
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
  const pipelineLeads = ownerLeads.filter((l) => {
    if (["own_stay", "archived", "imported"].includes(l.stage)) return false;
    if (l.stage === "matched" && tenantsByLeadId[l.id]?.lifecycle_stage === "active") return false;
    return true;
  });

  const helpButton = activeTab === "outreach" ? (
    <PageHelpButton
      variant="question"
      module={0}
      pageTitle="Outreach — find and message landlords"
      bullets={[
        "Upload your Excel owner list or add owners one by one",
        "Download the bulk-send sheet and text all owners via WhatsApp Business",
        "Or tap the WhatsApp icon to send each owner a personalised intake link",
        "Move interested owners to Active Deals and send them a tenant pack",
      ]}
    />
  ) : (
    <PageHelpButton
      variant="question"
      module={1}
      pageTitle="Active Deals — send your tenant pack"
      bullets={[
        "Move owners here once they respond and want to proceed",
        "Send your branded tenant pack link to build trust and credibility",
        "kakisewa auto-tracks when owners open your pack and their interest level",
        "Once matched with a tenant, the deal moves to Existing Contracts",
      ]}
    />
  );

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="serif kk-display" style={{ color: "var(--kk-accent)" }}>
            Leads
          </h1>
          <p className="mt-3 kk-body-sm max-w-2xl" style={{ color: "var(--kk-ink-mute)" }}>
            Track every owner from first message to listing in one place.
          </p>
        </div>
        {/* Tab-specific action buttons */}
        <div className="flex items-center gap-3">
          {activeTab === "outreach" ? (
            <>
              <AddOutreachButton ownerLeads={ownerLeads} />
              <UploadOwnerCsvDialog />
            </>
          ) : (
            <AddListingButton ownerLeads={ownerLeads} />
          )}
        </div>
      </header>

      <Suspense fallback={null}>
        <LeadsSubNav
          tab={activeTab}
          outreachCount={ownerLeads.length}
          pipelineCount={pipelineLeads.length}
          helpSlot={helpButton}
        />
      </Suspense>

      {activeTab === "outreach" ? (
        ownerLeads.length === 0 ? <OutreachEmptyState /> : <OutreachTable leads={ownerLeads} />
      ) : pipelineLeads.length === 0 ? (
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
