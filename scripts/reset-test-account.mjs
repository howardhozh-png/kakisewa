// One-off script to reset a test account back to "brand new signup" state.
// Usage: node scripts/reset-test-account.mjs <email> [--execute]
// Without --execute it only prints row counts (dry run). Keeps the auth
// login and agent_profiles row intact — only clears data + trial/streak fields.
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const TRIAL_DURATION_DAYS = 61; // must match lib/beta-config.ts

const email = process.argv[2];
const execute = process.argv.includes("--execute");
if (!email) {
  console.error("Usage: node scripts/reset-test-account.mjs <email> [--execute]");
  process.exit(1);
}

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function findUserByEmail(targetEmail) {
  let page = 1;
  while (true) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === targetEmail.toLowerCase());
    if (match) return match;
    if (data.users.length < 200) return null;
    page++;
  }
}

async function countRows(table, userId) {
  const { count, error } = await svc.from(table).select("*", { count: "exact", head: true }).eq("user_id", userId);
  if (error) { console.log(`  ${table}: ERROR ${error.message}`); return 0; }
  return count ?? 0;
}

const DIRECT_TABLES = [
  "commission_events",
  "calendar_events",
  "whatsapp_log",
  "tenant_intake_sessions",
  "push_subscriptions",
  "property_supports",
  "tenant_profiles",
  "tenancies",
  "owner_leads",
];

const user = await findUserByEmail(email);
if (!user) {
  console.error(`No auth user found for ${email}`);
  process.exit(1);
}
console.log(`Found user: ${user.id} (${user.email}), created ${user.created_at}`);

const { data: profile } = await svc.from("agent_profiles").select("*").eq("id", user.id).maybeSingle();
if (!profile) {
  console.error("No agent_profiles row for this user — nothing to reset.");
  process.exit(1);
}

const { data: matchPacks } = await svc.from("match_packs").select("id").eq("user_id", user.id);
const { data: propertyPacks } = await svc.from("property_packs").select("id").eq("user_id", user.id);
const matchPackIds = (matchPacks ?? []).map((p) => p.id);
const propertyPackIds = (propertyPacks ?? []).map((p) => p.id);

console.log("\nRow counts to delete:");
for (const t of DIRECT_TABLES) {
  console.log(`  ${t}: ${await countRows(t, user.id)}`);
}
console.log(`  match_packs: ${matchPackIds.length}`);
console.log(`  property_packs: ${propertyPackIds.length}`);
if (matchPackIds.length) {
  const { count } = await svc.from("match_pack_tenants").select("*", { count: "exact", head: true }).in("pack_id", matchPackIds);
  console.log(`  match_pack_tenants: ${count ?? 0}`);
}
if (propertyPackIds.length) {
  const { count } = await svc.from("property_pack_leads").select("*", { count: "exact", head: true }).in("pack_id", propertyPackIds);
  console.log(`  property_pack_leads: ${count ?? 0}`);
}

console.log("\nagent_profiles fields that will reset:");
console.log(`  trial_started_at: ${profile.trial_started_at} -> now`);
console.log(`  trial_ends_at: ${profile.trial_ends_at} -> +${TRIAL_DURATION_DAYS}d from now`);
console.log(`  subscription_status: ${profile.subscription_status} -> trial`);
console.log(`  login_streak: ${profile.login_streak} -> 0`);
console.log(`  longest_streak: ${profile.longest_streak} -> 0`);
console.log(`  last_login_date: ${profile.last_login_date} -> null`);
console.log(`  survey_completed_at: ${profile.survey_completed_at} -> now (matches real signup — skips beta survey)`);
console.log(`  (name / phone / agency / ren_number left as-is)`);

if (!execute) {
  console.log("\nDry run only — pass --execute to actually delete.");
  process.exit(0);
}

console.log("\nDeleting...");
if (matchPackIds.length) await svc.from("match_pack_tenants").delete().in("pack_id", matchPackIds);
if (propertyPackIds.length) await svc.from("property_pack_leads").delete().in("pack_id", propertyPackIds);
await svc.from("match_packs").delete().eq("user_id", user.id);
await svc.from("property_packs").delete().eq("user_id", user.id);
for (const t of DIRECT_TABLES) {
  const { error } = await svc.from(t).delete().eq("user_id", user.id);
  if (error) console.log(`  ${t}: ERROR ${error.message}`);
}

const { error: updateError } = await svc.from("agent_profiles").update({
  trial_started_at: new Date().toISOString(),
  trial_ends_at: new Date(Date.now() + TRIAL_DURATION_DAYS * 86400000).toISOString(),
  subscription_status: "trial",
  login_streak: 0,
  longest_streak: 0,
  last_login_date: null,
  // Matches real signup (lib/db.ts) — new accounts skip the beta survey,
  // so a "fresh" reset must pre-stamp this, not null it.
  survey_completed_at: new Date().toISOString(),
  accent_color: "navy_blue",
  onboarding_tour_completed_at: null,
}).eq("id", user.id);
if (updateError) console.log(`  agent_profiles: ERROR ${updateError.message}`);

console.log("Done. Login is unchanged — sign in as normal to see a fresh account.");
