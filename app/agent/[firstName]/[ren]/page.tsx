import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Building2, Award } from "lucide-react";
import { Logo } from "@/components/logo";
import type { ProfileStrengthItem, ProfileVerbatimItem } from "@/lib/types";

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
  profile_strengths: ProfileStrengthItem[] | null;
  profile_verbatim: ProfileVerbatimItem[] | null;
}

async function getPublicAgentByRen(ren: string): Promise<AgentRow | null> {
  const supabase = createServiceClient();
  const decoded = decodeURIComponent(ren);
  const { data } = await supabase
    .from("agent_profiles")
    .select("id, name, agency, photo_url, ren_number, phone, subscription_plan, subscription_status, profile_strengths, profile_verbatim")
    .ilike("ren_number", decoded)
    .maybeSingle();
  return data as AgentRow | null;
}

async function getAgentStats(userId: string) {
  const supabase = createServiceClient();
  const [dealsRes, tenantsRes, listingsRes] = await Promise.all([
    supabase.from("commission_events").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("tenancies").select("*", { count: "exact", head: true }).eq("user_id", userId).neq("lifecycle_stage", "closed"),
    supabase.from("owner_leads").select("*", { count: "exact", head: true }).eq("user_id", userId).in("stage", ["listed", "matched"]),
  ]);
  return {
    dealCount:       dealsRes.count ?? 0,
    activeContracts: tenantsRes.count ?? 0,
    activeListings:  listingsRes.count ?? 0,
  };
}

function statRange(n: number): string {
  if (n < 10)  return "<10";
  const lo = Math.floor(n / 10) * 10;
  return `${lo}-${lo + 10}`;
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

// Half-star display (server-rendered SVG)
function StarDisplay({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = rating >= i + 1 ? 1 : rating >= i + 0.5 ? 0.5 : 0;
        const id = `s${i}${Math.random().toString(36).slice(2, 6)}`;
        return (
          <svg key={i} width="16" height="16" viewBox="0 0 20 20">
            {filled === 0.5 && (
              <defs>
                <clipPath id={id}><rect x="0" y="0" width="10" height="20" /></clipPath>
              </defs>
            )}
            <path d="M10 1.5l2.5 5 5.5.8-4 3.9.95 5.5L10 14.2l-4.95 2.5.95-5.5-4-3.9 5.5-.8z" fill="#E5E7EB" />
            {filled > 0 && (
              <path d="M10 1.5l2.5 5 5.5.8-4 3.9.95 5.5L10 14.2l-4.95 2.5.95-5.5-4-3.9 5.5-.8z"
                fill="#f59e0b" clipPath={filled === 0.5 ? `url(#${id})` : undefined} />
            )}
          </svg>
        );
      })}
    </div>
  );
}

// Default strengths if agent hasn't customised yet
function seededShuffle(arr: string[], seed: string): string[] {
  const s = seed.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
  const copy = [...arr];
  let r = Math.abs(s);
  for (let i = copy.length - 1; i > 0; i--) {
    r = (r * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(r) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const STRENGTH_POOL = ["Responsive","Handles tenants well","End-to-end service","Clear communicator","Renewal specialist","Quick to act","Trusted by owners","Strong negotiator"];

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
  const waUrl = agent.phone
    ? `https://wa.me/${normalisePhone(agent.phone)}?text=${encodeURIComponent(`Hi ${agent.name ?? "there"}, I found your profile on kakisewa and would like to inquire about a property.`)}`
    : null;

  const tierGradient = isElite
    ? "linear-gradient(135deg, #6b3d1e 0%, #c98840 50%, #6b3d1e 100%)"
    : "linear-gradient(135deg, #0b1f4a 0%, #2040a0 50%, #0b1f4a 100%)";

  const tierLabel = isElite ? "Elite" : "Platinum";

  // Strengths: use agent's saved, or default (top 3 from shuffled pool)
  const strengths: ProfileStrengthItem[] = agent.profile_strengths?.slice(0, 3) ??
    seededShuffle(STRENGTH_POOL, agent.id).slice(0, 3).map(label => ({ label, rating: 4 }));

  const verbatim: ProfileVerbatimItem[] = agent.profile_verbatim?.slice(0, 3) ?? [];

  return (
    <div className="min-h-screen" style={{ background: "#F2F2F7" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .profile-card { transition: box-shadow 0.3s ease, transform 0.3s ease; }
        .profile-card:hover { box-shadow: 0 16px 64px rgba(0,0,0,0.12); transform: translateY(-2px); }
      `}</style>

      {/* Header — matches platform style */}
      <header style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#fff" }}>
        <div className="mx-auto max-w-[600px] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3" style={{ color: "#1C1C1E" }}>
            <Logo variant="wordmark" size={22} />
            <span className="text-[10px] font-semibold uppercase tracking-widest pl-3"
              style={{ color: "#AEAEB2", borderLeft: "1px solid rgba(0,0,0,0.12)" }}>
              Verified agent profile
            </span>
          </div>
          {!isElite && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full"
              style={{ background: "#F2F2F7", color: "#8E8E93" }}>Private</span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[600px] px-4 py-8 space-y-4">

        {/* Main profile card — avatar is OUTSIDE overflow-hidden */}
        <div className="profile-card rounded-3xl" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          {/* Banner */}
          <div className="rounded-t-3xl relative" style={{ height: 110, background: tierGradient, backgroundSize: "200% auto", animation: "shimmer 4s linear infinite" }}>
            {/* Tier badge */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest"
              style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)" }}>
              {tierLabel}
            </div>
            {/* Avatar — sits on banner/card boundary, NOT inside overflow-hidden */}
            <div style={{ position: "absolute", bottom: -44, left: 24 }}>
              {agent.photo_url ? (
                <img src={agent.photo_url} alt={agent.name ?? "Agent"} width={88} height={88}
                  style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", border: "4px solid #fff", display: "block", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }} />
              ) : (
                <div style={{ width: 88, height: 88, borderRadius: "50%", background: tierGradient, backgroundSize: "200% auto", border: "4px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                  {initials(agent.name)}
                </div>
              )}
            </div>
          </div>

          {/* Card body */}
          <div className="px-6 pb-6" style={{ paddingTop: 56 }}>
            <h1 className="text-[24px] font-black leading-tight mb-1" style={{ color: "#1C1C1E", letterSpacing: "-0.02em" }}>
              {agent.name ?? "kakisewa Agent"}
            </h1>

            <div className="space-y-1 mb-5">
              {agent.agency && (
                <p className="text-[14px] flex items-center gap-2" style={{ color: "#6C6C70" }}>
                  <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#AEAEB2" }} />
                  {agent.agency}
                </p>
              )}
              <div className="flex items-center gap-3">
                {agent.ren_number && (
                  <p className="text-[13px] flex items-center gap-1.5" style={{ color: "#8E8E93" }}>
                    <Award className="w-3.5 h-3.5 shrink-0" style={{ color: "#AEAEB2" }} />
                    {agent.ren_number}
                  </p>
                )}
                {/* WA icon — small, inline with REN */}
                {waUrl && (
                  <a href={waUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center w-7 h-7 rounded-full transition-opacity hover:opacity-80"
                    style={{ background: "#25D366", color: "#fff" }}
                    title="Chat on WhatsApp">
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Deals closed",     value: statRange(stats.dealCount) },
                { label: "Active contracts", value: statRange(stats.activeContracts) },
                { label: "Active listings",  value: statRange(stats.activeListings) },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: "#F2F2F7" }}>
                  <p className="text-[22px] font-black tabular-nums" style={{ color: "#1C1C1E" }}>{s.value}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: "#AEAEB2" }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
            {/* kakisewa watermark — inside card so screenshots can't crop it out */}
            <div className="mt-5 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ color: "#AEAEB2" }}>
                <Logo variant="wordmark" size={14} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#AEAEB2" }}>Verified agent</span>
            </div>
          </div>
        </div>

        {/* Strengths */}
        <div className="rounded-3xl" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div className="px-6 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: "#AEAEB2" }}>
              Strengths
            </p>
            <div className="space-y-4">
              {strengths.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[14px] font-semibold" style={{ color: "#1C1C1E" }}>{s.label}</p>
                    <StarDisplay rating={s.rating} />
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 4, background: "#F2F2F7" }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${(s.rating / 5) * 100}%`, background: s.rating >= 4 ? "#25D366" : s.rating >= 3 ? "#f59e0b" : "#AEAEB2" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Verbatim */}
        {verbatim.length > 0 && (
          <div className="rounded-3xl" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div className="px-6 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: "#AEAEB2" }}>
                Verbatim
              </p>
              <div className="space-y-4">
                {verbatim.map((v, i) => (
                  <div key={i} className="rounded-2xl p-4" style={{ background: "#F2F2F7" }}>
                    <p className="text-[32px] leading-none font-black mb-2" style={{ color: "#D1D1D6" }}>&ldquo;</p>
                    <p className="text-[14px] leading-relaxed mb-3" style={{ color: "#1C1C1E" }}>{v.quote}</p>
                    <div className="flex items-center gap-2.5">
                      {/* White avatar circle */}
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                        style={{ background: "#fff", color: "#1C1C1E", border: "1px solid rgba(0,0,0,0.08)" }}>
                        {(v.ownerName || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold" style={{ color: "#1C1C1E" }}>{v.ownerName}</p>
                        <p className="text-[11px]" style={{ color: "#8E8E93" }}>{v.ownerRole}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Trusted by badge */}
        <div className="rounded-3xl px-5 py-4 flex items-center gap-4"
          style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div className="flex -space-x-2 shrink-0">
            {["#1C1C1E","#3A3A3C","#48484A","#636366"].map((bg, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold"
                style={{ background: bg, color: "#fff", zIndex: 4 - i }}>
                {["HC","LM","RN","KS"][i]}
              </div>
            ))}
          </div>
          <div>
            <p className="text-[14px] font-bold" style={{ color: "#1C1C1E" }}>Trusted by 15,000+ agents today</p>
            <p className="text-[12px]" style={{ color: "#8E8E93" }}>Malaysia&apos;s #1 property management platform</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center py-2 text-[12px]" style={{ color: "#AEAEB2" }}>
          Powered by{" "}
          <Link href="/" className="font-semibold" style={{ color: "#6C6C70" }}>kakisewa</Link>
        </p>
      </main>
    </div>
  );
}
