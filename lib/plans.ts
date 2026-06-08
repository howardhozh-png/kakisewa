export type PlanId = "silver" | "gold" | "platinum" | "elite";

export const PLAN_PRICES: Record<PlanId, { monthly: number; annualMonthly: number; annualTotal: number; originalAnnual: number; annualSavings: number }> = {
  silver:   { monthly: 69,  annualMonthly: 57,  annualTotal: 570,  originalAnnual: 690,  annualSavings: 120 },
  gold:     { monthly: 119, annualMonthly: 99,  annualTotal: 990,  originalAnnual: 1190, annualSavings: 200 },
  platinum: { monthly: 179, annualMonthly: 149, annualTotal: 1490, originalAnnual: 1790, annualSavings: 300 },
  elite:    { monthly: 299, annualMonthly: 249, annualTotal: 2490, originalAnnual: 2990, annualSavings: 500 },
};
