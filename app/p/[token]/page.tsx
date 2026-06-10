import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOwnerLeadByPropertyShareToken, getAgentProfileByUserId } from "@/lib/db";
import { PropertyPackClient } from "./client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const lead = await getOwnerLeadByPropertyShareToken(token);
  return {
    title: lead?.property_name ? `${lead.property_name} — kakisewa` : "Property details — kakisewa",
  };
}

interface Props {
  params: Promise<{ token: string }>;
}

export default async function PropertyPackPage({ params }: Props) {
  const { token } = await params;
  const lead = await getOwnerLeadByPropertyShareToken(token);
  if (!lead) return notFound();

  const agent = lead.user_id ? await getAgentProfileByUserId(lead.user_id).catch(() => null) : null;

  return (
    <PropertyPackClient
      lead={lead}
      propertyToken={token}
      agentName={agent?.name ?? null}
      agentAgency={agent?.agency ?? null}
    />
  );
}
