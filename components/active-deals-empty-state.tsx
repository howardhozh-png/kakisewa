"use client";

import { NewListingButton } from "@/components/new-listing-button";

export function ActiveDealsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <h2 className="serif kk-h2 mb-3" style={{ color: "var(--kk-ink)" }}>
        No active deals yet
      </h2>
      <p className="kk-body-sm max-w-sm leading-relaxed mb-6" style={{ color: "var(--kk-ink-mute)" }}>
        Add a property listing to get started. Once an owner responds and wants to proceed, their deal appears here.
      </p>
      <NewListingButton />
    </div>
  );
}
