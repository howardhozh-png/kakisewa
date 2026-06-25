import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import { PLAN_CONFIG, PLAN_ORDER, minimumPlanFor, type PlanId } from "./plans";

export type { PlanId };
export { CAP_WARN_THRESHOLD } from "./cap-constants";
export { minimumPlanFor };

export type ProfileRow = {
  subscription_plan?: string | null;
  subscription_status?: string | null;
};

export type CapCheckResult =
  | {
      allowed: true;
      current_count: number;
      current_cap: number;
      remaining: number;
      current_plan: string;
      upgrade_to: PlanId | null;
      upgrade_cap: number | null;
    }
  | {
      allowed: false;
      reason: "plan_cap_reached" | "tier_frozen";
      current_plan: string;
      current_count: number;
      current_cap: number;
      upgrade_to: PlanId | null;
      upgrade_cap: number | null;
      remaining: 0;
      nearest_expiry_days?: number | null;
    };

export const PLAN_RANK: Record<string, number> = {
  silver: 1, gold: 2, platinum: 3, elite: 4,
};

export function planAllows(plan: string, min: "gold" | "platinum" | "elite"): boolean {
  return (PLAN_RANK[plan] ?? 1) >= PLAN_RANK[min];
}

export function effectivePlan(p: ProfileRow | null): string {
  if (!p) return "silver";
  if (p.subscription_status === "lifetime")     return "elite";
  if (p.subscription_status === "beta")         return "elite";
  if (p.subscription_status === "trial")        return "elite";
  if (p.subscription_status === "active")       return p.subscription_plan ?? "silver";
  if (p.subscription_status === "tier_frozen")  return p.subscription_plan ?? "silver";
  // beta_frozen, expired, cancelled → frozen (0 cap)
  return "frozen";
}

export const TOTAL_CARD_CAP: Record<string, number> = {
  frozen: 0,
  silver: 50,
  gold: 150,
  platinum: 400,
  elite: 1000,
};

function nextTier(plan: string): { id: PlanId; cap: number } | null {
  const idx = PLAN_ORDER.indexOf(plan as PlanId);
  if (idx < 0 || idx >= PLAN_ORDER.length - 1) return null;
  const next = PLAN_ORDER[idx + 1];
  return { id: next, cap: PLAN_CONFIG[next].cards };
}

// Unified total card count across all 3 boards for a user
export async function getTotalCardCount(
  supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createServiceClient>,
  userId: string
): Promise<number> {
  // My Listing: owner_leads stage in (listed, matched), not competitor target
  const { count: myListingCount } = await supabase
    .from("owner_leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .or("is_competitor_target.is.null,is_competitor_target.eq.false")
    .in("stage", ["listed", "matched"])
    .is("deleted_at", null);

  // Lost Listing: competitor targets
  const { count: lostCount } = await supabase
    .from("owner_leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_competitor_target", true)
    .is("deleted_at", null);

  // Existing Listing: active tenancies
  const { count: tenancyCount } = await supabase
    .from("tenancies")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("lifecycle_stage", "closed");

  return (myListingCount ?? 0) + (lostCount ?? 0) + (tenancyCount ?? 0);
}

async function getProfileAndPlan(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  plan: string;
  status: string;
} | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("agent_profiles")
    .select("subscription_plan, subscription_status")
    .eq("id", user.id)
    .maybeSingle();
  return {
    supabase,
    userId: user.id,
    plan: effectivePlan(profile as ProfileRow | null),
    status: profile?.subscription_status ?? "trial",
  };
}

// Primary cap check — used in all card-creation server actions
export async function checkCardCap(): Promise<CapCheckResult> {
  const ctx = await getProfileAndPlan();
  if (!ctx) {
    return { allowed: true, current_count: 0, current_cap: Infinity, remaining: Infinity, current_plan: "silver", upgrade_to: "gold", upgrade_cap: null };
  }
  const { supabase, userId, plan, status } = ctx;

  // tier_frozen: can't create or move, but can delete
  if (status === "tier_frozen") {
    const cap = TOTAL_CARD_CAP[plan] ?? 0;
    const current = await getTotalCardCount(supabase, userId);
    const next = nextTier(plan);
    return {
      allowed: false,
      reason: "tier_frozen",
      current_plan: plan,
      current_count: current,
      current_cap: cap,
      upgrade_to: next?.id ?? null,
      upgrade_cap: next?.cap ?? null,
      remaining: 0,
    };
  }

  const cap = TOTAL_CARD_CAP[plan] ?? Infinity;
  if (!isFinite(cap)) {
    return { allowed: true, current_count: 0, current_cap: Infinity, remaining: Infinity, current_plan: plan, upgrade_to: "elite", upgrade_cap: null };
  }

  const current = await getTotalCardCount(supabase, userId);
  const remaining = Math.max(0, cap - current);
  const planId = (PLAN_ORDER.includes(plan as PlanId) ? plan : "silver") as PlanId;
  const next = nextTier(planId);

  if (current < cap) {
    return {
      allowed: true,
      current_count: current,
      current_cap: cap,
      remaining,
      current_plan: planId,
      upgrade_to: next?.id ?? null,
      upgrade_cap: next?.cap ?? null,
    };
  }

  return {
    allowed: false,
    reason: "plan_cap_reached",
    current_plan: planId,
    current_count: current,
    current_cap: cap,
    upgrade_to: next?.id ?? null,
    upgrade_cap: next?.cap ?? null,
    remaining: 0,
  };
}

// Service-client version for async paths (no auth session)
export async function checkCardCapForUser(userId: string): Promise<CapCheckResult> {
  const svc = createServiceClient();
  const { data: profile } = await svc
    .from("agent_profiles")
    .select("subscription_plan, subscription_status")
    .eq("id", userId)
    .maybeSingle();
  const plan = effectivePlan(profile as ProfileRow | null);
  const status = profile?.subscription_status ?? "trial";

  if (status === "tier_frozen") {
    const cap = TOTAL_CARD_CAP[plan] ?? 0;
    const current = await getTotalCardCount(svc, userId);
    const next = nextTier(plan);
    return {
      allowed: false,
      reason: "tier_frozen",
      current_plan: plan,
      current_count: current,
      current_cap: cap,
      upgrade_to: next?.id ?? null,
      upgrade_cap: next?.cap ?? null,
      remaining: 0,
    };
  }

  const cap = TOTAL_CARD_CAP[plan] ?? Infinity;
  if (!isFinite(cap)) {
    return { allowed: true, current_count: 0, current_cap: Infinity, remaining: Infinity, current_plan: plan, upgrade_to: "elite", upgrade_cap: null };
  }

  const current = await getTotalCardCount(svc, userId);
  const remaining = Math.max(0, cap - current);
  const planId = (PLAN_ORDER.includes(plan as PlanId) ? plan : "silver") as PlanId;
  const next = nextTier(planId);

  if (current < cap) {
    return {
      allowed: true,
      current_count: current,
      current_cap: cap,
      remaining,
      current_plan: planId,
      upgrade_to: next?.id ?? null,
      upgrade_cap: next?.cap ?? null,
    };
  }

  return {
    allowed: false,
    reason: "plan_cap_reached",
    current_plan: planId,
    current_count: current,
    current_cap: cap,
    upgrade_to: next?.id ?? null,
    upgrade_cap: next?.cap ?? null,
    remaining: 0,
  };
}

// Backward-compat: PipelineType still imported by plan-cap-dialog
export type PipelineType = "existing" | "my_listing" | "target";

// Backward-compat aliases so existing callers don't break immediately
export const checkTenancyCap = checkCardCap;
export const checkLeadCap = checkCardCap;
export const checkTargetCap = checkCardCap;
export const checkRenewalCardCap = checkCardCap;
export const checkMyListingCapForUser = checkCardCapForUser;

// Legacy cap tables (still referenced in some UI — keep until subscription page is rebuilt)
export const TENANCY_CAP = TOTAL_CARD_CAP;
export const LEAD_CAP = TOTAL_CARD_CAP;
export const TARGET_CAP = TOTAL_CARD_CAP;
export const RENEWAL_CARD_CAP = TOTAL_CARD_CAP;
