import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { AdminView } from "./admin-view";

export default async function AdminPage() {
  const hdrs = await headers();
  if (hdrs.get("x-is-admin") !== "true") redirect("/home");

  const supabase = createServiceClient();

  // Funnel + agents: all agent profiles
  const { data: profiles } = await supabase
    .from("agent_profiles")
    .select("id, name, phone, agency, ren_number, subscription_status, subscription_plan, trial_ends_at, subscription_activated_at, is_test_account, created_at, referral_slug, last_seen_at")
    .order("created_at", { ascending: false });

  const nowTs = new Date();
  const funnel = {
    total: (profiles ?? []).length,
    beta: (profiles ?? []).filter((p: { subscription_status: string | null; trial_ends_at: string | null }) =>
      p.subscription_status === "beta" &&
      (!p.trial_ends_at || new Date(p.trial_ends_at) > nowTs)
    ).length,
    beta_frozen: (profiles ?? []).filter((p: { subscription_status: string | null }) =>
      p.subscription_status === "beta_frozen"
    ).length,
    trial: (profiles ?? []).filter((p: { subscription_status: string | null; trial_ends_at: string | null }) =>
      p.subscription_status === "trial" &&
      (!p.trial_ends_at || new Date(p.trial_ends_at) > nowTs)
    ).length,
    expired: (profiles ?? []).filter((p: { subscription_status: string | null; trial_ends_at: string | null }) =>
      p.subscription_status === "expired" ||
      (p.subscription_status === "trial" && p.trial_ends_at && new Date(p.trial_ends_at) <= nowTs)
    ).length,
    active: (profiles ?? []).filter((p: { subscription_status: string | null }) =>
      p.subscription_status === "active"
    ).length,
    unset: (profiles ?? []).filter((p: { subscription_status: string | null }) =>
      !p.subscription_status
    ).length,
    // Elite access = paid Elite subscribers + active beta/trial agents (who get full Elite features while their trial runs)
    elite: (profiles ?? []).filter((p: { subscription_status: string | null; subscription_plan: string | null; trial_ends_at: string | null }) =>
      (p.subscription_status === "active" && p.subscription_plan === "elite") ||
      ((p.subscription_status === "beta" || p.subscription_status === "trial") && (!p.trial_ends_at || new Date(p.trial_ends_at) > nowTs))
    ).length,
  };

  // Ref links with click counts
  const { data: links } = await supabase
    .from("ref_links")
    .select("id, slug, label, created_at")
    .order("created_at", { ascending: false });

  const linkIds = (links ?? []).map((l: { id: string }) => l.id);
  let clicksByLink: Record<string, number> = {};
  let signupsBySlug: Record<string, number> = {};

  if (linkIds.length > 0) {
    const { data: clicks } = await supabase
      .from("ref_clicks")
      .select("link_id")
      .in("link_id", linkIds);
    (clicks ?? []).forEach((c: { link_id: string }) => {
      clicksByLink[c.link_id] = (clicksByLink[c.link_id] ?? 0) + 1;
    });
  }

  (profiles ?? []).forEach((p: { referral_slug?: string | null }) => {
    if (p.referral_slug) {
      signupsBySlug[p.referral_slug] = (signupsBySlug[p.referral_slug] ?? 0) + 1;
    }
  });

  const enrichedLinks = (links ?? []).map((l: { id: string; slug: string; label: string; created_at: string; sends_count?: number }) => ({
    ...l,
    clicks: clicksByLink[l.id] ?? 0,
    signups: signupsBySlug[l.slug] ?? 0,
    sends: l.sends_count ?? 0,
  }));

  const { data: feedbackRows } = await supabase
    .from("feedback")
    .select("id, agent_name, agent_email, category, message, page_url, resolved, created_at")
    .order("created_at", { ascending: false });

  const { data: inviteRows } = await supabase
    .from("invites")
    .select("id, email, invited_at, used_at")
    .order("invited_at", { ascending: false });

  const { data: waitlistRows } = await supabase
    .from("waitlist")
    .select("id, name, email, ren_number, expected_spend, created_at")
    .order("created_at", { ascending: false });

  // Survey responses — join name from agent_profiles, email resolved below via emailById
  const { data: surveyRaw } = await supabase
    .from("agent_profiles")
    .select("id, name, survey_completed_at, survey_response")
    .not("survey_completed_at", "is", null)
    .order("survey_completed_at", { ascending: false });

  // Paginate through all auth users (handles >1000 agents)
  const emailById: Record<string, string> = {};
  const createdById: Record<string, string> = {};
  const lastLoginById: Record<string, string> = {};
  let page = 1;
  while (true) {
    const { data: { users: batch } } = await supabase.auth.admin.listUsers({ perPage: 1000, page });
    if (!batch || batch.length === 0) break;
    batch.forEach((u: { id: string; email?: string; created_at: string; last_sign_in_at?: string }) => {
      if (u.email) emailById[u.id] = u.email;
      if (u.created_at) createdById[u.id] = u.created_at;
      if (u.last_sign_in_at) lastLoginById[u.id] = u.last_sign_in_at;
    });
    if (batch.length < 1000) break;
    page++;
  }

  // Engagement data per agent — fetch with created_at for time-window filtering.
  // PostgREST caps a single request at 1000 rows, and owner_leads/tenancies are both
  // well past that, so each table is paginated the same way listUsers() is above.
  async function fetchAllRows<T>(table: string, columns: string, isNullFilter?: { col: string }): Promise<T[]> {
    const rows: T[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      let query = supabase.from(table).select(columns).range(from, from + batchSize - 1);
      if (isNullFilter) query = query.is(isNullFilter.col, null);
      const { data } = await query;
      if (!data || data.length === 0) break;
      rows.push(...(data as T[]));
      if (data.length < batchSize) break;
      from += batchSize;
    }
    return rows;
  }

  const [allLeads, allTenancies, allFeedbackCounts] = await Promise.all([
    fetchAllRows<{ user_id: string; stage: string; wa_status: string | null; created_at: string; last_outreach_at: string | null; is_competitor_target: boolean | null }>(
      "owner_leads", "user_id, stage, wa_status, created_at, last_outreach_at, is_competitor_target", { col: "deleted_at" }
    ),
    fetchAllRows<{ user_id: string; created_at: string; contract_end: string | null; amount: number | null; lifecycle_stage: string | null }>("tenancies", "user_id, created_at, contract_end, amount, lifecycle_stage", { col: "deleted_at" }),
    fetchAllRows<{ agent_id: string; created_at: string }>("feedback", "agent_id, created_at"),
  ]);

  // All-time counts (for default view). "Potential listing" mirrors the homepage's
  // totalUploaded definition (lib/db.ts getExpandedDashboardStats) by excluding
  // competitor-tracking entries, so the two numbers tie.
  const leadsByUser: Record<string, { total: number; outreached: number; myListing: number; target: number }> = {};
  for (const l of allLeads ?? []) {
    if (!l.user_id) continue;
    const b = leadsByUser[l.user_id] ?? { total: 0, outreached: 0, myListing: 0, target: 0 };
    if (!l.is_competitor_target) b.total++;
    else b.target++;
    if (l.wa_status != null) b.outreached++;
    if (l.stage === "listed" && !l.is_competitor_target) b.myListing++;
    leadsByUser[l.user_id] = b;
  }
  const tenanciesByUser: Record<string, { count: number; renewalWa: number }> = {};
  const RENEWAL_WA_STAGES = new Set(["headsup", "pinged", "renewing"]);
  for (const t of allTenancies ?? []) {
    if (!t.user_id) continue;
    const b = tenanciesByUser[t.user_id] ?? { count: 0, renewalWa: 0 };
    b.count++;
    if (t.lifecycle_stage && RENEWAL_WA_STAGES.has(t.lifecycle_stage)) b.renewalWa++;
    tenanciesByUser[t.user_id] = b;
  }
  const feedbackByUser: Record<string, number> = {};
  for (const f of allFeedbackCounts ?? []) {
    if (!f.agent_id) continue;
    feedbackByUser[f.agent_id] = (feedbackByUser[f.agent_id] ?? 0) + 1;
  }

  // Raw timestamped records — passed to client for time-window recomputation
  const rawLeads = (allLeads ?? []).map((l: { user_id: string; stage: string; wa_status: string | null; created_at: string; last_outreach_at: string | null; is_competitor_target: boolean | null }) => ({
    user_id: l.user_id, stage: l.stage, wa_status: l.wa_status, created_at: l.created_at, last_outreach_at: l.last_outreach_at, is_competitor_target: l.is_competitor_target,
  }));
  const rawTenancies = (allTenancies ?? []).map((t: { user_id: string; created_at: string; contract_end: string | null; amount: number | null; lifecycle_stage: string | null }) => ({
    user_id: t.user_id, created_at: t.created_at, contract_end: t.contract_end ?? null, amount: t.amount ?? null, stage: t.lifecycle_stage ?? null,
  }));
  const rawFeedback = (allFeedbackCounts ?? []).map((f: { agent_id: string; created_at: string }) => ({
    agent_id: f.agent_id, created_at: f.created_at,
  }));

  const agents = (profiles ?? []).map((p: {
    id: string; name: string | null; phone: string | null; agency: string | null;
    ren_number: string | null; subscription_status: string | null; subscription_plan: string | null;
    trial_ends_at: string | null; subscription_activated_at: string | null; is_test_account: boolean | null;
    created_at: string; last_seen_at: string | null;
  }) => {
    const trialEnd = p.trial_ends_at ? new Date(p.trial_ends_at) : null;
    const trialDaysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - nowTs.getTime()) / 86400000) : null;
    // Use last_seen_at (stamped on every page load) — more accurate than auth.last_sign_in_at
    // which only updates on explicit sign-in, not session refreshes.
    const lastSeen = p.last_seen_at ?? null;
    const daysInactive = lastSeen
      ? Math.floor((nowTs.getTime() - new Date(lastSeen).getTime()) / 86400000)
      : null;
    return {
      id: p.id,
      name: p.name,
      email: emailById[p.id] ?? null,
      phone: p.phone,
      agency: p.agency,
      ren_number: p.ren_number,
      subscription_status: p.subscription_status,
      subscription_plan: p.subscription_plan,
      trial_days_left: trialDaysLeft,
      subscription_activated_at: p.subscription_activated_at ?? null,
      is_test_account: p.is_test_account ?? false,
      joined_at: createdById[p.id] ?? p.created_at,
      last_login_at: lastSeen,
      days_inactive: daysInactive,
      potential_listing_count: leadsByUser[p.id]?.total ?? 0,
      outreaches_sent: leadsByUser[p.id]?.outreached ?? 0,
      my_listing_count: leadsByUser[p.id]?.myListing ?? 0,
      target_listing_count: leadsByUser[p.id]?.target ?? 0,
      existing_listing_count: tenanciesByUser[p.id]?.count ?? 0,
      renewal_wa_count: tenanciesByUser[p.id]?.renewalWa ?? 0,
      feedback_count: feedbackByUser[p.id] ?? 0,
    };
  });

  const surveyResponses = (surveyRaw ?? []).map((r: {
    id: string; name: string | null; survey_completed_at: string;
    survey_response: Record<string, unknown> | null;
  }) => ({
    id: r.id,
    name: r.name,
    email: emailById[r.id] ?? null,
    survey_completed_at: r.survey_completed_at,
    role: (r.survey_response?.role as string | null) ?? null,
    tenancy_volume: (r.survey_response?.tenancy_volume as string | null) ?? null,
    tracking_before: (r.survey_response?.tracking_before as string | null) ?? null,
    beliefs: (r.survey_response?.beliefs as string[] | null) ?? [],
    willingness_to_pay: (r.survey_response?.willingness_to_pay as string | null) ?? null,
    open_feedback: (r.survey_response?.open_feedback as string | null) ?? null,
  }));

  return <AdminView funnel={funnel} links={enrichedLinks} feedback={feedbackRows ?? []} agents={agents} invites={inviteRows ?? []} waitlist={waitlistRows ?? []} surveyResponses={surveyResponses} rawLeads={rawLeads} rawTenancies={rawTenancies} rawFeedback={rawFeedback} />;
}
