import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();

  // Today in MYT (UTC+8)
  const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;
  const nowMyt = new Date(now.getTime() + MYT_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayMyt = `${nowMyt.getUTCFullYear()}-${pad(nowMyt.getUTCMonth() + 1)}-${pad(nowMyt.getUTCDate())}`;

  const { data: optedOut } = await supabase
    .from("agent_profiles")
    .select("id")
    .eq("notif_push", false);
  const pushOptedOut = new Set((optedOut ?? []).map((r: { id: string }) => r.id));

  // Priority 1: Uncontacted imported leads (never outreached)
  const { data: p1Leads } = await supabase
    .from("owner_leads")
    .select("id, user_id, owner_name, property_name, unit")
    .is("deleted_at", null)
    .eq("stage", "imported")
    .or("outreach_count.is.null,outreach_count.eq.0")
    .order("created_at", { ascending: true });

  // Priority 2: No-response leads older than 3 days
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString();
  const { data: p2Leads } = await supabase
    .from("owner_leads")
    .select("id, user_id, owner_name, property_name, unit")
    .is("deleted_at", null)
    .eq("wa_status", "no_response")
    .lt("last_outreach_at", threeDaysAgo)
    .order("last_outreach_at", { ascending: true });

  // Priority 3: Intake completed but property not yet listed
  const { data: p3Leads } = await supabase
    .from("owner_leads")
    .select("id, user_id, owner_name, property_name, unit")
    .is("deleted_at", null)
    .not("intake_completed_at", "is", null)
    .eq("stage", "wants_rent")
    .order("intake_completed_at", { ascending: true });

  // Group by user — take first (oldest) match per priority level
  type NudgeLead = { id: string; user_id: string; owner_name: string; property_name: string | null; unit: string | null };
  const p1ByUser = new Map<string, NudgeLead>();
  const p2ByUser = new Map<string, NudgeLead>();
  const p3ByUser = new Map<string, NudgeLead>();

  for (const row of p1Leads ?? []) {
    if (row.user_id && !p1ByUser.has(row.user_id)) p1ByUser.set(row.user_id, row as NudgeLead);
  }
  for (const row of p2Leads ?? []) {
    if (row.user_id && !p2ByUser.has(row.user_id)) p2ByUser.set(row.user_id, row as NudgeLead);
  }
  for (const row of p3Leads ?? []) {
    if (row.user_id && !p3ByUser.has(row.user_id)) p3ByUser.set(row.user_id, row as NudgeLead);
  }

  const allUserIds = new Set([...p1ByUser.keys(), ...p2ByUser.keys(), ...p3ByUser.keys()]);

  let sent = 0, skipped = 0, errors = 0;

  for (const userId of allUserIds) {
    if (pushOptedOut.has(userId)) { skipped++; continue; }

    const nudgeKey = `nudge_${todayMyt}_${userId}`;

    const { data: alreadySent } = await supabase
      .from("push_sent_log")
      .select("id")
      .eq("user_id", userId)
      .eq("notification_key", nudgeKey)
      .maybeSingle();

    if (alreadySent) { skipped++; continue; }

    const { count } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (!count || count === 0) { skipped++; continue; }

    // Pick highest priority
    const lead = p1ByUser.get(userId) ?? p2ByUser.get(userId) ?? p3ByUser.get(userId);
    if (!lead) { skipped++; continue; }

    const propParts = [lead.property_name, lead.unit ? `Unit ${lead.unit}` : null].filter(Boolean);
    const propLabel = propParts.join(" · ") || null;

    let title: string;
    let body: string;
    let url: string;

    if (p1ByUser.has(userId)) {
      title = "Say hello to a new lead";
      body = propLabel
        ? `${lead.owner_name} · ${propLabel} — haven't reached out yet`
        : `${lead.owner_name} — haven't reached out yet`;
      url = "/new-owners";
    } else if (p2ByUser.has(userId)) {
      title = "Follow up with your lead";
      body = propLabel
        ? `${lead.owner_name} · ${propLabel} — no reply in 3 days`
        : `${lead.owner_name} — no reply in 3 days`;
      url = "/new-owners";
    } else {
      title = "Time to list this property";
      body = propLabel
        ? `${propLabel} · ${lead.owner_name} — intake done, ready to market`
        : `${lead.owner_name} — intake done, ready to market`;
      url = "/my-listing";
    }

    const result = await sendPushToUser(userId, { title, body, url, tag: nudgeKey });

    if (result.sent > 0) {
      await supabase.from("push_sent_log").insert({ user_id: userId, notification_key: nudgeKey });
      sent += result.sent;
    } else {
      errors++;
    }
  }

  return NextResponse.json({ sent, skipped, errors, users: allUserIds.size, at: now.toISOString() });
}
