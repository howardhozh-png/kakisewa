import { getOwnerLead, getOrCreateMatchPack, getPackTenants, getAllTenantProfiles, getPendingIntakesForLead } from "@/lib/db";
import { getBaseUrl } from "@/lib/origin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Megaphone } from "lucide-react";
import { MatchPackBuilder } from "@/components/match-pack-builder";

export const dynamic = "force-dynamic";

export default async function PackBuilderPage({
  params,
}: {
  params: Promise<{ ownerLeadId: string }>;
}) {
  const { ownerLeadId } = await params;
  const lead = await getOwnerLead(ownerLeadId);
  if (!lead) notFound();

  const [pack, baseUrl, allProfiles, pendingIntakes] = await Promise.all([
    getOrCreateMatchPack(ownerLeadId),
    getBaseUrl(),
    getAllTenantProfiles(),
    getPendingIntakesForLead(ownerLeadId),
  ]);
  const tenants = await getPackTenants(pack.id);
  const shareUrl = `${baseUrl}/share/pack/${pack.share_token}`;
  const inPackIds = new Set(tenants.map((t) => t.id));
  const availableProfiles = allProfiles.filter((p) => !inPackIds.has(p.id));

  return (
    <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-12 lg:py-16">
      <Link
        href="/leads?tab=pipeline"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-6 hover:opacity-70 transition-opacity"
        style={{ color: "var(--kk-ink-mute)" }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All listings
      </Link>

      <header className="flex items-start justify-between gap-6 mb-10">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "var(--kk-purple-soft)", color: "#6F2DA8" }}
          >
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <p className="kk-overline mb-2">Tenant pack for</p>
            <h1 className="serif text-[34px] tracking-tight leading-tight" style={{ color: "var(--kk-ink)" }}>
              {lead.property_name ?? "Owner property"}
              {lead.unit ? <span className="font-normal" style={{ color: "var(--kk-ink-mute)" }}> · Unit {lead.unit}</span> : null}
            </h1>
            <p className="mt-2 kk-body-sm" style={{ color: "var(--kk-ink-mute)" }}>
              Owner: {lead.owner_name} · {lead.expected_rent != null && <>RM {lead.expected_rent.toLocaleString()}/mo · </>}
              {lead.bedrooms != null && lead.bathrooms != null && <>{lead.bedrooms} bed · {lead.bathrooms} bath</>}
            </p>
          </div>
        </div>
      </header>

      <MatchPackBuilder
        pack={pack}
        initialTenants={tenants}
        initialPending={pendingIntakes}
        shareUrl={shareUrl}
        ownerLeadId={ownerLeadId}
        availableProfiles={availableProfiles}
        leadPropertyName={lead.property_name ?? undefined}
        leadPropertyUnit={lead.unit ?? undefined}
      />
    </div>
  );
}
