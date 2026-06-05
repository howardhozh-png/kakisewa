import { getAgentProfile } from "@/lib/db";
import { ProfileSettingsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const agent = await getAgentProfile();
  return (
    <div className="mx-auto max-w-[680px] px-4 py-8">
      <div className="mb-8">
        <p className="kk-overline mb-2">Public profile</p>
        <h1 className="serif kk-display" style={{ color: "var(--kk-ink)" }}>Edit agent profile</h1>
        <p className="kk-body-sm mt-2" style={{ color: "var(--kk-ink-mute)" }}>
          Customise how you appear to property owners who visit your profile link.
        </p>
      </div>
      <ProfileSettingsClient
        initialStrengths={(agent.profile_strengths as import("@/lib/types").ProfileStrengthItem[] | null) ?? null}
        initialVerbatim={(agent.profile_verbatim as import("@/lib/types").ProfileVerbatimItem[] | null) ?? null}
        agentId={String(agent.id)}
        agentName={agent.name ?? null}
        agentRen={agent.ren_number ?? null}
      />
    </div>
  );
}
