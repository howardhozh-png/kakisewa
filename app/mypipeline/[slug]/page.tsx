import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getAgentByBoardSlug, getListedLeadsByUserId } from "@/lib/db";
import { PipelineBoardClient } from "./client";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const agent = await getAgentByBoardSlug(slug);
  if (!agent) return { title: "kakisewa" };
  return { title: `${agent.name ?? "Agent"}'s listings — kakisewa` };
}

export default async function PipelineBoardPage({ params }: Props) {
  const { slug } = await params;
  const agent = await getAgentByBoardSlug(slug);
  if (!agent || !agent.board_passcode) return notFound();

  const jar = await cookies();
  const cookieVal = jar.get(`kk_board_${slug}`)?.value ?? null;
  const isVerified = cookieVal === agent.board_passcode;

  const leads = isVerified ? await getListedLeadsByUserId(agent.id) : [];

  return (
    <PipelineBoardClient
      slug={slug}
      agentName={agent.name ?? "Agent"}
      isVerified={isVerified}
      leads={leads}
    />
  );
}
