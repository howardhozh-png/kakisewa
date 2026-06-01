import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenancyByOwnerRenewalToken, getAgentProfileByUserId } from "@/lib/db";
import { OwnerRenewalClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "kakisewa",
  openGraph: { images: [] },
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function OwnerRenewalPage({ params }: Props) {
  const { token } = await params;
  const tenancy = await getTenancyByOwnerRenewalToken(token);
  if (!tenancy) return notFound();

  const agent = tenancy.user_id
    ? await getAgentProfileByUserId(tenancy.user_id)
    : { name: null, agency: null, photo_url: null };

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
      agentPhotoUrl={agent.photo_url ?? null}
      alreadySubmitted={!!tenancy.owner_renewal_completed_at}
      prevContinuing={tenancy.replied_owner === "yes" ? true : tenancy.replied_owner === "no" ? false : null}
      prevTenantIntent={(tenancy.owner_noted_tenant_intent as "yes" | "no" | "unsure" | null) ?? null}
      prevRent={tenancy.renewal_proposed_rent ?? null}
      prevStart={tenancy.renewal_proposed_start ?? null}
      prevMonths={tenancy.renewal_proposed_months ?? null}
    />
  );
}
