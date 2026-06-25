export type PlanId = "silver" | "gold" | "platinum" | "elite";
export type BillingYear = 1 | 2;
export type BillingInterval = "monthly" | "annual";

// Beta pricing — flat monthly forever, no annual, no Y2
export const BETA_PLAN_CONFIG: Record<PlanId, { betaMonthly: number }> = {
  silver:   { betaMonthly: 19 },
  gold:     { betaMonthly: 29 },
  platinum: { betaMonthly: 39 },
  elite:    { betaMonthly: 69 },
};

export const PLAN_CONFIG = {
  silver: {
    label: "Silver",
    cards: 50,
    y1Monthly: 29,
    y2Monthly: 29,
    y1Annual: 348,
    y2Annual: 348,
  },
  gold: {
    label: "Gold",
    cards: 150,
    y1Monthly: 49,
    y2Monthly: 69,
    y1Annual: 588,
    y2Annual: 828,
  },
  platinum: {
    label: "Platinum",
    cards: 400,
    y1Monthly: 99,
    y2Monthly: 139,
    y1Annual: 1188,
    y2Annual: 1668,
  },
  elite: {
    label: "Elite",
    cards: 1000,
    y1Monthly: 159,
    y2Monthly: 219,
    y1Annual: 1908,
    y2Annual: 2628,
  },
} as const satisfies Record<PlanId, {
  label: string;
  cards: number;
  y1Monthly: number;
  y2Monthly: number;
  y1Annual: number;
  y2Annual: number;
}>;

export function planPrice(plan: PlanId, year: BillingYear, interval: BillingInterval): number {
  const cfg = PLAN_CONFIG[plan];
  if (interval === "annual") return year === 1 ? cfg.y1Annual : cfg.y2Annual;
  return year === 1 ? cfg.y1Monthly : cfg.y2Monthly;
}

export function planCards(plan: PlanId): number {
  return PLAN_CONFIG[plan].cards;
}

export const PLAN_ORDER: PlanId[] = ["silver", "gold", "platinum", "elite"];

export function nextPlan(plan: PlanId): PlanId | null {
  const idx = PLAN_ORDER.indexOf(plan);
  return idx >= 0 && idx < PLAN_ORDER.length - 1 ? PLAN_ORDER[idx + 1] : null;
}

export function minimumPlanFor(cardCount: number): PlanId {
  for (const plan of PLAN_ORDER) {
    if (cardCount <= PLAN_CONFIG[plan].cards) return plan;
  }
  return "elite";
}
