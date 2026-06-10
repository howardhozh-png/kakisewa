import { Suspense } from "react";
import { getOwnerLeads, getSoftDeletedOwnerLeads, getTenantsForOwnerLeads, getRankedLeadIds } from "@/lib/db";
import { UploadOwnerCsvDialog } from "@/components/upload-owner-csv-dialog";
import { AddOutreachButton } from "@/components/add-outreach-button";
import { OutreachTable } from "@/components/outreach-table";
import { OutreachEmptyState } from "@/components/outreach-empty-state";
import { PageHelpButton } from "@/components/page-help-button";

export const dynamic = "force-dynamic";

export default async function MessageOwnersPage() {
  const [ownerLeads, deletedLeads] = await Promise.all([
    getOwnerLeads(),
    getSoftDeletedOwnerLeads(),
  ]);

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="serif kk-display" style={{ color: "var(--kk-accent)" }}>
            Potential listing
          </h1>
          <p className="mt-3 kk-body-sm max-w-2xl" style={{ color: "var(--kk-ink-mute)" }}>
            Track every owner from first message to listing in one place.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AddOutreachButton ownerLeads={ownerLeads} />
          <UploadOwnerCsvDialog />
        </div>
      </header>

      <Suspense fallback={null}>
        <div className="mb-8 flex justify-end">
          <PageHelpButton
            variant="question"
            module={0}
            pageTitle="Potential listing — find and message landlords"
            bullets={[
              "Upload your Excel owner list or add owners one by one",
              "Download the bulk-send sheet and text all owners via WhatsApp Business",
              "Or tap the WhatsApp icon to send each owner a personalised intake link",
              "Move interested owners to My listing and send them a tenant pack",
            ]}
          />
        </div>
      </Suspense>

      {ownerLeads.length === 0 && deletedLeads.length === 0 ? <OutreachEmptyState /> : <OutreachTable leads={ownerLeads} deletedLeads={deletedLeads} />}
    </div>
  );
}
