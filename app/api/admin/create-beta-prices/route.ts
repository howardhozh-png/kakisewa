import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";

// One-time endpoint: creates the 4 beta Stripe prices and returns their IDs.
// Call once, add the returned IDs to Vercel env vars, then this endpoint is no longer needed.
export async function POST(req: NextRequest) {
  void req;
  const hdrs = await headers();
  if (hdrs.get("x-is-admin") !== "true") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const betaPlans = [
    { id: "silver",   label: "Silver",   amountMyr: 1900 },
    { id: "gold",     label: "Gold",     amountMyr: 2900 },
    { id: "platinum", label: "Platinum", amountMyr: 3900 },
    { id: "elite",    label: "Elite",    amountMyr: 6900 },
  ] as const;

  const results: Record<string, string> = {};

  for (const plan of betaPlans) {
    const price = await stripe.prices.create({
      currency: "myr",
      unit_amount: plan.amountMyr,
      recurring: { interval: "month" },
      nickname: `Beta ${plan.label} Monthly`,
      metadata: { plan: plan.id, tier: "beta" },
      product_data: {
        name: `kakisewa ${plan.label} (Beta)`,
        metadata: { plan: plan.id, tier: "beta" },
      },
    });
    results[`STRIPE_PRICE_BETA_${plan.id.toUpperCase()}_MONTHLY`] = price.id;
  }

  return NextResponse.json({
    message: "Beta prices created. Add these to Vercel env vars:",
    env_vars: results,
  });
}
