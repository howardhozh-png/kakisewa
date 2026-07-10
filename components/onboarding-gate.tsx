"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ListChecks } from "lucide-react";
import { AddTenancyDialog } from "@/components/add-tenancy-dialog";
import { UploadTenancyCsvDialog } from "@/components/upload-tenancy-csv-dialog";
import { OnboardingTourStep } from "@/components/onboarding-tour-step";
import { completeOnboardingTour } from "@/lib/actions";

// Pages that stay reachable no matter what, so a gated user can still
// manage billing or sign out rather than being fully trapped.
const ALWAYS_ALLOWED = ["/subscription", "/faq", "/support"];

// z-index sits below OnboardingDemoDialog (bumped to 10000) so the product
// tour, when it auto-opens on first login, visually wins over this block —
// once the tour closes it unmounts, revealing this gate underneath with no
// extra coordination needed between the two components.
const GATE_Z_INDEX = 9999;

export function OnboardingGate({
  contractsComplete,
  tourPending,
  mostRecentTenancyId,
}: {
  contractsComplete: boolean;
  tourPending: boolean;
  mostRecentTenancyId: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tourStep, setTourStep] = useState<"existing" | "my-listing">("existing");

  // Drive navigation for the post-gate tour: push to the target page for the
  // current tour step if we're not already there. Restarts from "existing"
  // on every fresh mount — if a user closes the tab mid-tour, tourPending is
  // still true next login (persisted server-side), so it fires again from
  // the top rather than silently never showing.
  useEffect(() => {
    if (!tourPending || !mostRecentTenancyId) return;
    if (tourStep === "existing" && pathname !== "/existing-listing") {
      router.push(`/existing-listing?highlight=${mostRecentTenancyId}`);
    } else if (tourStep === "my-listing" && pathname !== "/my-listing") {
      router.push("/my-listing");
    }
  }, [tourPending, mostRecentTenancyId, tourStep, pathname, router]);

  function finishTour() {
    startTransition(async () => {
      await completeOnboardingTour();
      router.push("/home");
      router.refresh();
    });
  }

  // ── Tour mode: contracts already added, walk them to where it lives ──────
  if (tourPending && mostRecentTenancyId) {
    if (tourStep === "existing" && pathname === "/existing-listing") {
      return (
        <OnboardingTourStep
          targetId={`tour-tenancy-${mostRecentTenancyId}`}
          stepLabel="Step 1 of 2"
          title="This is your listing."
          body="We track its contract end date and alert you 60 days before it expires — so you can reach out to the owner before another agent does."
          ctaLabel="Next"
          onNext={() => setTourStep("my-listing")}
        />
      );
    }
    if (tourStep === "my-listing" && pathname === "/my-listing") {
      return (
        <OnboardingTourStep
          targetId="tour-my-listing-header"
          stepLabel="Step 2 of 2"
          title="This is My Listing."
          body="Track units you currently have available to rent or sell, and send your tenant pack straight from here."
          ctaLabel="Got it"
          onNext={finishTour}
        />
      );
    }
    return null;
  }

  // ── Hard gate: force the first Existing Listing before anything else ─────
  if (!contractsComplete) {
    if (ALWAYS_ALLOWED.includes(pathname) || pathname.startsWith("/settings")) return null;

    return (
      <div
        className="fixed inset-0 flex items-center justify-center p-6"
        style={{ background: "rgba(0,0,0,0.80)", zIndex: GATE_Z_INDEX, backdropFilter: "blur(4px)", overflowY: "auto" }}
      >
        <div
          className="w-full max-w-md rounded-3xl px-8 py-10 text-center"
          style={{ background: "#fff", boxShadow: "0 32px 80px rgba(0,0,0,0.28)" }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "var(--kk-green-soft)" }}
          >
            <ListChecks className="w-5 h-5" style={{ color: "#1F8B4C" }} />
          </div>

          <h2 className="serif mb-2" style={{ fontSize: "1.6rem", lineHeight: 1.15, letterSpacing: "-0.022em", color: "var(--kk-ink)" }}>
            Add your first listing to get started.
          </h2>
          <p className="mb-6" style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.65 }}>
            We track when each one expires and alert you 60 days before. Upload a small, clean file — or add one manually if you don&apos;t have a list.
          </p>
          <div className="flex flex-col gap-2 items-center">
            <UploadTenancyCsvDialog onImported={() => router.refresh()} />
            <AddTenancyDialog ownerLeads={[]} triggerLabel="I don't have a list" />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
