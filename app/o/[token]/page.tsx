import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOwnerLeadByIntakeToken, getAgentProfileByUserId } from "@/lib/db";
import { Logo } from "@/components/logo";
import { OwnerIntakeClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "kakisewa",
  
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function OwnerIntakePage({ params }: Props) {
  const { token } = await params;
  const lead = await getOwnerLeadByIntakeToken(token);
  if (!lead) return notFound();

  const agent = lead.user_id ? await getAgentProfileByUserId(lead.user_id) : { name: null, agency: null, photo_url: null };

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
        <div className="flex items-center gap-3 mt-6 px-4 py-3 rounded-2xl" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="flex -space-x-2 shrink-0">
            {["#1C1C1E","#3A3A3C","#48484A","#636366"].map((bg,i) => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold"
                style={{ background: bg, color: "#fff", zIndex: 4 - i }}>
                {["HC","LM","RN","KS"][i]}
              </div>
            ))}
          </div>
          <p className="text-[12px] font-semibold" style={{ color: "#1C1C1E" }}>
            Trusted by 80,000+ agents on kakisewa
          </p>
        </div>
      </div>
    );
  }

  return (
    <OwnerIntakeClient
      token={token}
      agentName={agent.name ?? "Your Agent"}
      agentAgency={agent.agency ?? "kakisewa"}
      agentPhotoUrl={agent.photo_url ?? null}
    />
  );
}
