import { createServiceClient } from "@/lib/supabase/service";
import type { AgentProfile, Announcement } from "@/lib/types";

// Returns published announcements the user has not yet dismissed,
// filtered by their subscription status and plan.
export async function getUnreadAnnouncements(agent: AgentProfile): Promise<Announcement[]> {
  if (!agent.id || agent.id === 0) return [];

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  if (!data || data.length === 0) return [];

  const dismissed = new Set(agent.dismissed_announcement_ids ?? []);
  const status = agent.subscription_status ?? null;
  const plan = agent.subscription_plan ?? null;

  return data.filter((a: Announcement) => {
    if (dismissed.has(a.id)) return false;
    if (a.target_status && a.target_status.length > 0) {
      if (!status || !a.target_status.includes(status)) return false;
    }
    if (a.target_plan && a.target_plan.length > 0) {
      if (!plan || !a.target_plan.includes(plan)) return false;
    }
    return true;
  });
}

// Appends announcementId to the user's dismissed_announcement_ids array.
export async function dismissAnnouncement(userId: string, announcementId: string): Promise<void> {
  const supabase = createServiceClient();
  // Use postgres array append to avoid race conditions on concurrent dismissals
  await supabase.rpc("append_dismissed_announcement", {
    p_user_id: userId,
    p_announcement_id: announcementId,
  });
}

// Admin: list all announcements newest first.
export async function listAnnouncements(): Promise<Announcement[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as Announcement[];
}

// Admin: create a draft announcement.
export async function createAnnouncement(input: {
  title: string;
  body: string;
  cta_label?: string;
  cta_url?: string;
  target_status?: string[];
  target_plan?: string[];
  send_push?: boolean;
}): Promise<Announcement> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("announcements")
    .insert({ ...input, send_push: input.send_push ?? false })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Announcement;
}

// Admin: publish an announcement. Fires push if send_push = true.
export async function publishAnnouncement(id: string): Promise<void> {
  const supabase = createServiceClient();
  const { data: ann, error } = await supabase
    .from("announcements")
    .update({ published_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  if (!ann.send_push) return;

  // Fan out push to all matching users (fire and forget)
  fanOutPush(ann).catch(() => {});
}

async function fanOutPush(ann: Announcement): Promise<void> {
  const supabase = createServiceClient();
  let query = supabase
    .from("agent_profiles")
    .select("id, subscription_status, subscription_plan")
    .not("id", "is", null);

  const { data: profiles } = await query;
  if (!profiles) return;

  const { sendPushToUser } = await import("@/lib/push");

  const targets = profiles.filter((p: { id: string; subscription_status: string | null; subscription_plan: string | null }) => {
    if (ann.target_status && ann.target_status.length > 0) {
      if (!p.subscription_status || !ann.target_status.includes(p.subscription_status)) return false;
    }
    if (ann.target_plan && ann.target_plan.length > 0) {
      if (!p.subscription_plan || !ann.target_plan.includes(p.subscription_plan)) return false;
    }
    return true;
  });

  await Promise.allSettled(
    targets.map((p: { id: string }) =>
      sendPushToUser(p.id, {
        title: ann.title,
        body: ann.body,
        url: ann.cta_url ?? "/home",
        tag: `announcement_${ann.id}`,
      })
    )
  );
}

// Admin: count how many users have dismissed a given announcement.
export async function getReadCount(announcementId: string): Promise<number> {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from("agent_profiles")
    .select("id", { count: "exact", head: true })
    .contains("dismissed_announcement_ids", [announcementId]);
  return count ?? 0;
}
