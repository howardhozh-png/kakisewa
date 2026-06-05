import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Building2, Award, Shield, Star, CheckCircle } from "lucide-react";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ firstName: string; ren: string }>;
}

interface AgentRow {
  id: string;
  name: string | null;
  agency: string | null;
  photo_url: string | null;
  ren_number: string | null;
  phone: string | null;
  subscription_plan: "silver" | "platinum" | "elite" | null;
  subscription_status: string | null;
}

async function getPublicAgentByRen(ren: string): Promise<AgentRow | null> {
  const supabase = createServiceClient();
  const decoded = decodeURIComponent(ren);
  const { data } = await supabase
    .from("agent_profiles")
    .select("id, name, agency, photo_url, ren_number, phone, subscription_plan, subscription_status")
    .ilike("ren_number", decoded)
    .maybeSingle();
  return data as AgentRow | null;
}

async function getAgentStats(userId: string) {
  const supabase = createServiceClient();
  const [dealsRes, tenantsRes, listingsRes, renewalRes] = await Promise.all([
    supabase.from("commission_events").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("tenancies").select("*", { count: "exact", head: true }).eq("user_id", userId).neq("lifecycle_stage", "closed"),
    supabase.from("owner_leads").select("*", { count: "exact", head: true }).eq("user_id", userId).in("stage", ["listed", "matched"]),
    supabase.from("commission_events").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("type", "renewal"),
  ]);
  return {
    dealCount:       dealsRes.count ?? 0,
    activeContracts: tenantsRes.count ?? 0,
    activeListings:  listingsRes.count ?? 0,
    renewalCount:    renewalRes.count ?? 0,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ren } = await params;
  const agent = await getPublicAgentByRen(ren);
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

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className="w-3 h-3"
          fill={i < value ? "#f59e0b" : "transparent"}
          style={{ color: i < value ? "#f59e0b" : "#D1D1D6" }}
        />
      ))}
    </div>
  );
}

function deriveStrengths(stats: Awaited<ReturnType<typeof getAgentStats>>) {
  return [
    {
      label: "Contract management",
      rating: Math.min(5, Math.max(1, Math.floor(stats.activeContracts / 2) + 1)),
      detail: `${stats.activeContracts} active tenancies managed`,
    },
    {
      label: "Deal closing",
      rating: Math.min(5, Math.max(1, stats.dealCount > 20 ? 5 : stats.dealCount > 10 ? 4 : stats.dealCount > 5 ? 3 : stats.dealCount > 2 ? 2 : 1)),
      detail: `${stats.dealCount} deals closed to date`,
    },
    {
      label: "Renewal track record",
      rating: Math.min(5, Math.max(1, stats.renewalCount > 10 ? 5 : stats.renewalCount > 5 ? 4 : stats.renewalCount > 2 ? 3 : stats.renewalCount > 0 ? 2 : 1)),
      detail: `${stats.renewalCount} renewals successfully handled`,
    },
    {
      label: "Owner network",
      rating: Math.min(5, Math.max(1, stats.activeListings > 10 ? 5 : stats.activeListings > 5 ? 4 : stats.activeListings > 2 ? 3 : stats.activeListings > 0 ? 2 : 1)),
      detail: `${stats.activeListings} active owner listings`,
    },
  ];
}

const SAMPLE_TESTIMONIALS = [
  {
    name: "Encik Hafiz",
    role: "Property owner · Cheras",
    quote: "Very responsive and kept me updated throughout the entire process. Found a reliable tenant within 2 weeks.",
    avatar: "H",
  },
  {
    name: "Puan Suraya",
    role: "Landlord · Petaling Jaya",
    quote: "Handled the renewal negotiation smoothly. I didn't have to deal with the tenant directly at all.",
    avatar: "S",
  },
];

export default async function AgentProfilePage({ params }: Props) {
  const { ren } = await params;
  const agent = await getPublicAgentByRen(ren);

  if (!agent) notFound();

  const isActive = agent.subscription_status === "active" || agent.subscription_status === "trial";
  const plan = agent.subscription_plan;
  const isElite = plan === "elite";
  const isPlatinum = plan === "platinum";

  if (!isActive || (!isElite && !isPlatinum)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#F2F2F7" }}>
        <div className="text-center max-w-sm">
          <p className="text-[14px]" style={{ color: "#6C6C70" }}>This agent profile is not publicly available.</p>
          <Link href="/" className="mt-4 inline-block text-[13px] font-semibold" style={{ color: "#007AFF" }}>
            Back to kakisewa
          </Link>
        </div>
      </div>
    );
  }

  const stats = await getAgentStats(agent.id);
  const strengths = deriveStrengths(stats);
  const waUrl = agent.phone
    ? `https://wa.me/${normalisePhone(agent.phone)}?text=${encodeURIComponent(`Hi ${agent.name ?? "there"}, I found your profile on kakisewa and would like to inquire about a property.`)}`
    : null;

  const tierGradient = isElite
    ? "linear-gradient(135deg, #6b3d1e 0%, #c98840 50%, #6b3d1e 100%)"
    : "linear-gradient(135deg, #0b1f4a 0%, #2040a0 50%, #0b1f4a 100%)";

  const tierLabel = isElite ? "Elite" : "Platinum";
  const tierAccent = isElite ? "#c98840" : "#2040a0";

  return (
    <div className="min-h-screen" style={{ background: "#F2F2F7" }}>
      {/* Inline shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .profile-card {
          transition: box-shadow 0.3s ease, transform 0.3s ease;
        }
        .profile-card:hover {
          box-shadow: 0 16px 64px rgba(0,0,0,0.12);
          transform: translateY(-2px);
        }
        .strength-bar-fill {
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#fff" }}>
        <div className="mx-auto max-w-[600px] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={24} />
            <span className="font-semibold text-[16px]" style={{ color: "#1C1C1E", letterSpacing: "-0.01em" }}>kakisewa</span>
            <span className="ml-2 text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#AEAEB2" }}>
              Agent Profile
            </span>
          </div>
          {!isElite && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: "#F2F2F7", color: "#8E8E93" }}>
              Private
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[600px] px-4 py-8 space-y-4">

        {/* Main profile card */}
        <div className="profile-card rounded-3xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          {/* Gradient banner with shimmer */}
          <div style={{ height: 120, background: tierGradient, backgroundSize: "200% auto", animation: "shimmer 4s linear infinite", position: "relative" }}>
            {/* Tier badge overlaid on banner */}
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest"
              style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}>
              {isElite && <Shield className="w-3 h-3 inline mr-1" />}
              {tierLabel}
            </div>
          </div>

          {/* Avatar + info */}
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-12 mb-4">
              {agent.photo_url ? (
                <img
                  src={agent.photo_url}
                  alt={agent.name ?? "Agent"}
                  width={88} height={88}
                  style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", border: "4px solid #fff", display: "block", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", flexShrink: 0 }}
                />
              ) : (
                <div className="shrink-0 flex items-center justify-center text-[26px] font-black"
                  style={{ width: 88, height: 88, borderRadius: "50%", background: tierGradient, backgroundSize: "200% auto", animation: "shimmer 4s linear infinite", border: "4px solid #fff", color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                  {initials(agent.name)}
                </div>
              )}
              <div className="pb-1">
                {/* Trust badge */}
                <div className="flex items-center gap-1 mb-2">
                  <CheckCircle className="w-3.5 h-3.5" style={{ color: tierAccent }} />
                  <span className="text-[11px] font-semibold" style={{ color: tierAccent }}>Verified {tierLabel} Agent</span>
                </div>
              </div>
            </div>

            <h1 className="text-[24px] font-black leading-tight" style={{ color: "#1C1C1E", letterSpacing: "-0.02em" }}>
              {agent.name ?? "kakisewa Agent"}
            </h1>

            <div className="mt-2 space-y-1">
              {agent.agency && (
                <p className="text-[14px] flex items-center gap-2" style={{ color: "#6C6C70" }}>
                  <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#AEAEB2" }} />
                  {agent.agency}
                </p>
              )}
              {agent.ren_number && (
                <p className="text-[13px] flex items-center gap-2" style={{ color: "#8E8E93" }}>
                  <Award className="w-3.5 h-3.5 shrink-0" style={{ color: "#AEAEB2" }} />
                  {agent.ren_number}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              {[
                { label: "Deals closed", value: stats.dealCount },
                { label: "Active contracts", value: stats.activeContracts },
                { label: "Active listings", value: stats.activeListings },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: "#F2F2F7" }}>
                  <p className="text-[26px] font-black tabular-nums" style={{ color: "#1C1C1E" }}>{s.value}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: "#AEAEB2" }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            {/* WhatsApp CTA */}
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-bold text-[16px] transition-all active:scale-95"
                style={{ background: "#25D366", color: "#fff", boxShadow: "0 4px 16px rgba(37,211,102,0.35)" }}
              >
                <MessageCircle className="w-5 h-5" />
                Chat on WhatsApp
              </a>
            ) : (
              <div className="mt-5 py-4 rounded-2xl text-center text-[14px]" style={{ background: "#F2F2F7", color: "#AEAEB2" }}>
                Contact not available
              </div>
            )}
          </div>
        </div>

        {/* Strengths card */}
        <div className="rounded-3xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div className="px-6 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: "#AEAEB2" }}>
              Strengths
            </p>
            <div className="space-y-4">
              {strengths.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: "#1C1C1E" }}>{s.label}</p>
                      <p className="text-[11px]" style={{ color: "#8E8E93" }}>{s.detail}</p>
                    </div>
                    <StarRating value={s.rating} />
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 4, background: "#F2F2F7" }}>
                    <div className="strength-bar-fill h-full rounded-full"
                      style={{ width: `${(s.rating / 5) * 100}%`, background: s.rating >= 4 ? "#25D366" : s.rating >= 3 ? "#f59e0b" : "#AEAEB2" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Owner testimonials */}
        <div className="rounded-3xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div className="px-6 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: "#AEAEB2" }}>
              What owners say
            </p>
            <div className="space-y-4">
              {SAMPLE_TESTIMONIALS.map((t) => (
                <div key={t.name} className="rounded-2xl p-4" style={{ background: "#F2F2F7" }}>
                  {/* Quote mark */}
                  <p className="text-[32px] leading-none font-black mb-2" style={{ color: "#D1D1D6" }}>&ldquo;</p>
                  <p className="text-[14px] leading-relaxed mb-3" style={{ color: "#1C1C1E" }}>
                    {t.quote}
                  </p>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                      style={{ background: tierGradient, backgroundSize: "200% auto", color: "#fff" }}>
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold" style={{ color: "#1C1C1E" }}>{t.name}</p>
                      <p className="text-[11px]" style={{ color: "#8E8E93" }}>{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trusted by badge */}
        <div className="rounded-3xl overflow-hidden px-6 py-5 flex items-center gap-4"
          style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          {/* Asian agent avatars stack */}
          <div className="flex -space-x-2 shrink-0">
            {["#1C1C1E", "#3A3A3C", "#48484A", "#636366"].map((bg, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold"
                style={{ background: bg, color: "#fff", zIndex: 4 - i }}>
                {["HC", "LM", "RN", "KS"][i]}
              </div>
            ))}
          </div>
          <div>
            <p className="text-[14px] font-bold" style={{ color: "#1C1C1E" }}>Trusted by 80,000+ agents</p>
            <p className="text-[12px]" style={{ color: "#8E8E93" }}>kakisewa is Malaysia&apos;s #1 property management platform</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center py-2 text-[12px]" style={{ color: "#AEAEB2" }}>
          Powered by{" "}
          <Link href="/" className="font-semibold" style={{ color: "#6C6C70" }}>
            kakisewa
          </Link>
          {isElite && (
            <span className="ml-1.5 inline-flex items-center gap-0.5">
              <Shield className="w-3 h-3" style={{ color: "#AEAEB2" }} />
              Verified Elite agent
            </span>
          )}
        </p>
      </main>
    </div>
  );
}
