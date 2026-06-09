import { Suspense } from "react";
import { getLifecycleTenancies, getTenancies, getOwnerLeads, countOwnerLeads, getAgentProfile } from "@/lib/db";
import { effectivePlan } from "@/lib/plan-caps";
import { format } from "date-fns";
import { LifecycleBoard } from "@/components/lifecycle-board";
import { AddTenancyDialog } from "@/components/add-tenancy-dialog";
import { UploadTenancyCsvDialog } from "@/components/upload-tenancy-csv-dialog";
import { MoneySubNav } from "@/components/money-sub-nav";
import { PageHelpButton } from "@/components/page-help-button";
import { defaultLifecycleStage } from "@/lib/types";
import type { Tenancy } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ open?: string; highlight?: string }>;
}

export default async function TenanciesPage({ searchParams }: Props) {
  const { open, highlight } = await searchParams;
  const today = new Date();
  const [lifecycle, allTenancies, ownerLeads, makeCount, agentProfile] = await Promise.all([
    getLifecycleTenancies(),
    getTenancies(),
    getOwnerLeads(),
    countOwnerLeads(),
    getAgentProfile().catch(() => null),
  ]);
  const plan = effectivePlan(agentProfile);

  // Stats for the hero
  const expiringIn30 = lifecycle.filter((t) => {
    if (!t.contract_end) return false;
    const days = Math.ceil((new Date(t.contract_end).getTime() - today.getTime()) / 86400000);
    return days >= 0 && days <= 30;
  }).length;

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="serif kk-display" style={{ color: "var(--kk-accent)" }}>
            Track renewal
          </h1>
          <p className="mt-3 kk-body-sm max-w-2xl" style={{ color: "var(--kk-ink-mute)" }}>
            Track every tenancy. Get alerted 60 days before any contract expires.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <UploadTenancyCsvDialog />
          <AddTenancyDialog ownerLeads={ownerLeads} />
        </div>
      </header>

      <Suspense fallback={null}>
        <MoneySubNav
          makeCount={makeCount}
          renewCount={lifecycle.filter(t => { const s = defaultLifecycleStage(t, today); return s !== null && s !== "closed"; }).length}
          helpSlot={
            <PageHelpButton
              variant="question"
              module={2}
              pageTitle="Existing Contracts — capture your passive income"
              bullets={[
                "Add each active tenancy with its contract expiry date",
                "kakisewa alerts you 60 days before any contract expires",
                "Reach out to the owner before another agent does",
                "Renew the contract and earn half a month's rent in commission. Automatically tracked.",
              ]}
            />
          }
        />
      </Suspense>

      {lifecycle.length === 0 ? (() => {
        const demoTenancy: Tenancy = {
          id: "__demo__",
          tenant_name: "Sarah Chong",
          tenant_phone: "0187654321",
          due_day: 1,
          amount: 2500,
          current_month_paid: false,
          lhdn_status: "none",
          status: "Pending",
          replied_tenant: "pending",
          replied_owner: "pending",
          contract_end: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          property_name: "Agile Mont Kiara · Unit A-12-05",
          created_at: new Date().toISOString(),
        };
        return (
          <>
            {/* Empty state CTA */}
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center max-w-md mx-auto">
              <h2 className="serif kk-h2 mb-3" style={{ color: "var(--kk-ink)" }}>
                Upload your existing contracts
              </h2>
              <p className="kk-body-sm mb-6 leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
                Bring in what you already manage. We'll track every expiry and alert you 60 days before renewal time.
              </p>
              <div className="w-full rounded-2xl px-5 py-4 mb-6 text-left" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
                <p className="text-[12px] font-semibold mb-3" style={{ color: "var(--kk-ink-soft)" }}>
                  Make sure these fields are filled in:
                </p>
                <ul className="space-y-2">
                  {["Property name", "Unit number", "Owner contact", "Contract start date", "Duration (we default to 1 year if blank)"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--kk-amber)" }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center gap-3">
                <UploadTenancyCsvDialog />
                <AddTenancyDialog ownerLeads={ownerLeads} />
              </div>
            </div>

            {/* Preview of what it looks like */}
            <p className="text-center text-[12px] mb-4" style={{ color: "var(--kk-ink-faint)" }}>
              Here is a preview of what your board will look like
            </p>
            <div style={{ opacity: 0.35, pointerEvents: "none" }}>
              <LifecycleBoard tenancies={[demoTenancy]} openTenancyId={undefined} highlightId={undefined} plan={plan} />
            </div>
          </>
        );
      })() : (
        <LifecycleBoard tenancies={lifecycle} openTenancyId={open} highlightId={highlight} plan={plan} />
      )}
    </div>
  );
}
