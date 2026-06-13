import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

const PLAN_FROM_PRICE: Record<string, string> = {
  [process.env.STRIPE_PRICE_SILVER_MONTHLY!]:   "silver",
  [process.env.STRIPE_PRICE_SILVER_ANNUAL!]:    "silver",
  [process.env.STRIPE_PRICE_GOLD_MONTHLY!]:     "gold",
  [process.env.STRIPE_PRICE_GOLD_ANNUAL!]:      "gold",
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

  // Idempotency: skip events we've already processed
  const { data: existing } = await admin
    .from("processed_stripe_events")
    .select("event_id")
    .eq("event_id", event.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ received: true });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.supabase_user_id;
    if (userId && session.subscription) {
      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = sub.items.data[0]?.price.id ?? "";
      // If Stripe subscription is still in trial (card saved, not yet charged),
      // keep our DB status as "trial" and sync the trial end date from Stripe.
      // "active" is only set once Stripe charges them (handled by subscription.updated).
      const isStripeTrial = sub.status === "trialing";
      const updates: Record<string, unknown> = {
        stripe_subscription_id: sub.id,
        stripe_price_id: priceId,
        subscription_plan: PLAN_FROM_PRICE[priceId] ?? session.metadata?.plan,
        subscription_interval: session.metadata?.interval,
        subscription_status: isStripeTrial ? "trial" : "active",
      };
      if (isStripeTrial && sub.trial_end) {
        updates.trial_ends_at = new Date(sub.trial_end * 1000).toISOString();
      }
      await admin.from("agent_profiles").update(updates).eq("id", userId);
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
        stripe_subscription_id: sub.id,
        stripe_price_id: priceId,
        subscription_plan: PLAN_FROM_PRICE[priceId],
        subscription_status: status,
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
    const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    if (customerId) {
      const { data: profile } = await admin
        .from("agent_profiles")
        .select("id, name")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (profile) {
        const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
        const user = (users ?? []).find((u: { id: string }) => u.id === profile.id);
        const email = user?.email;
        const firstName = (profile.name ?? "").split(" ")[0] || "there";
        const resendKey = process.env.RESEND_API_KEY;
        if (email && resendKey) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "kakisewa <noreply@kakisewa.com>",
              to: [email],
              subject: "Payment failed — please update your card",
              html: `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
  <p style="font-size:22px;font-weight:700;letter-spacing:-0.02em;margin:0 0 24px">kakisewa</p>
  <h1 style="font-size:18px;font-weight:600;margin:0 0 8px">Hi ${firstName}, your payment didn't go through</h1>
  <p style="font-size:14px;color:#6C6C70;margin:0 0 24px">
    We couldn't process your subscription payment. Please update your payment method to keep your account active.
  </p>
  <a href="https://www.kakisewa.com/subscription"
    style="display:inline-block;background:#DC2626;color:#fff;font-size:14px;font-weight:600;
           padding:12px 24px;border-radius:10px;text-decoration:none">
    Update payment method
  </a>
  <p style="font-size:12px;color:#AEAEB2;margin:24px 0 0">
    If you think this is a mistake, reply to this email and we'll sort it out.
  </p>
</div>`,
            }),
          });
        }
      }
    }
  }

  // Mark event as processed
  await admin.from("processed_stripe_events").insert({ event_id: event.id });

  return NextResponse.json({ received: true });
}
