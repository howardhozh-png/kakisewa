import { notFound } from "next/navigation";
import { getTenantIntakeSession, getAgentProfile } from "@/lib/db";
import { TenantIntakeClient } from "./client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function TenantIntakePage({ params }: Props) {
  const { token } = await params;
  const [session, agent] = await Promise.all([
    getTenantIntakeSession(token),
    getAgentProfile(),
  ]);

  if (!session) return notFound();

  if (session.completed_at) {
    return (
      <div
        className="flex flex-col items-center justify-center h-dvh px-6 text-center gap-4"
        style={{ background: "#ECE5DD", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
          style={{ background: "#25D366" }}
        >
          ✓
        </div>
        <p className="text-[18px] font-semibold" style={{ color: "#111" }}>Already submitted</p>
        <p className="text-[14px]" style={{ color: "#555" }}>
          Your profile has been received. Your agent will be in touch with matching properties soon.
        </p>
      </div>
    );
  }

  return (
    <TenantIntakeClient
      token={token}
      agentName={agent.name ?? "Your Agent"}
      agentAgency={agent.agency ?? "kakisewa"}
      prefilledName={session.name ?? undefined}
    />
  );
}
