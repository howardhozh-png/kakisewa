import { Suspense } from "react";
import type { TenantProfile } from "@/lib/types";
import { getListedOwnerLeads, getCompetitorLeads, getAllTenantProfiles, getTenantsForOwnerLeads, getAllActiveTenants, getPropertySupports, getAgentProfile } from "@/lib/db";
import { effectivePlan, planAllows } from "@/lib/plan-caps";
import { FeatureLockedState } from "@/components/feature-locked-state";
import { headers } from "next/headers";
import { PageHelpButton } from "@/components/page-help-button";
import { NetworkSubNav } from "@/components/network-sub-nav";
import { MatchesView } from "@/components/matches-view";
import { TenantsTable } from "@/components/tenants-table";
import { SupportsDirectory } from "@/components/supports-directory";
import { AddTenantButton } from "@/components/add-tenant-button";
import { AddSupportButton } from "@/components/add-support-button";
import { AddListingButton } from "@/components/add-listing-button";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ view?: string }>;
}

const VIEW_TITLES: Record<string, string> = {
  properties: "Directory",
  tenants:    "Directory",
  contacts:   "Directory",
};

const VIEW_DESCS: Record<string, string> = {
  properties: "Every unit you manage or are actively marketing.",
  tenants:    "Everyone in your network — available prospects and active tenants.",
  contacts:   "Your trusted heroes. Plumbers, cleaners, electricians and more.",
};

export default async function NetworkPage({ searchParams }: Props) {
  const isAdmin = (await headers()).get("x-is-admin") === "true";
  const agent = await getAgentProfile().catch(() => null);
  const plan = effectivePlan(agent);

  // Directory is open to all logged-in users

  const { view: rawView } = await searchParams;
  const view = rawView === "properties" ? "properties" : rawView === "tenants" ? "tenants" : "contacts";

  const [listed, targetLeads, tenantProfiles, activeTenants, supports] = await Promise.all([
    getListedOwnerLeads().catch(() => [] as Awaited<ReturnType<typeof getListedOwnerLeads>>),
    getCompetitorLeads().catch(() => [] as Awaited<ReturnType<typeof getCompetitorLeads>>),
    getAllTenantProfiles().catch(() => [] as Awaited<ReturnType<typeof getAllTenantProfiles>>),
    getAllActiveTenants().catch(() => [] as Awaited<ReturnType<typeof getAllActiveTenants>>),
    getPropertySupports().catch(() => [] as Awaited<ReturnType<typeof getPropertySupports>>),
  ]);

  // Merge target leads that aren't already in listed (deduplicate by id)
  const listedIds = new Set(listed.map(l => l.id));
  const allListed = [...listed, ...targetLeads.filter(l => !listedIds.has(l.id))];

  // Split tenants: active (still renting) vs former (closed/ended tenancies)
  const currentTenants = activeTenants.filter(t => t.lifecycle_stage !== "closed");
  const formerTenants  = activeTenants.filter(t => t.lifecycle_stage === "closed");

  const allPropertiesCount = allListed.filter(l => l.stage === "listed" || l.is_competitor_target).length + currentTenants.length;

  const matchedIds = allListed.filter(l => l.stage === "matched").map(l => l.id);
  const tenantsByLeadId = await getTenantsForOwnerLeads(matchedIds);

  const propertyTenants = currentTenants.map((t) => ({
    tenancy_id:     t.tenancy_id,
    tenant_name:    t.tenant_name,
    tenant_phone:   t.tenant_phone ?? "",
    property_name:  t.property_name ?? undefined,
    unit:           t.unit ?? undefined,
    expected_rent:  t.amount ?? undefined,
  }));

  // Exclude tenant profiles whose phone is already tied to an active tenancy (prevents double-listing)
  const activePhones = new Set(currentTenants.map((t) => t.tenant_phone).filter(Boolean) as string[]);
  const formerPhones  = new Set(formerTenants.map((t)  => t.tenant_phone).filter(Boolean) as string[]);

  // Former tenants re-enter the available pool; synthesise minimal TenantProfile objects for them
  const formerAsProfiles: TenantProfile[] = formerTenants
    .filter(t => !activePhones.has(t.tenant_phone ?? ""))
    .map(t => ({
      id:         t.tenancy_id,
      name:       t.tenant_name,
      phone:      t.tenant_phone ?? null,
      created_at: new Date().toISOString(),
    }));

  const availableTenantProfiles = [
    ...tenantProfiles.filter((p) => !(p.phone && (activePhones.has(p.phone) || formerPhones.has(p.phone)))),
    ...formerAsProfiles,
  ];

  const allTenantsCount = availableTenantProfiles.length + currentTenants.length;

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-6 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="kk-overline mb-3">Directory</p>
          <h1 className="serif kk-display" style={{ color: "var(--kk-ink)" }}>
            {VIEW_TITLES[view]}
          </h1>
          <p className="mt-3 kk-body-sm max-w-2xl" style={{ color: "var(--kk-ink-mute)" }}>
            {VIEW_DESCS[view]}
          </p>
        </div>
        {view === "properties" && <AddListingButton ownerLeads={listed} />}
        {view === "tenants" && <AddTenantButton />}
        {view === "contacts" && <AddSupportButton />}
      </header>

      <Suspense fallback={null}>
        <NetworkSubNav
          propertiesCount={allPropertiesCount}
          tenantsCount={allTenantsCount}
          contactsCount={supports.length}
          view={view}
          helpSlot={
            <PageHelpButton
              variant="question"
              module={1}
              noVideo
              pageTitle="Directory — your full property network"
              bullets={[
                "Contacts tab: add trusted service contacts like plumbers, electricians, cleaners",
                "Service contacts are shown to owners and tenants when emergencies come up",
                "Properties tab: every unit you manage or are actively marketing",
                "Tenants tab: all prospects and active tenants across your portfolio",
              ]}
            />
          }
        />
      </Suspense>

      {view === "properties" && (
        <MatchesView listed={allListed} tenantsByLeadId={tenantsByLeadId} activeTenants={activeTenants} />
      )}
      {view === "tenants" && (
        <TenantsTable profiles={availableTenantProfiles} propertyTenants={propertyTenants} />
      )}
      {view === "contacts" && (
        <SupportsDirectory initialContacts={supports} whatsappTemplates={agent?.whatsapp_templates} />
      )}
    </div>
  );
}
