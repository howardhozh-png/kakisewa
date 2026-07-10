"use client";

import { usePathname, useRouter } from "next/navigation";
import { ListChecks, Users } from "lucide-react";
import { AddTenancyDialog } from "@/components/add-tenancy-dialog";
import { UploadTenancyCsvDialog } from "@/components/upload-tenancy-csv-dialog";
import { AddOutreachButton } from "@/components/add-outreach-button";
import { UploadOwnerCsvDialog } from "@/components/upload-owner-csv-dialog";

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
  leadsComplete,
}: {
  contractsComplete: boolean;
  leadsComplete: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const step: "contracts" | "leads" | null = !contractsComplete
    ? "contracts"
    : !leadsComplete
    ? "leads"
    : null;

  if (!step) return null;
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
          {step === "contracts"
            ? <ListChecks className="w-5 h-5" style={{ color: "#1F8B4C" }} />
            : <Users className="w-5 h-5" style={{ color: "#1F8B4C" }} />}
        </div>

        {step === "contracts" ? (
          <>
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
          </>
        ) : (
          <>
            <h2 className="serif mb-2" style={{ fontSize: "1.6rem", lineHeight: 1.15, letterSpacing: "-0.022em", color: "var(--kk-ink)" }}>
              Add your first lead to keep going.
            </h2>
            <p className="mb-6" style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.65 }}>
              Track outreach and never lose a number again. Upload a file, or add one manually.
            </p>
            <div className="flex flex-col gap-2 items-center">
              <UploadOwnerCsvDialog />
              <AddOutreachButton ownerLeads={[]} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
