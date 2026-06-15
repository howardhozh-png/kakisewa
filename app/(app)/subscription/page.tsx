import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAgentProfile } from "@/lib/db";
import { SubscriptionClient } from "./subscription-client";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const agent = await getAgentProfile();
  const hdrs = await headers();
  const isAdmin = hdrs.get("x-is-admin") === "true";
  if (!isAdmin) redirect("/home");

  const status = (agent.subscription_status ?? null) as string | null;
  const trialEndsAt = agent.trial_ends_at ? new Date(agent.trial_ends_at) : null;
  const now = new Date();
  const trialDaysLeft = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86400000)
    : null;
  const currentPlan = agent.subscription_plan ?? null;

  return (
    <SubscriptionClient
      status={status}
      trialDaysLeft={trialDaysLeft}
      currentPlan={currentPlan}
    />
  );
}
