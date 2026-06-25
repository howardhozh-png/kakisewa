import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendPushToUser } from "@/lib/push";
import { sendAgentEmail, calendarDigestEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmtTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function eventTypeLabel(eventType: string | null): string {
  if (eventType === "viewing")    return "Viewing";
  if (eventType === "call")       return "Call";
  if (eventType === "focus_time") return "Focus time";
  return "Event";
}

function buildDateLabel(d: Date): string {
  // d is a UTC Date representing MYT local midnight
  const dow   = DAYS[d.getUTCDay()];
  const day   = d.getUTCDate();
  const month = MONTHS[d.getUTCMonth()];
  return `${dow}, ${day} ${month}`;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();

  // Today's date in MYT (UTC+8)
  const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;
  const nowMyt = new Date(now.getTime() + MYT_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayMyt = `${nowMyt.getUTCFullYear()}-${pad(nowMyt.getUTCMonth() + 1)}-${pad(nowMyt.getUTCDate())}`;
  const dateLabel = buildDateLabel(nowMyt);
  const emailSubject = `Your kakisewa schedule for ${dateLabel}`;

  // ── Test mode: send example email to howardhozh@gmail.com ────────────────────
  const isTest = req.nextUrl.searchParams.get("test") === "1";
  if (isTest) {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return NextResponse.json({ error: "No RESEND_API_KEY" }, { status: 500 });

    const testEvents = [
      { time: "09:00", title: "Viewing", subtitle: "Azman bin Ghani · Taman Desa" },
      { time: "14:00", title: "Call", subtitle: "Puan Rozita · Cheras Hartamas" },
      { time: "16:30", title: "Focus time", subtitle: null },
      { time: null,    title: "Viewing", subtitle: "Ahmad Fadzli · PJ Selatan (all day)" },
    ];

    const html = calendarDigestEmail({ dateLabel, events: testEvents });
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "kakisewa <noreply@kakisewa.com>",
        to: ["howardhozh@gmail.com"],
        subject: `[TEST] ${emailSubject}`,
        html,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ test: true, status: res.status, data });
  }

  // ── Fetch all events for today ───────────────────────────────────────────────
  const { data: events } = await supabase
    .from("calendar_events")
    .select("id, user_id, title, subtitle, event_date, event_time, event_type")
    .eq("event_date", todayMyt);

  if (!events || events.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, errors: 0, at: now.toISOString() });
  }

  // Group by user_id
  const byUser = new Map<string, typeof events>();
  for (const ev of events) {
    const list = byUser.get(ev.user_id) ?? [];
    list.push(ev);
    byUser.set(ev.user_id, list);
  }

  // Fetch push opt-outs once
  const { data: optedOut } = await supabase
    .from("agent_profiles")
    .select("id")
    .eq("notif_push", false);
  const pushOptedOut = new Set((optedOut ?? []).map((r: { id: string }) => r.id));

  let sent = 0, skipped = 0, errors = 0;

  for (const [userId, userEvents] of byUser) {
    // Sort: timed events by time, all-day at end
    const sorted = [...userEvents].sort((a, b) => {
      if (!a.event_time && !b.event_time) return 0;
      if (!a.event_time) return 1;
      if (!b.event_time) return -1;
      return a.event_time.localeCompare(b.event_time);
    });

    const digestKey = `cal_digest_${todayMyt}`;

    // ── Push notification ────────────────────────────────────────────────────
    if (!pushOptedOut.has(userId)) {
      const { data: already } = await supabase
        .from("push_sent_log")
        .select("id")
        .eq("user_id", userId)
        .eq("notification_key", digestKey)
        .maybeSingle();

      if (!already) {
        const { count } = await supabase
          .from("push_subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);

        if (count && count > 0) {
          let pushTitle: string;
          let pushBody: string;

          if (sorted.length === 1) {
            const ev = sorted[0];
            pushTitle = `${eventTypeLabel(ev.event_type)} today`;
            const desc = ev.subtitle || ev.title;
            pushBody = ev.event_time ? `${desc} · ${fmtTime12(ev.event_time)}` : desc;
          } else {
            pushTitle = `${sorted.length} events today`;
            pushBody = sorted
              .slice(0, 3)
              .map((ev) => {
                const label = eventTypeLabel(ev.event_type);
                return ev.event_time ? `${label} at ${fmtTime12(ev.event_time)}` : label;
              })
              .join(", ");
          }

          const result = await sendPushToUser(userId, {
            title: pushTitle,
            body:  pushBody,
            url:   "/calendar",
            tag:   digestKey,
          });

          if (result.sent > 0) {
            await supabase.from("push_sent_log").insert({ user_id: userId, notification_key: digestKey });
            sent += result.sent;
          } else {
            errors++;
          }
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    } else {
      skipped++;
    }

    // ── Email digest ─────────────────────────────────────────────────────────
    // sendAgentEmail internally checks notif_email — no need to guard here
    const emailEvents = sorted.map((ev) => ({
      time:     ev.event_time ?? null,
      title:    ev.title ?? eventTypeLabel(ev.event_type),
      subtitle: ev.subtitle ?? null,
    }));

    try {
      await sendAgentEmail(
        userId,
        emailSubject,
        calendarDigestEmail({ dateLabel, events: emailEvents }),
      );
    } catch (err) {
      console.error("[calendar-digest] email error for user", userId, err);
      errors++;
    }
  }

  return NextResponse.json({ sent, skipped, errors, users: byUser.size, at: now.toISOString() });
}
