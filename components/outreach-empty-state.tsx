"use client";

import { UploadOwnerCsvDialog } from "@/components/upload-owner-csv-dialog";
import { NewListingButton } from "@/components/new-listing-button";

export function OutreachEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <h2 className="serif kk-h2 mb-3" style={{ color: "var(--kk-ink)" }}>
        Your pipeline starts here
      </h2>
      <p className="kk-body-sm mb-8 max-w-sm leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
        Upload your owner list in 2 minutes and kakisewa starts watching. Know exactly who to call today, when to follow up, and never lose a deal to forgetting.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <UploadOwnerCsvDialog />
        <span className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>or</span>
        <NewListingButton />
      </div>
    </div>
  );
}
