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

  // Paginate through all auth users (handles >1000 agents)
  const emailById: Record<string, string> = {};
  const createdById: Record<string, string> = {};
  let page = 1;
  while (true) {
    const { data: { users: batch } } = await supabase.auth.admin.listUsers({ perPage: 1000, page });
    if (!batch || batch.length === 0) break;
    batch.forEach((u: { id: string; email?: string; created_at: string }) => {
      if (u.email) emailById[u.id] = u.email;
      if (u.created_at) createdById[u.id] = u.created_at;
    });
    if (batch.length < 1000) break;
    page++;
  }

  const agents = (profiles ?? []).map((p: {
    id: string; name: string | null; phone: string | null; agency: string | null;
    ren_number: string | null; subscription_status: string | null; subscription_plan: string | null;
    trial_ends_at: string | null; created_at: string;
  }) => {
    const trialEnd = p.trial_ends_at ? new Date(p.trial_ends_at) : null;
    const trialDaysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - nowTs.getTime()) / 86400000) : null;
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
    };
  });

  return <AdminView funnel={funnel} links={enrichedLinks} feedback={feedbackRows ?? []} agents={agents} />;
}
