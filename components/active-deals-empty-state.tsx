"use client";

import { NewListingButton } from "@/components/new-listing-button";

const STEPS = [
  {
    num: "01",
    title: "Add your listings once",
    desc: "Enter each property with its contract end date. kakisewa starts tracking renewals and leads from day one.",
  },
  {
    num: "02",
    title: "kakisewa watches. You get notified.",
    desc: "60-day expiry alert. Instant ping when a tenant shows interest. No spreadsheet needed.",
  },
  {
    num: "03",
    title: "You close first. Every time.",
    desc: "Send one branded tenant pack link. The owner picks. Done.",
  },
];

export function ActiveDealsEmptyState() {
  return (
    <div className="py-10 px-0">
      <div className="text-center mb-10 px-6">
        <h2 className="serif kk-h2 mb-3" style={{ color: "var(--kk-ink)" }}>
          No active deals yet
        </h2>
        <p className="kk-body-sm max-w-sm mx-auto leading-relaxed mb-6" style={{ color: "var(--kk-ink-mute)" }}>
          Add a property listing to get started. Once an owner responds and wants to proceed, their deal appears here.
        </p>
        <NewListingButton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px" style={{ background: "var(--kk-line)" }}>
        {STEPS.map((step) => (
          <div key={step.num} className="px-8 py-10" style={{ background: "var(--kk-surface-2)" }}>
            <p
              className="serif font-black mb-5"
              style={{
                fontSize: "clamp(2.5rem, 3.5vw, 3.25rem)",
                color: "var(--kk-line-strong)",
                lineHeight: 1,
                letterSpacing: "-0.04em",
              }}
            >
              {step.num}
            </p>
            <p
              className="serif mb-3"
              style={{
                fontSize: "clamp(1.15rem, 1.5vw, 1.35rem)",
                lineHeight: 1.2,
                letterSpacing: "-0.015em",
                color: "var(--kk-ink)",
              }}
            >
              {step.title}
            </p>
            <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.65 }}>
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
