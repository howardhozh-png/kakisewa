import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { stripe, priceId, type Plan, type Interval } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const { plan, interval } = await req.json() as { plan: Plan; interval: Interval };

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
    .select("stripe_customer_id, stripe_subscription_id, subscription_status, name")
    .eq("id", userId)
    .single();

  // ── Upgrade/downgrade existing active subscription ────────────────────────────
  if (profile?.stripe_subscription_id && profile?.subscription_status === "active") {
    const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const itemId = sub.items.data[0]?.id;
    if (!itemId) return NextResponse.json({ error: "Subscription item not found" }, { status: 400 });

    const newPriceId = priceId(plan, interval);
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: "create_prorations",
    });

    return NextResponse.json({ upgraded: true });
  }

  // ── New subscription via Checkout Session ─────────────────────────────────────
  let customerId: string = profile?.stripe_customer_id ?? "";
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: agentEmail,
      name: profile?.name ?? undefined,
      metadata: { supabase_user_id: userId },
    });
    customerId = customer.id;
    await admin.from("agent_profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId(plan, interval), quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?cancelled=1`,
    metadata: { supabase_user_id: userId, plan, interval },
    subscription_data: {
      metadata: { supabase_user_id: userId, plan, interval },
    },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  });

  return NextResponse.json({ url: session.url });
}
