import { headers } from "next/headers";
import { getAgentProfile } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getTotalCardCount } from "@/lib/plan-caps";
import { stripe } from "@/lib/stripe";
import { SubscriptionClient } from "./subscription-client";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const agent = await getAgentProfile();
  const hdrs = await headers();
  const isAdmin = hdrs.get("x-is-admin") === "true";

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

  // Credit from Stripe (applied balance) — only if user has a Stripe customer
  let creditBalanceMyr = 0;
  if (agent.stripe_customer_id) {
    try {
      const customer = await stripe.customers.retrieve(agent.stripe_customer_id);
      if (!("deleted" in customer) && customer.balance < 0) {
        creditBalanceMyr = Math.abs(customer.balance) / 100;
      }
    } catch {}
  }

  // Pending credit from referral_credits table — earned but not yet applied to Stripe
  // (referrer had no Stripe account when the referred user first paid)
  let pendingCreditMyr = 0;
  let totalCreditEarnedMyr = 0;
  if (user) {
    try {
      const svc = createServiceClient();
      const { data: allCredits } = await svc
        .from("referral_credits")
        .select("amount_myr, stripe_balance_transaction_id")
        .eq("referrer_user_id", user.id);
      totalCreditEarnedMyr = (allCredits ?? []).reduce(
        (sum: number, r: { amount_myr: number }) => sum + r.amount_myr,
        0
      ) / 100;
      if (!agent.stripe_customer_id) {
        pendingCreditMyr = (allCredits ?? [])
          .filter((r: { stripe_balance_transaction_id: string | null }) => r.stripe_balance_transaction_id === null)
          .reduce((sum: number, r: { amount_myr: number }) => sum + r.amount_myr, 0) / 100;
      }
    } catch {}
  }

  return (
    <SubscriptionClient
      isAdmin={isAdmin}
      status={status}
      trialDaysLeft={trialDaysLeft}
      currentPlan={currentPlan}
      subscriptionYear={subscriptionYear}
      currentCardCount={currentCardCount}
      referralCode={referralCode}
      referralCount={referralCount}
      creditBalanceMyr={creditBalanceMyr}
      pendingCreditMyr={pendingCreditMyr}
      totalCreditEarnedMyr={totalCreditEarnedMyr}
    />
  );
}
