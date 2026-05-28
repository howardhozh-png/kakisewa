import { Suspense } from "react";
import { getOwnerLeads, getTenantsForOwnerLeads, getRankedLeadIds } from "@/lib/db";
import { OwnerPipelineBoard } from "@/components/owner-pipeline-board";
import { UploadOwnerCsvDialog } from "@/components/upload-owner-csv-dialog";
import { NewListingButton } from "@/components/new-listing-button";
import { LeadsSubNav } from "@/components/leads-sub-nav";
import { OutreachTable } from "@/components/outreach-table";

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
          <h1 className="serif kk-display" style={{ color: "var(--kk-accent)" }}>
            New Owners
          </h1>
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
        <div className="kk-section flex flex-col items-center justify-center py-20 px-6">
          <p className="kk-h3 mb-2 text-center" style={{ color: "var(--kk-ink)" }}>
            No active pipeline yet.
          </p>
          <p className="kk-body-sm text-center max-w-sm" style={{ color: "var(--kk-ink-mute)" }}>
            Once an owner responds to your form, they&apos;ll appear here to confirm and list.
          </p>
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
