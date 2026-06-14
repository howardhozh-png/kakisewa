import { getLatestRankedPropertyPack, getTenantProfileFull } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart, Package } from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

function PhotoStrip({ urls, coverIndex }: { urls: string[]; coverIndex: number | null }) {
  if (!urls.length) {
    return (
      <div
        className="w-full aspect-[4/3] flex items-center justify-center rounded-2xl"
        style={{ background: "var(--kk-surface-2)" }}
      >
        <Package className="w-8 h-8" style={{ color: "var(--kk-ink-faint)" }} />
      </div>
    );
  }
  const cover = urls[coverIndex ?? 0] ?? urls[0];
  return (
    <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cover} alt="" className="w-full h-full object-cover" />
    </div>
  );
}

export default async function PropertyPackResultsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;

  const [tenant, result] = await Promise.all([
    getTenantProfileFull(tenantId),
    getLatestRankedPropertyPack(tenantId),
  ]);

  if (!tenant) notFound();

  const hasRankings = result?.leads.some(l => l.tenant_rank != null) ?? false;
  const rankedLeads = result
    ? [...result.leads].sort((a, b) => {
        if (a.tenant_rank == null && b.tenant_rank == null) return (a.position ?? 0) - (b.position ?? 0);
        if (a.tenant_rank == null) return 1;
        if (b.tenant_rank == null) return -1;
        return a.tenant_rank - b.tenant_rank;
      })
    : [];

  const sentAt = result?.pack.created_at
    ? format(new Date(result.pack.created_at), "d MMM yyyy")
    : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      {/* Nav bar — same style as share/property-pack */}
      <div
        className="sticky top-0 z-10 flex items-center px-6 h-14 gap-4 border-b"
        style={{ background: "var(--kk-surface)", borderColor: "var(--kk-line)" }}
      >
        <Link
          href={`/directory?view=tenants`}
          className="flex items-center gap-1.5 text-[13px] font-medium hover:opacity-70 transition-opacity"
          style={{ color: "var(--kk-ink-mute)", textDecoration: "none" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Link>
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--kk-ink-faint)" }}>
          Property Pack
        </span>
      </div>

      <div className="max-w-xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <p className="kk-overline mb-1">Properties for</p>
          <h1 className="text-[28px] font-semibold tracking-tight" style={{ color: "var(--kk-ink)" }}>
            {tenant.name}
          </h1>
          {sentAt && (
            <p className="text-[13px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>
              Pack sent {sentAt}
            </p>
          )}
        </div>

        {/* No pack sent yet */}
        {!result && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: "var(--kk-surface-2)" }}
          >
            <Package className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--kk-ink-faint)" }} />
            <p className="text-[14px] font-medium" style={{ color: "var(--kk-ink)" }}>No property pack sent yet</p>
            <p className="text-[13px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>
              Open the tenant card and click "Send property pack" to select and send properties.
            </p>
          </div>
        )}

        {/* Pack sent, not ranked yet */}
        {result && !hasRankings && (
          <div
            className="rounded-2xl p-5 mb-6 flex items-center gap-3"
            style={{ background: "var(--kk-amber-soft)", border: "1px solid rgba(255,149,0,0.2)" }}
          >
            <p className="text-[13px] font-medium" style={{ color: "#92400E" }}>
              Pack sent — waiting for {tenant.name} to rank
            </p>
          </div>
        )}

        {/* Ranked properties — agent view with unit numbers */}
        {rankedLeads.length > 0 && (
          <div className="flex flex-col gap-4">
            {hasRankings && (
              <p className="text-[13px] font-medium mb-1" style={{ color: "var(--kk-ink-mute)" }}>
                {tenant.name}&apos;s ranking
              </p>
            )}
            {rankedLeads.map((lead, idx) => {
              const rank = lead.tenant_rank ?? idx + 1;
              const propLabel = [lead.property_name, lead.unit ? `Unit ${lead.unit}` : null]
                .filter(Boolean).join(" · ");

              return (
                <div
                  key={lead.owner_lead_id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}
                >
                  {/* Photo */}
                  <div className="relative">
                    <PhotoStrip urls={lead.photo_urls} coverIndex={lead.cover_photo_index} />
                    {/* Rank badge */}
                    <div
                      className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold"
                      style={{ background: "var(--kk-ink)", color: "#fff" }}
                    >
                      {hasRankings ? rank : idx + 1}
                    </div>
                    {/* Liked badge */}
                    {lead.tenant_liked === 1 && (
                      <div
                        className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold"
                        style={{ background: "rgba(255,59,48,0.9)", color: "#fff" }}
                      >
                        <Heart className="w-3 h-3 fill-current" />
                        Shortlisted
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold" style={{ color: "var(--kk-ink)" }}>
                          {lead.property_name ?? "—"}
                        </p>
                        {/* Unit number — agent only, not shown to tenant */}
                        {lead.unit && (
                          <p className="text-[12px] font-medium mt-0.5" style={{ color: "var(--kk-purple-ink)" }}>
                            Unit {lead.unit}
                          </p>
                        )}
                      </div>
                      {lead.expected_rent != null && (
                        <p className="text-[14px] font-semibold shrink-0" style={{ color: "var(--kk-ink)" }}>
                          RM {lead.expected_rent.toLocaleString()}/mo
                        </p>
                      )}
                    </div>
                    {(lead.bedrooms != null || lead.bathrooms != null) && (
                      <div className="flex gap-3 mt-2">
                        {lead.bedrooms != null && (
                          <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>{lead.bedrooms} bed</span>
                        )}
                        {lead.bathrooms != null && (
                          <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>{lead.bathrooms} bath</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tenant preferences from intake form */}
        {tenant.intake_completed_at && (
          <div className="mt-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--kk-ink-faint)" }}>
              Tenant property preferences
            </p>
            <div
              className="rounded-2xl p-4 flex flex-col gap-2"
              style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)" }}
            >
              {(tenant.budget_min != null || tenant.budget_max != null) && (
                <div className="flex justify-between">
                  <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>Budget</span>
                  <span className="text-[12px] font-medium" style={{ color: "var(--kk-ink)" }}>
                    {tenant.budget_min != null && tenant.budget_max != null
                      ? `RM ${tenant.budget_min.toLocaleString()} – RM ${tenant.budget_max.toLocaleString()}`
                      : tenant.budget_max != null
                        ? `Up to RM ${tenant.budget_max.toLocaleString()}`
                        : `From RM ${tenant.budget_min!.toLocaleString()}`}
                  </span>
                </div>
              )}
              {tenant.bedrooms_pref != null && (
                <div className="flex justify-between">
                  <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>Bedrooms</span>
                  <span className="text-[12px] font-medium" style={{ color: "var(--kk-ink)" }}>{tenant.bedrooms_pref} bedrooms</span>
                </div>
              )}
              {tenant.preferred_move_in && (
                <div className="flex justify-between">
                  <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>Move-in</span>
                  <span className="text-[12px] font-medium" style={{ color: "var(--kk-ink)" }}>{tenant.preferred_move_in}</span>
                </div>
              )}
              {tenant.area_preference && (
                <div className="flex justify-between">
                  <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>Area</span>
                  <span className="text-[12px] font-medium" style={{ color: "var(--kk-ink)" }}>{tenant.area_preference}</span>
                </div>
              )}
              {tenant.furnishing_preference && (
                <div className="flex justify-between">
                  <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>Furnishing</span>
                  <span className="text-[12px] font-medium" style={{ color: "var(--kk-ink)" }}>{tenant.furnishing_preference}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
