import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { AdminView } from "./admin-view";

export default async function AdminPage() {
  const hdrs = await headers();
  if (hdrs.get("x-is-admin") !== "true") redirect("/home");

  const supabase = createServiceClient();

  // Funnel: all agent profiles
  const { data: profiles } = await supabase
    .from("agent_profiles")
    .select("id, name, subscription_status, trial_ends_at, created_at, referral_slug");

  const now = new Date();
  const funnel = {
    total: (profiles ?? []).length,
    trial: (profiles ?? []).filter((p: { subscription_status: string | null; trial_ends_at: string | null }) =>
      p.subscription_status === "trial" &&
      p.trial_ends_at &&
      new Date(p.trial_ends_at) > now
    ).length,
    expired: (profiles ?? []).filter((p: { subscription_status: string | null; trial_ends_at: string | null }) =>
      p.subscription_status === "expired" ||
      (p.subscription_status === "trial" && p.trial_ends_at && new Date(p.trial_ends_at) <= now)
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

  return <AdminView funnel={funnel} links={enrichedLinks} feedback={feedbackRows ?? []} />;
}
