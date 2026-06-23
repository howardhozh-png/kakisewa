import { createServiceClient } from "@/lib/supabase/service";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Building2, Award, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

async function getPublicAgentProfile(id: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("agent_profiles")
    .select("id, name, agency, photo_url, ren_number, phone, subscription_plan, subscription_status")
    .eq("id", id)
    .maybeSingle();
  return data as {
    id: string;
    name: string | null;
    agency: string | null;
    photo_url: string | null;
    ren_number: string | null;
    phone: string | null;
    subscription_plan: "silver" | "platinum" | "elite" | null;
    subscription_status: string | null;
  } | null;
}

async function getAgentStats(userId: string) {
  const supabase = createServiceClient();
  const [dealsRes, tenantsRes, listingsRes] = await Promise.all([
    supabase
      .from("commission_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("tenancies")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("lifecycle_stage", "closed"),
    supabase
      .from("owner_leads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("stage", ["listed", "matched"]),
  ]);
  return {
    dealCount: dealsRes.count ?? 0,
    activeContracts: tenantsRes.count ?? 0,
    activeListings: listingsRes.count ?? 0,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const agent = await getPublicAgentProfile(id);
  if (!agent) return { title: "Agent not found" };
  const name = agent.name ?? "kakisewa Agent";
  const agency = agent.agency ?? "";
  return {
    title: `${name}${agency ? ` · ${agency}` : ""} | kakisewa`,
    description: `Property agent profile for ${name}${agency ? ` from ${agency}` : ""}. Connect via WhatsApp.`,
    openGraph: {
      title: `${name} | kakisewa`,
      description: `Property agent${agency ? ` at ${agency}` : ""}. Available for tenancy inquiries.`,
      images: agent.photo_url ? [{ url: agent.photo_url }] : [],
    },
  };
}

function initials(name?: string | null): string {
  if (!name) return "KK";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function normalisePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export default async function AgentProfilePage({ params }: Props) {
  const { id } = await params;
  const agent = await getPublicAgentProfile(id);

  if (!agent) notFound();

  // Redirect to the prettier firstName/renNumber URL if possible
  if (agent.ren_number) {
    const firstName = agent.name?.trim().split(/\s+/)[0].toLowerCase() || "agent";
    redirect(`/agent/${encodeURIComponent(firstName)}/${encodeURIComponent(agent.ren_number)}`);
  }

  const isActive = agent.subscription_status === "active" || agent.subscription_status === "trial";
  const plan = agent.subscription_plan;
  const isElite = plan === "elite";
  const isPlatinum = plan === "platinum";

  if (!isActive || (!isElite && !isPlatinum)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--kk-surface)" }}>
        <div className="text-center max-w-sm">
          <p className="text-[14px]" style={{ color: "var(--kk-ink-mute)" }}>This agent profile is not publicly available.</p>
          <Link href="/" className="mt-4 inline-block text-[13px] font-semibold" style={{ color: "var(--kk-blue)" }}>
            Back to kakisewa
          </Link>
        </div>
      </div>
    );
  }

  const stats = await getAgentStats(id);
  const waUrl = agent.phone
    ? `https://wa.me/${normalisePhone(agent.phone)}?text=${encodeURIComponent(`Hi ${agent.name ?? "there"}, I found your profile on kakisewa and would like to inquire about a property.`)}`
    : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-surface)" }}>
      {/* Header bar */}
      <header className="border-b px-4 py-3 flex items-center justify-between" style={{ borderColor: "var(--kk-line)", background: "var(--kk-topnav-bg)" }}>
        <Link href="/" className="text-[14px] font-bold" style={{ color: "var(--kk-topnav-ink)" }}>
          kakisewa
        </Link>
        {!isElite && (
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)", color: "var(--kk-topnav-mute)" }}>
            Private link
          </span>
        )}
      </header>

      <main className="mx-auto max-w-lg px-4 py-10">
        {/* Card */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--kk-line)", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
          {/* Banner */}
          <div style={{
            height: 100,
            background: isElite
              ? "linear-gradient(145deg, #6b3d1e 0%, #a8692e 40%, #c98840 60%, #5c3015 100%)"
              : "linear-gradient(145deg, #0b1f4a 0%, #1a3464 50%, #0a1a3c 100%)",
          }} />

          {/* Avatar + name */}
          <div className="px-6 pb-6" style={{ background: "var(--kk-surface)" }}>
            <div className="flex items-end justify-between -mt-10 mb-4">
              {agent.photo_url ? (
                <img
                  src={agent.photo_url}
                  alt={agent.name ?? "Agent"}
                  width={80} height={80}
                  style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--kk-surface)", display: "block" }}
                />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-[24px] font-bold"
                  style={{ border: "3px solid var(--kk-surface)", background: isElite ? "#c98840" : "#1a3464", color: "#fff" }}>
                  {initials(agent.name)}
                </div>
              )}

              {/* Tier badge */}
              <div className="mb-1 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest"
                style={{
                  background: isElite
                    ? "linear-gradient(135deg, #6b3d1e, #c98840)"
                    : "linear-gradient(135deg, #0b1f4a, #2040a0)",
                  color: "#fff",
                }}>
                {isElite ? "Elite" : "Platinum"}
              </div>
            </div>

            <h1 className="text-[22px] font-bold leading-tight" style={{ color: "var(--kk-ink)" }}>
              {agent.name ?? "kakisewa Agent"}
            </h1>
            {agent.agency && (
              <p className="text-[14px] mt-0.5 flex items-center gap-1.5" style={{ color: "var(--kk-ink-mute)" }}>
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                {agent.agency}
              </p>
            )}
            {agent.ren_number && (
              <p className="text-[13px] mt-1 flex items-center gap-1.5" style={{ color: "var(--kk-ink-faint)" }}>
                <Award className="w-3.5 h-3.5 shrink-0" />
                {agent.ren_number}
              </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              {[
                { label: "Deals closed", value: stats.dealCount },
                { label: "Active contracts", value: stats.activeContracts },
                { label: "Active listings", value: stats.activeListings },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "var(--kk-surface-2)" }}>
                  <p className="text-[22px] font-black tabular-nums" style={{ color: "var(--kk-ink)" }}>{s.value}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA */}
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-[15px] transition-all hover:opacity-90 active:scale-95"
                style={{ background: "var(--kk-whatsapp)", color: "#fff" }}
              >
                <MessageCircle className="w-5 h-5" />
                Chat on WhatsApp
              </a>
            ) : (
              <div className="mt-5 py-3.5 rounded-xl text-center text-[14px]" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-faint)" }}>
                Contact not available
              </div>
            )}
          </div>
        </div>

        {/* Powered by */}
        <p className="text-center mt-6 text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>
          Powered by{" "}
          <Link href="/" className="font-semibold" style={{ color: "var(--kk-ink-mute)" }}>
            kakisewa
          </Link>
          {isElite && (
            <span className="ml-1.5 inline-flex items-center gap-0.5">
              <Shield className="w-3 h-3" style={{ color: "var(--kk-ink-faint)" }} />
              Verified Elite agent
            </span>
          )}
        </p>
      </main>
    </div>
  );
}
