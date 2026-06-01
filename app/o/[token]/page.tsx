import { notFound } from "next/navigation";
import { getOwnerLeadByIntakeToken, getAgentProfileByUserId } from "@/lib/db";
import { Logo } from "@/components/logo";
import { OwnerIntakeClient } from "./client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function OwnerIntakePage({ params }: Props) {
  const { token } = await params;
  const lead = await getOwnerLeadByIntakeToken(token);
  if (!lead) return notFound();

  const agent = lead.user_id ? await getAgentProfileByUserId(lead.user_id) : { name: null, agency: null };

  if (lead.intake_completed_at) {
    return (
      <div
        className="flex flex-col items-center justify-center h-dvh px-6 text-center gap-4"
        style={{ background: "#F2F2F7", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
          style={{ background: "#1C1C1E" }}
        >
          ✓
        </div>
        <p className="text-[18px] font-semibold" style={{ color: "#111" }}>Already submitted</p>
        <p className="text-[14px]" style={{ color: "#555" }}>
          This form has already been completed. Your agent will be in touch soon.
        </p>
        <div className="flex items-center gap-1.5 mt-4 opacity-40" style={{ color: "#1C1C1E" }}>
          <Logo size={14} />
          <span className="text-[11px] font-medium tracking-wide">kakisewa</span>
        </div>
      </div>
    );
  }

  return (
    <OwnerIntakeClient
      token={token}
      ownerName={lead.owner_name}
      agentName={agent.name ?? "Your Agent"}
      agentAgency={agent.agency ?? "kakisewa"}
    />
  );
}
