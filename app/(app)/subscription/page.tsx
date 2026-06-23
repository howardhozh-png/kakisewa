import { headers } from "next/headers";
import { getAgentProfile } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { getTotalCardCount } from "@/lib/plan-caps";
import { stripe } from "@/lib/stripe";
import { SubscriptionClient } from "./subscription-client";
import { FeatureLockedState } from "@/components/feature-locked-state";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const agent = await getAgentProfile();
  const hdrs = await headers();
  const isAdmin = hdrs.get("x-is-admin") === "true";
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FeatureLockedState
          title="Subscription"
          body="This area is only accessible to admins. Contact your account administrator for access."
          ctaLabel="Go to home"
          ctaHref="/home"
        />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const status = (agent.subscription_status ?? null) as string | null;
  const trialEndsAt = agent.trial_ends_at ? new Date(agent.trial_ends_at) : null;
  const now = new Date();
  const trialDaysLeft = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86400000)
    : null;
  const currentPlan = agent.subscription_plan ?? null;
  const subscriptionYear = ((agent.subscription_year ?? 1) as number) as 1 | 2;
  const referralCode = agent.referral_slug ?? null;

  let referralCount = 0;
  if (referralCode) {
    const { count } = await supabase
      .from("agent_profiles")
      .select("id", { count: "exact", head: true })
      .eq("referred_by_slug", referralCode);
    referralCount = count ?? 0;
  }

  const currentCardCount = user ? await getTotalCardCount(supabase, user.id) : 0;

  let creditBalanceMyr = 0;
  if (agent.stripe_customer_id) {
    try {
      const customer = await stripe.customers.retrieve(agent.stripe_customer_id);
      if (!("deleted" in customer) && customer.balance < 0) {
        creditBalanceMyr = Math.abs(customer.balance) / 100;
      }
    } catch {}
  }

  return (
    <SubscriptionClient
      status={status}
      trialDaysLeft={trialDaysLeft}
      currentPlan={currentPlan}
      subscriptionYear={subscriptionYear}
      currentCardCount={currentCardCount}
      referralCode={referralCode}
      referralCount={referralCount}
      creditBalanceMyr={creditBalanceMyr}
    />
  );
}
