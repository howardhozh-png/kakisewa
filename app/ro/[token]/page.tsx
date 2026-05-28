import { notFound } from "next/navigation";
import { getTenancyByOwnerRenewalToken, getAgentProfile } from "@/lib/db";
import db from "@/lib/db-client";
import { OwnerRenewalClient } from "./client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function OwnerRenewalPage({ params }: Props) {
  const { token } = await params;
  const [tenancy, agent] = await Promise.all([
    getTenancyByOwnerRenewalToken(token),
    getAgentProfile(),
  ]);

  if (!tenancy) return notFound();

  const row = db
    .prepare("SELECT owner_renewal_completed_at FROM tenancies WHERE owner_renewal_token=?")
    .get(token) as { owner_renewal_completed_at: string | null } | undefined;

  return (
    <OwnerRenewalClient
      token={token}
      ownerName={tenancy.property?.owner_name ?? ""}
      propertyName={tenancy.property_name ?? "your property"}
      tenantName={tenancy.tenant_name}
      contractEnd={tenancy.contract_end ?? ""}
      currentRent={tenancy.amount}
      agentName={agent.name ?? "Your Agent"}
      agentAgency={agent.agency ?? ""}
      alreadySubmitted={!!row?.owner_renewal_completed_at}
      prevContinuing={tenancy.replied_owner === "yes" ? true : tenancy.replied_owner === "no" ? false : null}
      prevTenantIntent={(tenancy.owner_noted_tenant_intent as "yes" | "no" | "unsure" | null) ?? null}
      prevRent={tenancy.renewal_proposed_rent ?? null}
      prevStart={tenancy.renewal_proposed_start ?? null}
      prevMonths={tenancy.renewal_proposed_months ?? null}
    />
  );
}
