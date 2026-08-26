import { Suspense } from "react";
import { getOwnerLeads, getSoftDeletedOwnerLeads, getWaBlastQueue, getWaBlastConfig, getWaSession } from "@/lib/db";
import { UploadOwnerCsvDialog } from "@/components/upload-owner-csv-dialog";
import { AddOutreachButton } from "@/components/add-outreach-button";
import { OutreachTable } from "@/components/outreach-table";
import { OutreachEmptyState } from "@/components/outreach-empty-state";
import { PageHelpButton } from "@/components/page-help-button";
import { TourSpotlight } from "@/components/tour-spotlight";

export const dynamic = "force-dynamic";

export default async function MessageOwnersPage() {
  const [ownerLeads, deletedLeads, waBlastQueue, waBlastConfig, waSession] = await Promise.all([
    getOwnerLeads(),
    getSoftDeletedOwnerLeads(),
    getWaBlastQueue(),
    getWaBlastConfig(),
    getWaSession(),
  ]);

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="serif kk-display" style={{ color: "var(--kk-accent)" }}>
            Property Leads
          </h1>
          <p className="mt-3 kk-body-sm max-w-2xl" style={{ color: "var(--kk-ink-mute)" }}>
            Track every owner from first message to listing in one place.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <PageHelpButton
            variant="question"
            module={0}
            pageTitle="Property Leads — find and message landlords"
            bullets={[
              "Upload your Excel owner list or add owners one by one",
              "Download the bulk-send sheet and text all owners via WhatsApp Business",
              "Or tap the WhatsApp icon to send each owner a personalised intake link",
              "Move interested owners to My listing and send them a tenant pack",
            ]}
          />
          <AddOutreachButton ownerLeads={ownerLeads} />
          <UploadOwnerCsvDialog />
        </div>
      </header>

      {(() => {
    const activeLeads = ownerLeads.filter((l) => l.stage !== "archived" && l.stage !== "own_stay");
    const declinedLeads = ownerLeads.filter((l) => l.stage === "archived" || l.stage === "own_stay");
    return activeLeads.length === 0 && deletedLeads.length === 0 && declinedLeads.length === 0
      ? <OutreachEmptyState />
      : <OutreachTable leads={activeLeads} declinedLeads={declinedLeads} deletedLeads={deletedLeads} waBlastConfig={waBlastConfig} initialWaBlastQueue={waBlastQueue} initialWaSession={waSession} />;
  })()}

      <Suspense fallback={null}>
        <TourSpotlight
          step="leads"
          stepNumber={1}
          targetId="tour-add-lead"
          title="Add your first owner lead"
          body="Tap the highlighted button to add an owner you want to approach for rental management."
        />
      </Suspense>
    </div>
  );
}
