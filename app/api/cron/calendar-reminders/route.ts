import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

function fmtTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function getTitle(eventType: string | null, allDay = false): string {
  const suffix = allDay ? "today" : "in 1 hour";
  if (eventType === "viewing")    return `Viewing ${suffix}`;
  if (eventType === "call")       return `Call ${suffix}`;
  if (eventType === "focus_time") return `Focus time ${suffix}`;
  return `Event ${suffix}`;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();

  // Window: events happening 55–65 min from now.
  // All times are treated as Malaysia UTC+8 local time.
  // Using a 10-minute window handles cron drift while keeping notifications timely.
  const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;
  const winStartUtc = new Date(now.getTime() + 55 * 60 * 1000);
  const winEndUtc   = new Date(now.getTime() + 65 * 60 * 1000);

  // Express window boundaries in MYT to query event_date (stored as MYT local date)
  const winStartMyt = new Date(winStartUtc.getTime() + MYT_OFFSET_MS);
  const winEndMyt   = new Date(winEndUtc.getTime()   + MYT_OFFSET_MS);

  const pad = (n: number) => String(n).padStart(2, "0");
  const fmtDate = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

  // Current hour in MYT — used to gate the all-day notification pass
  const nowMyt = new Date(now.getTime() + MYT_OFFSET_MS);
  const mytHour = nowMyt.getUTCHours(); // 0–23 in MYT
  const todayMyt = fmtDate(nowMyt);

  const startDate = fmtDate(winStartMyt);
  const endDate   = fmtDate(winEndMyt);
  const dates     = startDate === endDate ? [startDate] : [startDate, endDate];

  // Fetch opted-out users once
  const { data: optedOut } = await supabase
    .from("agent_profiles")
    .select("id")
    .eq("notif_push", false);
  const pushOptedOut = new Set((optedOut ?? []).map((r: { id: string }) => r.id));

  // Fetch all calendar events for the target date(s) that have a time set.
  // user_id is NOT NULL on calendar_events — every row is owned by exactly one agent.
  const { data: events } = await supabase
    .from("calendar_events")
    .select("id, user_id, title, subtitle, event_date, event_time, event_type, card_href")
    .not("event_time", "is", null)
    .in("event_date", dates);

  let sent = 0, skipped = 0, errors = 0;

  for (const ev of events ?? []) {
    // Parse event datetime as MYT local and compare against UTC window
    const evUtc = new Date(`${ev.event_date}T${ev.event_time}:00+08:00`);
    if (evUtc < winStartUtc || evUtc > winEndUtc) continue;

    // Dedup — one notification per event, ever
    const notifKey = `cal_${ev.id}_1h`;

    const { data: already } = await supabase
      .from("push_sent_log")
      .select("id")
      .eq("user_id", ev.user_id)
      .eq("notification_key", notifKey)
      .maybeSingle();

    if (already) { skipped++; continue; }
    if (pushOptedOut.has(ev.user_id)) { skipped++; continue; }

    // Check this user has at least one active push subscription
    const { count } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ev.user_id);

    if (!count || count === 0) { skipped++; continue; }

    const timeStr = fmtTime12(ev.event_time);
    const desc    = (ev.subtitle || ev.title) as string;

    // Send push scoped strictly to ev.user_id — no cross-user leakage possible
    const result = await sendPushToUser(ev.user_id, {
      title: getTitle(ev.event_type),
      body:  `${desc} · ${timeStr}`,
      url:   ev.card_href || "/calendar",
      tag:   notifKey,
    });

    if (result.sent > 0) {
      await supabase.from("push_sent_log").insert({
        user_id:          ev.user_id,
        notification_key: notifKey,
      });
      sent += result.sent;
    } else {
      errors++;
    }
  }

  // ── All-day events: notify at 8 AM MYT (00:00 UTC) ──────────────────────────
  // Only runs on the 8 AM MYT pass (cron fires at 00:00 UTC = 08:00 MYT).
  if (mytHour === 8) {
    const { data: allDayEvents } = await supabase
      .from("calendar_events")
      .select("id, user_id, title, subtitle, event_date, event_type, card_href")
      .is("event_time", null)
      .eq("event_date", todayMyt);

    for (const ev of allDayEvents ?? []) {
      const notifKey = `cal_${ev.id}_day`;

      const { data: already } = await supabase
        .from("push_sent_log")
        .select("id")
        .eq("user_id", ev.user_id)
        .eq("notification_key", notifKey)
        .maybeSingle();

      if (already) { skipped++; continue; }
      if (pushOptedOut.has(ev.user_id)) { skipped++; continue; }

      const { count } = await supabase
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", ev.user_id);

      if (!count || count === 0) { skipped++; continue; }

      const desc = (ev.subtitle || ev.title) as string;

      const result = await sendPushToUser(ev.user_id, {
        title: getTitle(ev.event_type, true),
        body:  desc,
        url:   ev.card_href || "/calendar",
        tag:   notifKey,
      });

      if (result.sent > 0) {
        await supabase.from("push_sent_log").insert({
          user_id:          ev.user_id,
          notification_key: notifKey,
        });
        sent += result.sent;
      } else {
        errors++;
      }
    }
  }

  return NextResponse.json({ sent, skipped, errors, at: now.toISOString() });
}
