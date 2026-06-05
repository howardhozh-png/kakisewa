import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_placeholder", {
  apiVersion: "2026-05-27.dahlia",
});

export const PRICES = {
  silver:   { monthly: process.env.STRIPE_PRICE_SILVER_MONTHLY!,   annual: process.env.STRIPE_PRICE_SILVER_ANNUAL! },
  gold:     { monthly: process.env.STRIPE_PRICE_GOLD_MONTHLY!,     annual: process.env.STRIPE_PRICE_GOLD_ANNUAL! },
  platinum: { monthly: process.env.STRIPE_PRICE_PLATINUM_MONTHLY!, annual: process.env.STRIPE_PRICE_PLATINUM_ANNUAL! },
  elite:    { monthly: process.env.STRIPE_PRICE_ELITE_MONTHLY!,    annual: process.env.STRIPE_PRICE_ELITE_ANNUAL! },
} as const;

export type Plan     = keyof typeof PRICES;
export type Interval = "monthly" | "annual";

export function priceId(plan: Plan, interval: Interval): string {
  return PRICES[plan][interval];
}
