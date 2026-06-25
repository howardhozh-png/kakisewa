import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe, planFromPriceId, ALL_PRICE_IDS, priceId } from "@/lib/stripe";
import { PLAN_CONFIG, minimumPlanFor } from "@/lib/plans";
import { getTotalCardCount, TOTAL_CARD_CAP } from "@/lib/plan-caps";
import type Stripe from "stripe";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${err}` }, { status: 400 });
  }

  const db = admin();

  // Idempotency
  const { data: existing } = await db
    .from("processed_stripe_events")
    .select("event_id")
    .eq("event_id", event.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ received: true });

  // ── checkout.session.completed ──────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.supabase_user_id;
    if (userId && session.subscription) {
      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      const currentPriceId = sub.items.data[0]?.price.id ?? "";
      const priceInfo = planFromPriceId(currentPriceId);
      const plan = priceInfo?.plan ?? session.metadata?.plan ?? "silver";
      const interval = priceInfo?.interval ?? session.metadata?.interval ?? "monthly";
      const billingYear = 1;

      const isStripeTrial = sub.status === "trialing";
      const updates: Record<string, unknown> = {
        stripe_subscription_id: sub.id,
        stripe_price_id: currentPriceId,
        subscription_plan: plan,
        subscription_interval: interval,
        subscription_year: billingYear,
        subscription_status: isStripeTrial ? "trial" : "active",
      };
      if (isStripeTrial && sub.trial_end) {
        updates.trial_ends_at = new Date(sub.trial_end * 1000).toISOString();
      }

      // Card count gate: if total cards exceed new plan limit, freeze account
      const { data: profile } = await db
        .from("agent_profiles")
        .select("id")
        .eq("id", userId)
        .single();
      if (profile) {
        const totalCards = await getTotalCardCount(db as never, userId);
        const planCap = TOTAL_CARD_CAP[plan] ?? Infinity;
        if (isFinite(planCap) && totalCards > planCap) {
          updates.subscription_status = "tier_frozen";
        }
      }

      await db.from("agent_profiles").update(updates).eq("id", userId);

      // For monthly Y1: create Subscription Schedule for auto Y1→Y2 switch after 12 cycles
      if (!isStripeTrial && interval === "monthly" && plan !== "silver") {
        try {
          const y2PriceId = priceId(plan as never, "monthly", 2);
          const schedule = await stripe.subscriptionSchedules.create({
            from_subscription: sub.id,
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (stripe.subscriptionSchedules.update as any)(schedule.id, {
            end_behavior: "release",
            phases: [
              { items: [{ price: currentPriceId }], iterations: 12 },
              { items: [{ price: y2PriceId }] },
            ],
          });
        } catch {
          // Non-fatal: Y1→Y2 auto-switch won't work but subscription still active
        }
      }
    }
  }

  // ── customer.subscription.updated ──────────────────────────────────────────
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.supabase_user_id;
    const currentPriceId = sub.items.data[0]?.price.id ?? "";
    const priceInfo = planFromPriceId(currentPriceId);
    const plan = priceInfo?.plan ?? ALL_PRICE_IDS[currentPriceId];

    const status = sub.status === "active"    ? "active"
      : sub.status === "canceled"             ? "cancelled"
      : sub.status === "trialing"             ? "trial"
      : "expired";

    if (userId) {
      const updates: Record<string, unknown> = {
        stripe_subscription_id: sub.id,
        stripe_price_id: currentPriceId,
        subscription_plan: plan,
        subscription_interval: priceInfo?.interval ?? null,
        subscription_status: status,
      };
      if (priceInfo?.year) {
        updates.subscription_year = priceInfo.year;
      }
      await db.from("agent_profiles").update(updates).eq("id", userId);
    }
  }

  // ── customer.subscription.deleted ──────────────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.supabase_user_id;
    if (userId) {
      await db.from("agent_profiles").update({
        subscription_status: "cancelled",
        stripe_subscription_id: null,
      }).eq("id", userId);
    }
  }

  // ── invoice.payment_succeeded ───────────────────────────────────────────────
  // Handles: referral credit on first payment
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    if (!customerId) {
      await db.from("processed_stripe_events").insert({ event_id: event.id });
      return NextResponse.json({ received: true });
    }

    const { data: referrerProfile } = await db
      .from("agent_profiles")
      .select("id, referred_by_slug")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    const isFirstPayment = (invoice as { billing_reason?: string }).billing_reason === "subscription_create";

    // Referral credit: first payment only, and only if referred
    if (isFirstPayment && referrerProfile?.referred_by_slug) {
      const { data: existing } = await db
        .from("referral_credits")
        .select("id")
        .eq("referred_user_id", referrerProfile.id)
        .maybeSingle();

      if (!existing) {
        // Find referrer by their referral_slug
        const { data: referrer } = await db
          .from("agent_profiles")
          .select("id, stripe_customer_id")
          .eq("referral_slug", referrerProfile.referred_by_slug)
          .maybeSingle();

        if (referrer && invoice.amount_paid > 0) {
          if (referrer.stripe_customer_id) {
            // Referrer has a Stripe account — apply credit immediately
            try {
              const txn = await stripe.customers.createBalanceTransaction(
                referrer.stripe_customer_id,
                {
                  amount: -invoice.amount_paid, // negative = credit
                  currency: "myr",
                  description: `Referral credit for referring a new subscriber`,
                  metadata: { referred_user_id: referrerProfile.id, invoice_id: invoice.id },
                }
              );
              await db.from("referral_credits").insert({
                referrer_user_id: referrer.id,
                referred_user_id: referrerProfile.id,
                referred_invoice_id: invoice.id,
                amount_myr: invoice.amount_paid,
                stripe_balance_transaction_id: txn.id,
              });
            } catch {
              // Non-fatal: log but continue
            }
          } else {
            // Referrer has no Stripe account yet — save as pending credit
            // Will be applied to Stripe when they create their first subscription
            try {
              await db.from("referral_credits").insert({
                referrer_user_id: referrer.id,
                referred_user_id: referrerProfile.id,
                referred_invoice_id: invoice.id,
                amount_myr: invoice.amount_paid,
                stripe_balance_transaction_id: null,
              });
            } catch {
              // Non-fatal
            }
          }
        }
      }
    }
  }

  // ── invoice.upcoming ───────────────────────────────────────────────────────
  // Fires ~7 days before annual Y1 renewal. We extend by 60 days (2 free months)
  // and switch to Y2 price. Register this event in Stripe dashboard.
  if (event.type === "invoice.upcoming") {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null };
    const subId = typeof invoice.subscription === "string" ? invoice.subscription : (invoice.subscription as { id: string } | null)?.id;
    if (!subId) {
      await db.from("processed_stripe_events").insert({ event_id: event.id });
      return NextResponse.json({ received: true });
    }

    const sub = await stripe.subscriptions.retrieve(subId);
    const userId = sub.metadata?.supabase_user_id;
    if (!userId) {
      await db.from("processed_stripe_events").insert({ event_id: event.id });
      return NextResponse.json({ received: true });
    }

    const { data: profile } = await db
      .from("agent_profiles")
      .select("subscription_year, subscription_interval, subscription_plan, subscription_status")
      .eq("id", userId)
      .maybeSingle();

    // Only apply to Y1 annual non-beta active subscribers
    const isY1Annual = profile?.subscription_year === 1
      && profile?.subscription_interval === "annual"
      && profile?.subscription_status === "active"
      && profile?.subscription_plan !== null;

    if (isY1Annual && profile.subscription_plan) {
      const plan = profile.subscription_plan as never;
      const y2AnnualPriceId = priceId(plan, "annual", 2);
      const itemId = sub.items.data[0]?.id;

      if (itemId) {
        // Extend by 60 days (2 free months) and switch to Y2 price
        const extendedEnd = (sub as unknown as { current_period_end: number }).current_period_end + (60 * 24 * 3600);
        await stripe.subscriptions.update(subId, {
          trial_end: extendedEnd,
          items: [{ id: itemId, price: y2AnnualPriceId }],
          proration_behavior: "none",
        });
        await db.from("agent_profiles").update({ subscription_year: 2 }).eq("id", userId);
      }
    }
  }

  // ── invoice.payment_failed ─────────────────────────────────────────────────
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === "string" ? invoice.customer : (invoice.customer as { id: string } | null)?.id;
    if (customerId) {
      const { data: profile } = await db
        .from("agent_profiles")
        .select("id, name")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (profile) {
        const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 });
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

  await db.from("processed_stripe_events").insert({ event_id: event.id });
  return NextResponse.json({ received: true });
}
