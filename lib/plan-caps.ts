import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";

export type PlanId = "silver" | "gold" | "platinum" | "elite";
export type PipelineType = "existing" | "my_listing" | "target";

// Soft-warning threshold: show amber nudge when this many slots remain
export const CAP_WARN_THRESHOLD = 5;

export type CapCheckResult =
  | { allowed: true; current_count: number; current_cap: number; remaining: number; current_plan: string; upgrade_to: PlanId; upgrade_cap: number | null }
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
      remaining: 0;
    };

export type ProfileRow = { subscription_plan?: string | null; subscription_status?: string | null };

export function effectivePlan(p: ProfileRow | null): string {
  if (!p) return "silver";
  if (p.subscription_status === "beta") return "elite";
  if (p.subscription_status === "trial") return "elite";
  if (p.subscription_status === "active") return p.subscription_plan ?? "silver";
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

// My Listing pipeline — counts stage IN ("listed","matched"), non-competitor only
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
  if (!ctx) return { allowed: true, current_count: 0, current_cap: Infinity, remaining: Infinity, current_plan: "silver", upgrade_to: "gold", upgrade_cap: null };
  const { supabase, userId, plan } = ctx;
  const cap = TENANCY_CAP[plan] ?? Infinity;
  if (!isFinite(cap)) return { allowed: true, current_count: 0, current_cap: Infinity, remaining: Infinity, current_plan: plan, upgrade_to: "elite", upgrade_cap: null };

  const { count } = await supabase
    .from("tenancies")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("lifecycle_stage", "closed");

  const current = count ?? 0;
  const remaining = Math.max(0, cap - current);
  const planId = (["silver","gold","platinum","elite"].includes(plan) ? plan : "silver") as PlanId;
  const next = NEXT_TIER_TENANCY[planId] ?? { id: "elite" as PlanId, cap: null };

  if (current < cap) return { allowed: true, current_count: current, current_cap: cap, remaining, current_plan: planId, upgrade_to: next.id, upgrade_cap: next.cap };

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

  return {
    allowed: false,
    reason: "plan_cap_reached",
    pipeline: "existing",
    current_plan: planId,
    current_count: current,
    upgrade_to: next.id,
    current_cap: cap,
    upgrade_cap: next.cap,
    nearest_expiry_days: nearestExpiryDays,
    remaining: 0,
  };
}

// Session-based My Listing cap check (used in server actions with auth context)
export async function checkLeadCap(): Promise<CapCheckResult> {
  const ctx = await getProfileAndPlan();
  if (!ctx) return { allowed: true, current_count: 0, current_cap: Infinity, remaining: Infinity, current_plan: "silver", upgrade_to: "gold", upgrade_cap: null };
  const { supabase, userId, plan } = ctx;
  const cap = LEAD_CAP[plan] ?? Infinity;
  if (!isFinite(cap)) return { allowed: true, current_count: 0, current_cap: Infinity, remaining: Infinity, current_plan: plan, upgrade_to: "elite", upgrade_cap: null };

  const { count } = await supabase
    .from("owner_leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .or("is_competitor_target.is.null,is_competitor_target.eq.false")
    .in("stage", ["listed", "matched"]);

  const current = count ?? 0;
  const remaining = Math.max(0, cap - current);
  const planId = (["silver","gold","platinum","elite"].includes(plan) ? plan : "silver") as PlanId;
  const next = NEXT_TIER_LEAD[planId] ?? { id: "elite" as PlanId, cap: null };

  if (current < cap) return { allowed: true, current_count: current, current_cap: cap, remaining, current_plan: planId, upgrade_to: next.id, upgrade_cap: next.cap };

  return {
    allowed: false,
    reason: "plan_cap_reached",
    pipeline: "my_listing",
    current_plan: planId,
    current_count: current,
    upgrade_to: next.id,
    current_cap: cap,
    upgrade_cap: next.cap,
    nearest_expiry_days: null,
    remaining: 0,
  };
}

// Service-client My Listing cap check — for async paths (owner intake) with no auth session
export async function checkMyListingCapForUser(userId: string): Promise<CapCheckResult> {
  const svc = createServiceClient();
  const { data: profile } = await svc
    .from("agent_profiles")
    .select("subscription_plan, subscription_status")
    .eq("id", userId)
    .maybeSingle();
  const plan = effectivePlan(profile as ProfileRow | null);
  const cap = LEAD_CAP[plan] ?? Infinity;
  if (!isFinite(cap)) return { allowed: true, current_count: 0, current_cap: Infinity, remaining: Infinity, current_plan: plan, upgrade_to: "elite", upgrade_cap: null };

  const { count } = await svc
    .from("owner_leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .or("is_competitor_target.is.null,is_competitor_target.eq.false")
    .in("stage", ["listed", "matched"]);

  const current = count ?? 0;
  const remaining = Math.max(0, cap - current);
  const planId = (["silver","gold","platinum","elite"].includes(plan) ? plan : "silver") as PlanId;
  const next = NEXT_TIER_LEAD[planId] ?? { id: "elite" as PlanId, cap: null };

  if (current < cap) return { allowed: true, current_count: current, current_cap: cap, remaining, current_plan: planId, upgrade_to: next.id, upgrade_cap: next.cap };

  return {
    allowed: false,
    reason: "plan_cap_reached",
    pipeline: "my_listing",
    current_plan: planId,
    current_count: current,
    upgrade_to: next.id,
    current_cap: cap,
    upgrade_cap: next.cap,
    nearest_expiry_days: null,
    remaining: 0,
  };
}

export async function checkTargetCap(): Promise<CapCheckResult> {
  const ctx = await getProfileAndPlan();
  if (!ctx) return { allowed: true, current_count: 0, current_cap: Infinity, remaining: Infinity, current_plan: "silver", upgrade_to: "gold", upgrade_cap: null };
  const { supabase, userId, plan } = ctx;
  const cap = TARGET_CAP[plan] ?? Infinity;
  if (!isFinite(cap)) return { allowed: true, current_count: 0, current_cap: Infinity, remaining: Infinity, current_plan: plan, upgrade_to: "elite", upgrade_cap: null };

  const { count } = await supabase
    .from("owner_leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_competitor_target", true);

  const current = count ?? 0;
  const remaining = Math.max(0, cap - current);
  const planId = (["silver","gold","platinum","elite"].includes(plan) ? plan : "silver") as PlanId;
  const next = NEXT_TIER_TARGET[planId] ?? { id: "elite" as PlanId, cap: null };

  if (current < cap) return { allowed: true, current_count: current, current_cap: cap, remaining, current_plan: planId, upgrade_to: next.id, upgrade_cap: next.cap };

  return {
    allowed: false,
    reason: "plan_cap_reached",
    pipeline: "target",
    current_plan: planId,
    current_count: current,
    upgrade_to: next.id,
    current_cap: cap,
    upgrade_cap: next.cap,
    nearest_expiry_days: null,
    remaining: 0,
  };
}

// backward compat aliases
export const checkRenewalCardCap = checkTenancyCap;
export const RENEWAL_CARD_CAP = TENANCY_CAP;
