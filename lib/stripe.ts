import Stripe from "stripe";
import type { PlanId, BillingYear, BillingInterval } from "./plans";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_placeholder", {
  apiVersion: "2026-05-27.dahlia",
});

export type { PlanId, BillingYear, BillingInterval };
export type Plan = PlanId;
export type Interval = BillingInterval;

// Beta prices — flat monthly or annual (monthly * 12, no bonus months)
export const BETA_PRICES: Record<PlanId, { monthly: string; annual: string }> = {
  silver:   { monthly: process.env.STRIPE_PRICE_BETA_SILVER_MONTHLY   ?? "", annual: process.env.STRIPE_PRICE_BETA_SILVER_ANNUAL   ?? "" },
  gold:     { monthly: process.env.STRIPE_PRICE_BETA_GOLD_MONTHLY     ?? "", annual: process.env.STRIPE_PRICE_BETA_GOLD_ANNUAL     ?? "" },
  platinum: { monthly: process.env.STRIPE_PRICE_BETA_PLATINUM_MONTHLY ?? "", annual: process.env.STRIPE_PRICE_BETA_PLATINUM_ANNUAL ?? "" },
  elite:    { monthly: process.env.STRIPE_PRICE_BETA_ELITE_MONTHLY    ?? "", annual: process.env.STRIPE_PRICE_BETA_ELITE_ANNUAL    ?? "" },
};

export function betaPriceId(plan: PlanId, interval: BillingInterval = "monthly"): string {
  return BETA_PRICES[plan][interval];
}

// Silver has same price for Y1 and Y2
export const PRICES = {
  silver: {
    monthly:    process.env.STRIPE_PRICE_SILVER_MONTHLY!,
    annual:     process.env.STRIPE_PRICE_SILVER_ANNUAL!,
    y1Monthly:  process.env.STRIPE_PRICE_SILVER_MONTHLY!,
    y2Monthly:  process.env.STRIPE_PRICE_SILVER_MONTHLY!,
    y1Annual:   process.env.STRIPE_PRICE_SILVER_ANNUAL!,
    y2Annual:   process.env.STRIPE_PRICE_SILVER_ANNUAL!,
  },
  gold: {
    monthly:    process.env.STRIPE_PRICE_GOLD_Y1_MONTHLY!,
    annual:     process.env.STRIPE_PRICE_GOLD_Y1_ANNUAL!,
    y1Monthly:  process.env.STRIPE_PRICE_GOLD_Y1_MONTHLY!,
    y2Monthly:  process.env.STRIPE_PRICE_GOLD_Y2_MONTHLY!,
    y1Annual:   process.env.STRIPE_PRICE_GOLD_Y1_ANNUAL!,
    y2Annual:   process.env.STRIPE_PRICE_GOLD_Y2_ANNUAL!,
  },
  platinum: {
    monthly:    process.env.STRIPE_PRICE_PLATINUM_Y1_MONTHLY!,
    annual:     process.env.STRIPE_PRICE_PLATINUM_Y1_ANNUAL!,
    y1Monthly:  process.env.STRIPE_PRICE_PLATINUM_Y1_MONTHLY!,
    y2Monthly:  process.env.STRIPE_PRICE_PLATINUM_Y2_MONTHLY!,
    y1Annual:   process.env.STRIPE_PRICE_PLATINUM_Y1_ANNUAL!,
    y2Annual:   process.env.STRIPE_PRICE_PLATINUM_Y2_ANNUAL!,
  },
  elite: {
    monthly:    process.env.STRIPE_PRICE_ELITE_Y1_MONTHLY!,
    annual:     process.env.STRIPE_PRICE_ELITE_Y1_ANNUAL!,
    y1Monthly:  process.env.STRIPE_PRICE_ELITE_Y1_MONTHLY!,
    y2Monthly:  process.env.STRIPE_PRICE_ELITE_Y2_MONTHLY!,
    y1Annual:   process.env.STRIPE_PRICE_ELITE_Y1_ANNUAL!,
    y2Annual:   process.env.STRIPE_PRICE_ELITE_Y2_ANNUAL!,
  },
} as const;

export function priceId(plan: PlanId, interval: BillingInterval, year: BillingYear = 1): string {
  if (interval === "annual") return year === 1 ? PRICES[plan].y1Annual : PRICES[plan].y2Annual;
  return year === 1 ? PRICES[plan].y1Monthly : PRICES[plan].y2Monthly;
}

// Reverse lookup: price ID → { plan, year, interval }
export function planFromPriceId(pid: string): { plan: PlanId; year: BillingYear; interval: BillingInterval } | null {
  // Check beta prices first
  for (const [plan, betaP] of Object.entries(BETA_PRICES) as [PlanId, { monthly: string; annual: string }][]) {
    if (betaP.monthly && pid === betaP.monthly) return { plan, year: 1, interval: "monthly" };
    if (betaP.annual  && pid === betaP.annual)  return { plan, year: 1, interval: "annual" };
  }
  for (const [plan, p] of Object.entries(PRICES) as [PlanId, typeof PRICES[PlanId]][]) {
    if (pid === p.y1Monthly) return { plan, year: 1, interval: "monthly" };
    if (pid === p.y2Monthly) return { plan, year: 2, interval: "monthly" };
    if (pid === p.y1Annual)  return { plan, year: 1, interval: "annual" };
    if (pid === p.y2Annual)  return { plan, year: 2, interval: "annual" };
  }
  return null;
}

// All price IDs that exist in our system (for PLAN_FROM_PRICE webhook lookup)
export const ALL_PRICE_IDS: Record<string, PlanId> = Object.fromEntries([
  ...(Object.entries(PRICES) as [PlanId, typeof PRICES[PlanId]][]).flatMap(([plan, p]) => [
    [p.y1Monthly, plan],
    [p.y2Monthly, plan],
    [p.y1Annual, plan],
    [p.y2Annual, plan],
  ]),
  ...(Object.entries(BETA_PRICES) as [PlanId, { monthly: string; annual: string }][])
    .flatMap(([plan, p]) => [
      ...(p.monthly ? [[p.monthly, plan]] : []),
      ...(p.annual  ? [[p.annual,  plan]] : []),
    ]),
]);
