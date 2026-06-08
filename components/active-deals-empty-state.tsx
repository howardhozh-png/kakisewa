"use client";

import { AddListingButton } from "@/components/add-listing-button";

export function ActiveDealsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <h2 className="serif kk-h2 mb-3" style={{ color: "var(--kk-ink)" }}>
        Add all your active deals
      </h2>
      <p className="kk-body-sm max-w-sm leading-relaxed mb-6" style={{ color: "var(--kk-ink-mute)" }}>
        Owner confirmed? Add a listing and it appears here ready to match with tenants.
      </p>
      <AddListingButton />
    </div>
  );
}
