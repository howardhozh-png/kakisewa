import { Suspense } from "react";
import { TourSpotlight } from "@/components/tour-spotlight";
import type { TenantProfile } from "@/lib/types";
import { getListedOwnerLeads, getCompetitorLeads, getAllTenantProfiles, getTenantsForOwnerLeads, getAllActiveTenants, getLifecycleTenancies, getPropertySupports, getAgentProfile } from "@/lib/db";
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

  const [listed, targetLeads, tenantProfiles, activeTenants, lifecycleTenancies, supports] = await Promise.all([
    getListedOwnerLeads().catch(() => [] as Awaited<ReturnType<typeof getListedOwnerLeads>>),
    getCompetitorLeads().catch(() => [] as Awaited<ReturnType<typeof getCompetitorLeads>>),
    getAllTenantProfiles().catch(() => [] as Awaited<ReturnType<typeof getAllTenantProfiles>>),
    getAllActiveTenants().catch(() => [] as Awaited<ReturnType<typeof getAllActiveTenants>>),
    getLifecycleTenancies().catch(() => [] as Awaited<ReturnType<typeof getLifecycleTenancies>>),
    getPropertySupports().catch(() => [] as Awaited<ReturnType<typeof getPropertySupports>>),
  ]);

  // Merge target leads that aren't already in listed (deduplicate by id)
  const listedIds = new Set(listed.map(l => l.id));
  const allListed = [...listed, ...targetLeads.filter(l => !listedIds.has(l.id))];

  // Split tenants: active (still renting) vs former (closed/ended tenancies) — used for Tenants tab
  const currentTenants = activeTenants.filter(t => t.lifecycle_stage !== "closed");
  const formerTenants  = activeTenants.filter(t => t.lifecycle_stage === "closed");

  // All Properties tab: use full lifecycle tenancy list (460 non-closed for Silver)
  const existingForDirectory = lifecycleTenancies
    .filter(t => t.lifecycle_stage !== "closed")
    .map(t => ({
      tenancy_id:     t.id,
      tenant_name:    t.tenant_name ?? "",
      tenant_phone:   t.tenant_phone ?? null,
      property_name:  t.property_name ?? null,
      unit:           t.property?.unit ?? null,
      amount:         (t.amount ?? null) as number | null,
      lifecycle_stage: t.lifecycle_stage ?? null,
    }));

  const allPropertiesCount = allListed.length + existingForDirectory.length;

  const matchedIds = allListed.filter(l => l.stage === "matched").map(l => l.id);
  const tenantsByLeadId = await getTenantsForOwnerLeads(matchedIds);

  const propertyTenants = currentTenants.map((t) => ({
    tenancy_id:     t.tenancy_id,
    tenant_name:    t.tenant_name,
    tenant_phone:   t.tenant_phone ?? "",
    tenant_whatsapp_username: t.tenant_whatsapp_username,
    property_name:  t.property_name ?? undefined,
    unit:           t.unit ?? undefined,
    expected_rent:  t.amount ?? undefined,
  }));

  // Exclude tenant profiles whose phone is already tied to an active tenancy (prevents double-listing)
  const activePhones = new Set(currentTenants.map((t) => t.tenant_phone).filter(Boolean) as string[]);
  const formerPhones  = new Set(formerTenants.map((t)  => t.tenant_phone).filter(Boolean) as string[]);
  // Fallback: dedup by name (case-insensitive) when the profile has no phone
  const activeTenantNames = new Set(
    currentTenants.map((t) => t.tenant_name?.trim().toLowerCase()).filter(Boolean) as string[]
  );

  // Build a phone → real profile map for fast lookup
  const profileByPhone = new Map(tenantProfiles.filter(p => p.phone).map(p => [p.phone!, p]));

  // Former tenants re-enter the available pool.
  // Prefer their real tenant_profiles row (created when the tenancy was added);
  // skip entirely if they already appear via tenantProfiles (phone match).
  const formerProfilePhones = new Set<string>();
  const formerAsProfiles: TenantProfile[] = [];
  for (const t of formerTenants) {
    if (activePhones.has(t.tenant_phone ?? "")) continue;
    const real = t.tenant_phone ? profileByPhone.get(t.tenant_phone) : null;
    if (real) {
      // Real profile exists — it will already appear in tenantProfiles; skip duplicate
      formerProfilePhones.add(t.tenant_phone!);
    }
    // No real profile (tenancy predates auto-create) — skip rather than show broken synthetic
  }

  const availableTenantProfiles = tenantProfiles.filter((p) => {
    if (p.phone && activePhones.has(p.phone)) return false;
    // Profiles without a phone: dedup by name so the same person doesn't appear as both
    // "Available" (tenant_profile) and "Rented" (active tenancy)
    if (!p.phone && p.name && activeTenantNames.has(p.name.trim().toLowerCase())) return false;
    return true;
  });

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
        <TourSpotlight
          step="tenants"
          stepNumber={4}
          targetId="tour-add-tenant"
          title="Save your first tenant profile"
          body="Tap the highlighted button to add a tenant. Keep all their details in one place for renewals and handovers."
        />
      </Suspense>
      <Suspense fallback={null}>
        <TourSpotlight
          step="supports"
          stepNumber={5}
          targetId="tour-add-contact"
          title="Save a support contact"
          body="Tap the highlighted button to add your go-to plumber, electrician, or handyman for quick access."
        />
      </Suspense>

      <Suspense fallback={null}>
        <NetworkSubNav
          propertiesCount={allPropertiesCount}
          tenantsCount={allTenantsCount}
          contactsCount={supports.length}
          view={view}
          helpSlot={
            view === "tenants" ? (
              <PageHelpButton
                variant="question"
                module={3}
                pageTitle="Tenant directory — send property packs"
                bullets={[
                  "Add prospect and active tenants to your directory",
                  "Open any tenant to see their contact details and requirements",
                  "Send a personalised property pack with one tap via WhatsApp",
                  "Track which properties each tenant has been shown",
                ]}
              />
            ) : (
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
            )
          }
        />
      </Suspense>

      {view === "properties" && (
        <MatchesView listed={allListed} tenantsByLeadId={tenantsByLeadId} activeTenants={existingForDirectory} />
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
