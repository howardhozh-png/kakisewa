import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { stripe, priceId, betaPriceId, type PlanId, type BillingInterval } from "@/lib/stripe";
import { TOTAL_CARD_CAP, getTotalCardCount } from "@/lib/plan-caps";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const { plan, interval, trialDaysLeft } = await req.json() as {
    plan: PlanId;
    interval: BillingInterval;
    trialDaysLeft?: number;
  };

  const hdrs = await headers();
  const userId = hdrs.get("x-user-id");
  const agentEmail = hdrs.get("x-agent-email") ?? undefined;

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: profile } = await admin
    .from("agent_profiles")
    .select("stripe_customer_id, stripe_subscription_id, subscription_status, subscription_year, name, is_beta_user")
    .eq("id", userId)
    .single();

  // Server-side card count guard — UI should already prevent this, but enforce here too
  const svc = createServiceClient();
  const totalCards = await getTotalCardCount(svc, userId);
  const planCap = TOTAL_CARD_CAP[plan] ?? 0;
  if (isFinite(planCap) && totalCards > planCap) {
    return NextResponse.json(
      { error: `card_count_exceeded`, current: totalCards, cap: planCap },
      { status: 422 }
    );
  }

  // ── Upgrade/downgrade existing active subscription ──
  if (profile?.stripe_subscription_id && profile?.subscription_status === "active") {
    const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const itemId = sub.items.data[0]?.id;
    if (!itemId) return NextResponse.json({ error: "Subscription item not found" }, { status: 400 });

    // Upgrades always use Y2 rate
    const upgradePriceId = priceId(plan, interval, 2);
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      items: [{ id: itemId, price: upgradePriceId }],
      proration_behavior: "create_prorations",
    });
    await admin.from("agent_profiles").update({ subscription_year: 2 }).eq("id", userId);

    return NextResponse.json({ upgraded: true });
  }

  // ── New subscription via Checkout Session ──
  let customerId: string = profile?.stripe_customer_id ?? "";
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: agentEmail,
      name: profile?.name ?? undefined,
      metadata: { supabase_user_id: userId },
    });
    customerId = customer.id;
    await admin.from("agent_profiles").update({ stripe_customer_id: customerId }).eq("id", userId);

    // Apply any pending referral credits earned before this user had a Stripe account
    const { data: pending } = await admin
      .from("referral_credits")
      .select("id, amount_myr")
      .eq("referrer_user_id", userId)
      .is("stripe_balance_transaction_id", null);

    if (pending && pending.length > 0) {
      for (const credit of pending as Array<{ id: string; amount_myr: number }>) {
        try {
          const txn = await stripe.customers.createBalanceTransaction(customerId, {
            amount: -credit.amount_myr, // negative = credit
            currency: "myr",
            description: "Pending referral credit applied at subscription start",
          });
          await admin
            .from("referral_credits")
            .update({ stripe_balance_transaction_id: txn.id })
            .eq("id", credit.id);
        } catch {
          // Non-fatal
        }
      }
    }
  }

  const trialDays = typeof trialDaysLeft === "number" && trialDaysLeft > 0 ? trialDaysLeft : undefined;

  // Beta users always pay their locked-in beta price regardless of interval sent
  const isBetaUser = !!(profile as { is_beta_user?: boolean } | null)?.is_beta_user;
  const newPriceId = isBetaUser ? betaPriceId(plan) : priceId(plan, interval, 1);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: newPriceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?cancelled=1`,
    metadata: { supabase_user_id: userId, plan, interval, billing_year: "1" },
    subscription_data: {
      metadata: { supabase_user_id: userId, plan, interval, billing_year: "1" },
      ...(trialDays ? { trial_period_days: trialDays } : {}),
    },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  });

  return NextResponse.json({ url: session.url });
}
