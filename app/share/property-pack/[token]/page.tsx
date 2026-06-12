import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { getPropertyPackByToken } from "@/lib/db";
import { createServiceClient } from "@/lib/supabase/service";
import { PropertyPackShareViewer } from "@/components/property-pack-share-viewer";

export const dynamic = "force-dynamic";

export default async function PropertyPackSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getPropertyPackByToken(token);
  if (!result) notFound();

  const { pack, leads } = result;
  const isExpired = new Date(pack.expires_at) < new Date();

  const agentName = pack.user_id
    ? await createServiceClient()
        .from("agent_profiles")
        .select("name")
        .eq("id", pack.user_id)
        .maybeSingle()
        .then(({ data }: { data: { name?: string } | null }) => {
          const full = data?.name?.trim() ?? null;
          return full ? full.split(/\s+/)[0] : null;
        })
    : null;

  return (
    <div className="min-h-screen" style={{ background: "#F2F2F7" }}>
      <header style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#fff" }}>
        <div className="mx-auto max-w-[600px] px-5 py-4 flex items-center gap-2.5">
          <Logo size={24} />
          <span className="font-semibold text-[16px]" style={{ color: "#1C1C1E", letterSpacing: "-0.01em" }}>
            kakisewa
          </span>
          <span className="ml-2 text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#AEAEB2" }}>
            Property Pack
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[600px] px-4 py-6">
        <div className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#AEAEB2" }}>
            Properties for
          </p>
          <h1 className="text-[22px] font-bold tracking-tight leading-tight" style={{ color: "#1C1C1E", letterSpacing: "-0.02em" }}>
            {pack.tenant_label ?? "You"}
          </h1>
          {agentName && (
            <p className="text-[18px] mt-0.5 font-bold italic leading-snug" style={{ color: "#1C1C1E" }}>
              by {agentName}
            </p>
          )}
          {!isExpired && (
            <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "#6C6C70" }}>
              Browse properties selected for you. Drag to rank your preferences or tap the heart to shortlist. Your agent gets notified instantly.
            </p>
          )}
        </div>

        {isExpired ? (
          <div
            className="rounded-2xl flex flex-col items-center justify-center gap-3 py-16 px-6 text-center"
            style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }}
          >
            <p className="text-[16px] font-semibold" style={{ color: "#1C1C1E" }}>This link has expired</p>
            <p className="text-[13px]" style={{ color: "#6C6C70" }}>
              Property pack links are valid for 1 hour. Ask your agent to send a fresh one.
            </p>
          </div>
        ) : leads.length === 0 ? (
          <div
            className="rounded-2xl flex flex-col items-center justify-center gap-3 py-16 px-6 text-center"
            style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }}
          >
            <p className="text-[16px] font-semibold" style={{ color: "#1C1C1E" }}>No properties yet</p>
            <p className="text-[13px]" style={{ color: "#6C6C70" }}>
              Your agent is still putting it together. Check back shortly.
            </p>
          </div>
        ) : (
          <PropertyPackShareViewer packToken={token} initialLeads={leads} />
        )}
      </main>

      <footer className="text-center text-[11px] py-8 px-4" style={{ color: "#C7C7CC" }}>
        Powered by kakisewa · AI-powered tenancy CRM
      </footer>
    </div>
  );
}
