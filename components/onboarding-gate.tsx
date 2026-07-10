"use client";

import { usePathname } from "next/navigation";
import { ArrowRight, ListChecks, Users } from "lucide-react";

// Pages that stay reachable while a step is pending — the two "add data"
// pages themselves (so the CTA can actually be completed, and so a
// finished step stays reviewable), plus account/billing/help.
const ALLOWED_PATHS = ["/home", "/subscription", "/faq", "/support", "/existing-listing", "/property-leads"];

export function OnboardingGate({
  contractsComplete,
  leadsComplete,
}: {
  contractsComplete: boolean;
  leadsComplete: boolean;
}) {
  const pathname = usePathname();

  const step: "contracts" | "leads" | null = !contractsComplete
    ? "contracts"
    : !leadsComplete
    ? "leads"
    : null;

  if (!step) return null;
  if (ALLOWED_PATHS.includes(pathname) || pathname.startsWith("/settings")) return null;

  const copy = step === "contracts"
    ? {
        icon: <ListChecks className="w-5 h-5" style={{ color: "#1F8B4C" }} />,
        title: "Add your first listing to get started.",
        body: "We track when each one expires and alert you 60 days before. Start small — even one is enough.",
        cta: "Add your first listing",
        href: "/existing-listing",
      }
    : {
        icon: <Users className="w-5 h-5" style={{ color: "#1F8B4C" }} />,
        title: "Add your first lead to keep going.",
        body: "Track outreach and never lose a number again. Upload a few, or add one manually.",
        cta: "Add your first lead",
        href: "/property-leads",
      };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.80)", zIndex: 9999, backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md rounded-3xl px-8 py-10 text-center"
        style={{ background: "#fff", boxShadow: "0 32px 80px rgba(0,0,0,0.28)" }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: "var(--kk-green-soft)" }}
        >
          {copy.icon}
        </div>

        <h2 className="serif mb-2" style={{ fontSize: "1.6rem", lineHeight: 1.15, letterSpacing: "-0.022em", color: "var(--kk-ink)" }}>
          {copy.title}
        </h2>
        <p className="mb-6" style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.65 }}>
          {copy.body}
        </p>

        <a
          href={copy.href}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-opacity hover:opacity-85 w-full justify-center"
          style={{ background: "var(--kk-ink)", color: "#fff", fontSize: "var(--kk-body)" }}
        >
          {copy.cta} <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
