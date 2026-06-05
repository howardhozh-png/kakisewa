import { createClient } from "./supabase/server";

export type PlanId = "silver" | "gold" | "platinum" | "elite";

export type CapCheckResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "plan_cap_reached";
      current_plan: PlanId;
      current_count: number;
      upgrade_to: PlanId;
      current_cap: number;
      upgrade_cap: number | null; // null = unlimited
      nearest_expiry_days: number | null;
    };

export type ProfileRow = { subscription_plan?: string | null; subscription_status?: string | null };

export function effectivePlan(p: ProfileRow | null): string {
  if (!p) return "silver";
  if (p.subscription_status === "trial") return "elite_trial";
  if (p.subscription_status === "active") return p.subscription_plan ?? "silver";
  return "silver";
}

export const PLAN_RANK: Record<string, number> = {
  silver: 1, gold: 2, platinum: 3, elite: 4, elite_trial: 4,
};

export function planAllows(plan: string, min: "gold" | "platinum" | "elite"): boolean {
  return (PLAN_RANK[plan] ?? 1) >= PLAN_RANK[min];
}

export const TENANCY_CAP: Record<string, number> = {
  elite_trial: Infinity,
  silver:       20,
  gold:         80,
  platinum:     200,
  elite:        Infinity,
};

const NEXT_TIER: Record<string, { id: PlanId; cap: number | null }> = {
  silver:   { id: "gold",     cap: 80 },
  gold:     { id: "platinum", cap: 200 },
  platinum: { id: "elite",    cap: null },
};

export async function checkTenancyCap(): Promise<CapCheckResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: true };

  const { data: profile } = await supabase
    .from("agent_profiles")
    .select("subscription_plan, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  const plan = effectivePlan(profile as ProfileRow | null);
  const cap = TENANCY_CAP[plan] ?? Infinity;

  if (!isFinite(cap)) return { allowed: true };

  const { count } = await supabase
    .from("tenancies")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .neq("lifecycle_stage", "closed");

  if ((count ?? 0) < cap) return { allowed: true };

  const { data: soonest } = await supabase
    .from("tenancies")
    .select("contract_end")
    .eq("user_id", user.id)
    .neq("lifecycle_stage", "closed")
    .not("contract_end", "is", null)
    .order("contract_end", { ascending: true })
    .limit(1)
    .maybeSingle();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nearestExpiryDays = soonest?.contract_end
    ? Math.max(0, Math.ceil((new Date(soonest.contract_end as string).getTime() - today.getTime()) / 86400000))
    : null;

  const planId = (["silver","gold","platinum","elite"].includes(plan) ? plan : "silver") as PlanId;
  const next = NEXT_TIER[planId] ?? { id: "elite" as PlanId, cap: null };

  return {
    allowed: false,
    reason: "plan_cap_reached",
    current_plan: planId,
    current_count: count ?? 0,
    upgrade_to: next.id,
    current_cap: cap,
    upgrade_cap: next.cap,
    nearest_expiry_days: nearestExpiryDays,
  };
}

// backward compat alias
export const checkRenewalCardCap = checkTenancyCap;
export const RENEWAL_CARD_CAP = TENANCY_CAP;
