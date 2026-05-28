import { Suspense } from "react";
import { getLifecycleTenancies, getTenancies, getProperties, countOwnerLeads } from "@/lib/db";
import { format } from "date-fns";
import { LifecycleBoard } from "@/components/lifecycle-board";
import { AddTenancyDialog } from "@/components/add-tenancy-dialog";
import { MoneySubNav } from "@/components/money-sub-nav";
import { defaultLifecycleStage } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ open?: string; highlight?: string }>;
}

export default async function TenanciesPage({ searchParams }: Props) {
  const { open, highlight } = await searchParams;
  const today = new Date();
  const [lifecycle, allTenancies, properties, makeCount] = await Promise.all([
    getLifecycleTenancies(),
    getTenancies(),
    getProperties(),
    countOwnerLeads(),
  ]);

  // Stats for the hero
  const expiringIn30 = lifecycle.filter((t) => {
    if (!t.contract_end) return false;
    const days = Math.ceil((new Date(t.contract_end).getTime() - today.getTime()) / 86400000);
    return days >= 0 && days <= 30;
  }).length;

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-12 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="serif kk-display" style={{ color: "var(--kk-ink)" }}>
            Existing Contracts
          </h1>
          <p className="mt-3 kk-body-sm max-w-2xl" style={{ color: "var(--kk-ink-mute)" }}>
            Retain your easy money with owners you have built relationship with.
          </p>
        </div>
        <AddTenancyDialog properties={properties} />
      </header>

      <Suspense fallback={null}>
        <MoneySubNav makeCount={makeCount} renewCount={lifecycle.filter(t => { const s = defaultLifecycleStage(t, today); return s !== null && s !== "closed"; }).length} />
      </Suspense>

      {lifecycle.length === 0 ? (
        <div className="kk-section flex flex-col items-center justify-center gap-5 py-24 px-6">
          <div className="text-center max-w-sm">
            <p className="kk-h3" style={{ color: "var(--kk-ink)" }}>Nothing on the radar</p>
            <p className="mt-2 kk-body-sm" style={{ color: "var(--kk-ink-mute)" }}>
              No contracts are within 60 days of expiry. Add a tenancy with contract dates to see it here.
            </p>
          </div>
        </div>
      ) : (
        <LifecycleBoard tenancies={lifecycle} openTenancyId={open} highlightId={highlight} />
      )}
    </div>
  );
}
