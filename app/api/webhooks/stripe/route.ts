import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

const PLAN_FROM_PRICE: Record<string, string> = {
  [process.env.STRIPE_PRICE_SILVER_MONTHLY!]:   "silver",
  [process.env.STRIPE_PRICE_SILVER_ANNUAL!]:    "silver",
  [process.env.STRIPE_PRICE_PLATINUM_MONTHLY!]: "platinum",
  [process.env.STRIPE_PRICE_PLATINUM_ANNUAL!]:  "platinum",
  [process.env.STRIPE_PRICE_ELITE_MONTHLY!]:    "elite",
  [process.env.STRIPE_PRICE_ELITE_ANNUAL!]:     "elite",
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${err}` }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.supabase_user_id;
    if (userId && session.subscription) {
      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = sub.items.data[0]?.price.id ?? "";
      await admin.from("agent_profiles").update({
        stripe_subscription_id: sub.id,
        stripe_price_id: priceId,
        subscription_plan: PLAN_FROM_PRICE[priceId] ?? session.metadata?.plan,
        subscription_interval: session.metadata?.interval,
        subscription_status: "active",
        subscription_current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      }).eq("id", userId);
    }
  }

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.supabase_user_id;
    const priceId = sub.items.data[0]?.price.id ?? "";
    const status = sub.status === "active" ? "active"
      : sub.status === "canceled" ? "cancelled"
      : sub.status === "past_due" ? "expired"
      : sub.status;
    if (userId) {
      await admin.from("agent_profiles").update({
        stripe_price_id: priceId,
        subscription_plan: PLAN_FROM_PRICE[priceId],
        subscription_status: status,
        subscription_current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      }).eq("id", userId);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.supabase_user_id;
    if (userId) {
      await admin.from("agent_profiles").update({
        subscription_status: "cancelled",
        stripe_subscription_id: null,
      }).eq("id", userId);
    }
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const sub = invoice.subscription ? await stripe.subscriptions.retrieve(invoice.subscription as string) : null;
    const userId = sub?.metadata?.supabase_user_id;
    if (userId) {
      await admin.from("agent_profiles").update({ subscription_status: "expired" }).eq("id", userId);
    }
  }

  return NextResponse.json({ received: true });
}
