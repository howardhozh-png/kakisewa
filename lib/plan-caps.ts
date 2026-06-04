import { createClient } from "./supabase/server";

export type CapCheckResult =
  | { allowed: true }
  | { allowed: false; reason: "plan_cap_reached"; upgrade_to: "platinum" };

type ProfileRow = { subscription_plan: string | null; subscription_status: string | null };

function effectivePlan(p: ProfileRow | null): string {
  if (!p) return "silver";
  if (p.subscription_status === "trial") return "elite_trial";
  if (p.subscription_status === "active") return p.subscription_plan ?? "silver";
  return "silver"; // expired / cancelled / null → most restricted
}

const RENEWAL_CARD_CAP: Record<string, number> = {
  elite_trial: Infinity,
  silver:       5,
  platinum:     Infinity,
  elite:        Infinity,
};

export async function checkRenewalCardCap(): Promise<CapCheckResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: true }; // unauthenticated — let the action fail naturally

  const { data: profile } = await supabase
    .from("agent_profiles")
    .select("subscription_plan, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  const plan = effectivePlan(profile as ProfileRow | null);
  const cap = RENEWAL_CARD_CAP[plan] ?? Infinity;

  if (!isFinite(cap)) return { allowed: true };

  // Active renewal cards: has a contract date, not yet resolved, not archived
  const { count } = await supabase
    .from("tenancies")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("contract_end", "is", null)
    .eq("outcome", "pending")
    .or("lifecycle_stage.is.null,lifecycle_stage.neq.closed");

  if ((count ?? 0) >= cap) {
    return { allowed: false, reason: "plan_cap_reached", upgrade_to: "platinum" };
  }

  return { allowed: true };
}
