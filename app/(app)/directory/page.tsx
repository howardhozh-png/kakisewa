import { Suspense } from "react";
import { getListedOwnerLeads, getAllTenantProfiles, getTenantsForOwnerLeads, getAllActiveTenants, getPropertySupports } from "@/lib/db";
import { NetworkSubNav } from "@/components/network-sub-nav";
import { MatchesView } from "@/components/matches-view";
import { TenantsTable } from "@/components/tenants-table";
import { SupportsDirectory } from "@/components/supports-directory";
import { AddTenantButton } from "@/components/add-tenant-button";
import { AddSupportButton } from "@/components/add-support-button";
import { AddPropertyButton } from "@/components/add-property-button";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ view?: string }>;
}

const VIEW_TITLES: Record<string, string> = {
  properties: "All Properties",
  tenants:    "All Tenants",
  contacts:   "Support Contacts",
};

const VIEW_DESCS: Record<string, string> = {
  properties: "Every unit you manage or are actively marketing.",
  tenants:    "Everyone in your network — available prospects and active tenants.",
  contacts:   "Your trusted heroes. Plumbers, cleaners, electricians and more.",
};

export default async function NetworkPage({ searchParams }: Props) {
  const { view: rawView } = await searchParams;
  const view = rawView === "properties" ? "properties" : rawView === "tenants" ? "tenants" : "contacts";

  const [listed, tenantProfiles, activeTenants, supports] = await Promise.all([
    getListedOwnerLeads().catch(() => [] as Awaited<ReturnType<typeof getListedOwnerLeads>>),
    getAllTenantProfiles().catch(() => [] as Awaited<ReturnType<typeof getAllTenantProfiles>>),
    getAllActiveTenants().catch(() => [] as Awaited<ReturnType<typeof getAllActiveTenants>>),
    getPropertySupports().catch(() => [] as Awaited<ReturnType<typeof getPropertySupports>>),
  ]);

  const allPropertiesCount = listed.filter(l => l.stage === "listed").length + activeTenants.length;
  const allTenantsCount    = tenantProfiles.length + activeTenants.length;

  const matchedIds = listed.filter(l => l.stage === "matched").map(l => l.id);
  const tenantsByLeadId = await getTenantsForOwnerLeads(matchedIds);

  const propertyTenants = activeTenants.map((t) => ({
    tenancy_id:     t.tenancy_id,
    tenant_name:    t.tenant_name,
    tenant_phone:   t.tenant_phone ?? "",
    property_name:  t.property_name ?? undefined,
    unit:           t.unit ?? undefined,
    expected_rent:  t.amount ?? undefined,
  }));

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-12 lg:py-16">
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
        {view === "properties" && <AddPropertyButton />}
        {view === "tenants" && <AddTenantButton />}
        {view === "contacts" && <AddSupportButton />}
      </header>

      <Suspense fallback={null}>
        <NetworkSubNav
          propertiesCount={allPropertiesCount}
          tenantsCount={allTenantsCount}
          contactsCount={supports.length}
          view={view}
        />
      </Suspense>

      {view === "properties" && (
        <MatchesView listed={listed} tenantsByLeadId={tenantsByLeadId} activeTenants={activeTenants} />
      )}
      {view === "tenants" && (
        <TenantsTable profiles={tenantProfiles} propertyTenants={propertyTenants} />
      )}
      {view === "contacts" && (
        <SupportsDirectory initialContacts={supports} />
      )}
    </div>
  );
}
