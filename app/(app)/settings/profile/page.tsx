import { getAgentProfile } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { ProfileSettingsClient } from "./client";
import type { ProfileStrengthItem, ProfileVerbatimItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const agent = await getAgentProfile();

  const supabase = await createClient();
  const [dealsRes, tenantsRes, listingsRes] = await Promise.all([
    supabase.from("commission_events").select("*", { count: "exact", head: true }).eq("user_id", agent.id),
    supabase.from("tenancies").select("*", { count: "exact", head: true }).eq("user_id", agent.id).neq("lifecycle_stage", "closed"),
    supabase.from("owner_leads").select("*", { count: "exact", head: true }).eq("user_id", agent.id).in("stage", ["listed", "matched"]),
  ]);

  const stats = {
    dealCount: dealsRes.count ?? 0,
    activeContracts: tenantsRes.count ?? 0,
    activeListings: listingsRes.count ?? 0,
  };

  return (
    <div className="mx-auto max-w-[600px] px-4 py-8">
      <div className="mb-6">
        <p className="kk-overline mb-2">Profile</p>
        <h1 className="serif kk-display" style={{ color: "var(--kk-ink)" }}>Agent profile</h1>
        <p className="kk-body-sm mt-2" style={{ color: "var(--kk-ink-mute)" }}>
          Customise how you appear to property owners who visit your profile link.
        </p>
      </div>
      <ProfileSettingsClient
        initialStrengths={(agent.profile_strengths as ProfileStrengthItem[] | null) ?? null}
        initialVerbatim={(agent.profile_verbatim as ProfileVerbatimItem[] | null) ?? null}
        agentId={String(agent.id)}
        agentName={agent.name ?? null}
        agentRen={agent.ren_number ?? null}
        agentAgency={agent.agency ?? null}
        agentPhoto={agent.photo_url ?? null}
        agentPhone={agent.phone ?? null}
        subscriptionPlan={agent.subscription_plan ?? null}
        stats={stats}
      />
    </div>
  );
}
