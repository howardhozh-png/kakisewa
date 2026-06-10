import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenancyByTenantRenewalToken, getAgentProfileByUserId } from "@/lib/db";
import { TenantRenewalClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "kakisewa",
  
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function TenantRenewalPage({ params }: Props) {
  const { token } = await params;
  const tenancy = await getTenancyByTenantRenewalToken(token);
  if (!tenancy) return notFound();

  const agent = tenancy.user_id
    ? await getAgentProfileByUserId(tenancy.user_id)
    : { name: null, agency: null, photo_url: null };

  if (tenancy.tenant_renewal_completed_at) {
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
          Thanks for responding. Your agent will be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <TenantRenewalClient
      token={token}
      tenantName={tenancy.tenant_name ?? ""}
      propertyName={tenancy.property_name ?? "your property"}
      contractEnd={tenancy.contract_end ?? ""}
      agentName={agent.name ?? "Your Agent"}
      agentAgency={agent.agency ?? ""}
    />
  );
}
