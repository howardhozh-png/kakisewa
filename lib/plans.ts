export type PlanId = "silver" | "gold" | "platinum" | "elite";

export const PLAN_PRICES: Record<PlanId, { monthly: number; perDay: string; annualMonthly: number; annualTotal: number; originalAnnual: number; annualSavings: number }> = {
  silver:   { monthly: 30,  perDay: "1",  annualMonthly: 25,  annualTotal: 300,  originalAnnual: 360,  annualSavings: 60 },
  gold:     { monthly: 99,  perDay: "3",  annualMonthly: 82,  annualTotal: 990,  originalAnnual: 1188, annualSavings: 198 },
  platinum: { monthly: 179, perDay: "6",  annualMonthly: 149, annualTotal: 1790, originalAnnual: 2148, annualSavings: 358 },
  elite:    { monthly: 299, perDay: "10", annualMonthly: 249, annualTotal: 2990, originalAnnual: 3588, annualSavings: 598 },
};
