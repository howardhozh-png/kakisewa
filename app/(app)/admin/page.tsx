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
    .select("id, name, phone, agency, ren_number, subscription_status, subscription_plan, trial_ends_at, created_at, referral_slug")
    .order("created_at", { ascending: false });

  const nowTs = new Date();
  const funnel = {
    total: (profiles ?? []).length,
    beta: (profiles ?? []).filter((p: { subscription_status: string | null; trial_ends_at: string | null }) =>
      p.subscription_status === "beta" &&
      p.trial_ends_at &&
      new Date(p.trial_ends_at) > nowTs
    ).length,
    beta_frozen: (profiles ?? []).filter((p: { subscription_status: string | null }) =>
      p.subscription_status === "beta_frozen"
    ).length,
    trial: (profiles ?? []).filter((p: { subscription_status: string | null; trial_ends_at: string | null }) =>
      p.subscription_status === "trial" &&
      p.trial_ends_at &&
      new Date(p.trial_ends_at) > nowTs
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
      ((p.subscription_status === "beta" || p.subscription_status === "trial") && p.trial_ends_at && new Date(p.trial_ends_at) > nowTs)
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
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: inviteRows } = await supabase
    .from("invites")
    .select("id, email, invited_at, used_at")
    .order("invited_at", { ascending: false });

  const { data: waitlistRows } = await supabase
    .from("waitlist")
    .select("id, name, email, ren_number, expected_spend, created_at")
    .order("created_at", { ascending: false });

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

  // Engagement data per agent — fetch with created_at for time-window filtering
  const [{ data: allLeads }, { data: allTenancies }, { data: allFeedbackCounts }] = await Promise.all([
    supabase.from("owner_leads").select("user_id, stage, wa_status, created_at, last_outreach_at").is("deleted_at", null),
    supabase.from("tenancies").select("user_id, created_at").is("deleted_at", null),
    supabase.from("feedback").select("agent_id, created_at"),
  ]);

  // All-time counts (for default view)
  const leadsByUser: Record<string, { total: number; outreached: number; myListing: number }> = {};
  for (const l of allLeads ?? []) {
    if (!l.user_id) continue;
    const b = leadsByUser[l.user_id] ?? { total: 0, outreached: 0, myListing: 0 };
    b.total++;
    if (l.wa_status != null) b.outreached++;
    if (["wants_rent", "listed", "matched"].includes(l.stage)) b.myListing++;
    leadsByUser[l.user_id] = b;
  }
  const tenanciesByUser: Record<string, number> = {};
  for (const t of allTenancies ?? []) {
    if (!t.user_id) continue;
    tenanciesByUser[t.user_id] = (tenanciesByUser[t.user_id] ?? 0) + 1;
  }
  const feedbackByUser: Record<string, number> = {};
  for (const f of allFeedbackCounts ?? []) {
    if (!f.agent_id) continue;
    feedbackByUser[f.agent_id] = (feedbackByUser[f.agent_id] ?? 0) + 1;
  }

  // Raw timestamped records — passed to client for time-window recomputation
  const rawLeads = (allLeads ?? []).map((l: { user_id: string; stage: string; wa_status: string | null; created_at: string; last_outreach_at: string | null }) => ({
    user_id: l.user_id, stage: l.stage, wa_status: l.wa_status, created_at: l.created_at, last_outreach_at: l.last_outreach_at,
  }));
  const rawTenancies = (allTenancies ?? []).map((t: { user_id: string; created_at: string }) => ({
    user_id: t.user_id, created_at: t.created_at,
  }));
  const rawFeedback = (allFeedbackCounts ?? []).map((f: { agent_id: string; created_at: string }) => ({
    agent_id: f.agent_id, created_at: f.created_at,
  }));

  const agents = (profiles ?? []).map((p: {
    id: string; name: string | null; phone: string | null; agency: string | null;
    ren_number: string | null; subscription_status: string | null; subscription_plan: string | null;
    trial_ends_at: string | null; created_at: string;
  }) => {
    const trialEnd = p.trial_ends_at ? new Date(p.trial_ends_at) : null;
    const trialDaysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - nowTs.getTime()) / 86400000) : null;
    const lastLogin = lastLoginById[p.id] ?? null;
    const daysInactive = lastLogin
      ? Math.floor((nowTs.getTime() - new Date(lastLogin).getTime()) / 86400000)
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
      joined_at: createdById[p.id] ?? p.created_at,
      last_login_at: lastLogin,
      days_inactive: daysInactive,
      potential_listing_count: leadsByUser[p.id]?.total ?? 0,
      outreaches_sent: leadsByUser[p.id]?.outreached ?? 0,
      my_listing_count: leadsByUser[p.id]?.myListing ?? 0,
      existing_listing_count: tenanciesByUser[p.id] ?? 0,
      feedback_count: feedbackByUser[p.id] ?? 0,
    };
  });

  return <AdminView funnel={funnel} links={enrichedLinks} feedback={feedbackRows ?? []} agents={agents} invites={inviteRows ?? []} waitlist={waitlistRows ?? []} rawLeads={rawLeads} rawTenancies={rawTenancies} rawFeedback={rawFeedback} />;
}
