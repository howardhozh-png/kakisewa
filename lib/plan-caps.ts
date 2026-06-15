import { createClient } from "./supabase/server";

export type PlanId = "silver" | "gold" | "platinum" | "elite";
export type PipelineType = "existing" | "my_listing" | "target";

export type CapCheckResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "plan_cap_reached";
      pipeline: PipelineType;
      current_plan: PlanId;
      current_count: number;
      upgrade_to: PlanId;
      current_cap: number;
      upgrade_cap: number | null;
      nearest_expiry_days: number | null;
    };

export type ProfileRow = { subscription_plan?: string | null; subscription_status?: string | null };

export function effectivePlan(p: ProfileRow | null): string {
  if (!p) return "silver";
  if (p.subscription_status === "beta") return "elite";
  if (p.subscription_status === "trial") return "elite";
  if (p.subscription_status === "active") return p.subscription_plan ?? "silver";
  // beta_frozen, expired, cancelled — locked out, not silver-tier
  if (p.subscription_status === "beta_frozen" || p.subscription_status === "expired" || p.subscription_status === "cancelled") return "frozen";
  return "silver";
}

export const PLAN_RANK: Record<string, number> = {
  silver: 1, gold: 2, platinum: 3, elite: 4,
};

export function planAllows(plan: string, min: "gold" | "platinum" | "elite"): boolean {
  return (PLAN_RANK[plan] ?? 1) >= PLAN_RANK[min];
}

// Existing pipeline (tenancies)
export const TENANCY_CAP: Record<string, number> = {
  frozen:   0,
  silver:   20,
  gold:     60,
  platinum: 200,
  elite:    700,
};

// My pipeline (owner_leads, not competitor targets)
export const LEAD_CAP: Record<string, number> = {
  frozen:   0,
  silver:   40,
  gold:     100,
  platinum: 300,
  elite:    800,
};

// Target pipeline (competitor leads)
export const TARGET_CAP: Record<string, number> = {
  frozen:   0,
  silver:   10,
  gold:     40,
  platinum: 100,
  elite:    500,
};

const NEXT_TIER_TENANCY: Record<string, { id: PlanId; cap: number | null }> = {
  silver:   { id: "gold",     cap: 60 },
  gold:     { id: "platinum", cap: 200 },
  platinum: { id: "elite",    cap: 700 },
};

const NEXT_TIER_LEAD: Record<string, { id: PlanId; cap: number | null }> = {
  silver:   { id: "gold",     cap: 100 },
  gold:     { id: "platinum", cap: 300 },
  platinum: { id: "elite",    cap: 800 },
};

const NEXT_TIER_TARGET: Record<string, { id: PlanId; cap: number | null }> = {
  silver:   { id: "gold",     cap: 40 },
  gold:     { id: "platinum", cap: 100 },
  platinum: { id: "elite",    cap: 500 },
};

async function getProfileAndPlan(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; userId: string; plan: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("agent_profiles")
    .select("subscription_plan, subscription_status")
    .eq("id", user.id)
    .maybeSingle();
  return { supabase, userId: user.id, plan: effectivePlan(profile as ProfileRow | null) };
}

export async function checkTenancyCap(): Promise<CapCheckResult> {
  const ctx = await getProfileAndPlan();
  if (!ctx) return { allowed: true };
  const { supabase, userId, plan } = ctx;
  const cap = TENANCY_CAP[plan] ?? Infinity;
  if (!isFinite(cap)) return { allowed: true };

  const { count } = await supabase
    .from("tenancies")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("lifecycle_stage", "closed");

  if ((count ?? 0) < cap) return { allowed: true };

  const { data: soonest } = await supabase
    .from("tenancies")
    .select("contract_end")
    .eq("user_id", userId)
    .neq("lifecycle_stage", "closed")
    .not("contract_end", "is", null)
    .order("contract_end", { ascending: true })
    .limit(1)
    .maybeSingle();

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const nearestExpiryDays = soonest?.contract_end
    ? Math.max(0, Math.ceil((new Date(soonest.contract_end as string).getTime() - today.getTime()) / 86400000))
    : null;

  const planId = (["silver","gold","platinum","elite"].includes(plan) ? plan : "silver") as PlanId;
  const next = NEXT_TIER_TENANCY[planId] ?? { id: "elite" as PlanId, cap: null };

  return {
    allowed: false,
    reason: "plan_cap_reached",
    pipeline: "existing",
    current_plan: planId,
    current_count: count ?? 0,
    upgrade_to: next.id,
    current_cap: cap,
    upgrade_cap: next.cap,
    nearest_expiry_days: nearestExpiryDays,
  };
}

export async function checkLeadCap(): Promise<CapCheckResult> {
  const ctx = await getProfileAndPlan();
  if (!ctx) return { allowed: true };
  const { supabase, userId, plan } = ctx;
  const cap = LEAD_CAP[plan] ?? Infinity;
  if (!isFinite(cap)) return { allowed: true };

  const { count } = await supabase
    .from("owner_leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .or("is_competitor_target.is.null,is_competitor_target.eq.false")
    .not("stage", "in", '("closed","archived")');

  if ((count ?? 0) < cap) return { allowed: true };

  const planId = (["silver","gold","platinum","elite"].includes(plan) ? plan : "silver") as PlanId;
  const next = NEXT_TIER_LEAD[planId] ?? { id: "elite" as PlanId, cap: null };

  return {
    allowed: false,
    reason: "plan_cap_reached",
    pipeline: "my_listing",
    current_plan: planId,
    current_count: count ?? 0,
    upgrade_to: next.id,
    current_cap: cap,
    upgrade_cap: next.cap,
    nearest_expiry_days: null,
  };
}

export async function checkTargetCap(): Promise<CapCheckResult> {
  const ctx = await getProfileAndPlan();
  if (!ctx) return { allowed: true };
  const { supabase, userId, plan } = ctx;
  const cap = TARGET_CAP[plan] ?? Infinity;
  if (!isFinite(cap)) return { allowed: true };

  const { count } = await supabase
    .from("owner_leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_competitor_target", true);

  if ((count ?? 0) < cap) return { allowed: true };

  const planId = (["silver","gold","platinum","elite"].includes(plan) ? plan : "silver") as PlanId;
  const next = NEXT_TIER_TARGET[planId] ?? { id: "elite" as PlanId, cap: null };

  return {
    allowed: false,
    reason: "plan_cap_reached",
    pipeline: "target",
    current_plan: planId,
    current_count: count ?? 0,
    upgrade_to: next.id,
    current_cap: cap,
    upgrade_cap: next.cap,
    nearest_expiry_days: null,
  };
}

// backward compat aliases
export const checkRenewalCardCap = checkTenancyCap;
export const RENEWAL_CARD_CAP = TENANCY_CAP;
