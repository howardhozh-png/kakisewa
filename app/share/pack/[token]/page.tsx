import { getMatchPackByToken, getPackTenants, getOwnerLead } from "@/lib/db";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { SharePackViewer } from "@/components/share-pack-viewer";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export default async function SharePackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const pack = await getMatchPackByToken(token);
  if (!pack) notFound();
  const tenants = await getPackTenants(pack.id);

  // Fetch agent name and owner name in parallel
  const [agentData, ownerLead] = await Promise.all([
    pack.user_id
      ? createServiceClient()
          .from("agent_profiles")
          .select("name")
          .eq("id", pack.user_id)
          .maybeSingle()
          .then(({ data }: { data: { name?: string } | null }) => data?.name ?? null)
      : Promise.resolve(null),
    pack.owner_lead_id ? getOwnerLead(pack.owner_lead_id) : Promise.resolve(null),
  ]);

  const agentFirstName = agentData?.trim().split(/\s+/)[0] ?? null;
  const propertyLabel = pack.property_label ?? "Your property";
  const isExpired = (pack as Record<string, unknown>).expires_at
    ? new Date((pack as Record<string, unknown>).expires_at as string) < new Date()
    : false;

  return (
    <div className="min-h-screen" style={{ background: "#F2F2F7" }}>
      <header style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#fff" }}>
        <div className="mx-auto max-w-[600px] px-5 py-4 flex items-center gap-2.5">
          <Logo size={24} />
          <span className="font-semibold text-[16px]" style={{ color: "#1C1C1E", letterSpacing: "-0.01em" }}>kakisewa</span>
          <span className="ml-2 text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#AEAEB2" }}>
            Tenant Pack
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[600px] px-4 py-6">
        <div className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#AEAEB2" }}>
            Tenants for
          </p>
          <h1 className="text-[22px] font-bold tracking-tight leading-tight" style={{ color: "#1C1C1E", letterSpacing: "-0.02em" }}>
            {propertyLabel}
          </h1>
          {agentFirstName && (
            <p className="text-[18px] mt-0.5 font-bold italic leading-snug" style={{ color: "#1C1C1E" }}>
              by {agentFirstName}
            </p>
          )}
          {!isExpired && (
            <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "#6C6C70" }}>
              Drag to rank tenants. Leave notes if any. I get notified instantly to schedule house viewing.
            </p>
          )}
          {!isExpired && (pack.property_rent || pack.property_beds || pack.property_baths) && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {pack.property_rent != null && (
                <span className="px-2.5 py-1 rounded-full text-[12px] font-medium" style={{ background: "#fff", color: "#1C1C1E", border: "1px solid rgba(0,0,0,0.08)" }}>
                  RM {pack.property_rent.toLocaleString()}/mo
                </span>
              )}
              {pack.property_beds != null && (
                <span className="px-2.5 py-1 rounded-full text-[12px]" style={{ background: "#fff", color: "#6C6C70", border: "1px solid rgba(0,0,0,0.08)" }}>
                  {pack.property_beds} bed
                </span>
              )}
              {pack.property_baths != null && (
                <span className="px-2.5 py-1 rounded-full text-[12px]" style={{ background: "#fff", color: "#6C6C70", border: "1px solid rgba(0,0,0,0.08)" }}>
                  {pack.property_baths} bath
                </span>
              )}
            </div>
          )}
        </div>

        {isExpired ? (
          <div
            className="rounded-2xl flex flex-col items-center justify-center gap-3 py-16 px-6 text-center"
            style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }}
          >
            <p className="text-[16px] font-semibold" style={{ color: "#1C1C1E" }}>This link has expired</p>
            <p className="text-[13px]" style={{ color: "#6C6C70" }}>
              Tenant pack links are valid for 1 hour. Ask your agent to send a fresh one.
            </p>
          </div>
        ) : tenants.length === 0 ? (
          <div
            className="rounded-2xl flex flex-col items-center justify-center gap-3 py-16 px-6 text-center"
            style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }}
          >
            <p className="text-[16px] font-semibold" style={{ color: "#1C1C1E" }}>No tenants yet</p>
            <p className="text-[13px]" style={{ color: "#6C6C70" }}>
              Your agent is still putting it together. Check back shortly.
            </p>
          </div>
        ) : (
          <SharePackViewer packId={pack.id} initialTenants={tenants} />
        )}
      </main>

      <footer className="text-center text-[11px] py-8 px-4" style={{ color: "#C7C7CC" }}>
        Powered by kakisewa · AI-powered tenancy CRM
      </footer>
    </div>
  );
}
