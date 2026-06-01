import { headers } from "next/headers";
import { getAgentProfile } from "@/lib/db";
import { SubscriptionClient } from "./subscription-client";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const agent = await getAgentProfile();
  const hdrs = await headers();
  const isAdmin = hdrs.get("x-is-admin") === "true";

  const status = (agent.subscription_status ?? null) as string | null;
  const trialEndsAt = agent.trial_ends_at ? new Date(agent.trial_ends_at) : null;
  const now = new Date();
  const trialDaysLeft = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86400000)
    : null;
  // subscription_plan written by Stripe webhook — not yet in generated types
  const currentPlan = ((agent as Record<string, unknown>).subscription_plan as string | null) ?? null;

  return (
    <SubscriptionClient
      status={isAdmin ? "active" : status}
      trialDaysLeft={isAdmin ? null : trialDaysLeft}
      currentPlan={currentPlan}
    />
  );
}
