import { getAgentProfile, getProfileStats } from "@/lib/db";
import { ProfileSettingsClient } from "./client";
import type { ProfileStrengthItem, ProfileVerbatimItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const [agent, stats] = await Promise.all([getAgentProfile(), getProfileStats()]);

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
