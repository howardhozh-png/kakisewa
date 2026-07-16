import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Runs an hour before /api/cron/email-blast so the send route can read
// fresh bounce/open state straight from the DB instead of paginating
// Resend's API itself — keeps the send route's own runtime small and
// predictable within Vercel's function duration limit.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SEQ1_SUBJECT = "You messaged the owner. Then lost track.";
const FROM_NAME = "Jovanne Ng";
// Bounded to the last ~15 pages (up to 1500 most-recent emails, newest
// first) — plenty for a 100/day send volume, avoids scanning the entire
// campaign history on every run.
const MAX_PAGES = 15;

async function resendGet(path: string, apiKey: string) {
  const res = await fetch(`https://api.resend.com${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return res.json();
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: "No Resend key" }, { status: 500 });

  const supabase = createServiceClient();

  const bounced = new Set<string>();
  const openedSeq1 = new Set<string>();
  let after: string | null = null;

  for (let i = 0; i < MAX_PAGES; i++) {
    const path = "/emails" + (after ? `?after=${after}&limit=100` : "?limit=100");
    let r: any;
    for (let retry = 0; retry < 5; retry++) {
      r = await resendGet(path, resendKey);
      if (r?.statusCode === 429) { await new Promise(res => setTimeout(res, 1200)); continue; }
      break;
    }
    if (!r?.data || r.data.length === 0) break;
    for (const item of r.data) {
      if (item.last_event === "bounced" && item.from?.startsWith(FROM_NAME)) {
        for (const to of item.to) bounced.add(to.toLowerCase());
      }
      if (item.subject === SEQ1_SUBJECT && (item.last_event === "opened" || item.last_event === "clicked")) {
        for (const to of item.to) openedSeq1.add(to.toLowerCase());
      }
    }
    if (!r.has_more) break;
    after = r.data[r.data.length - 1].id;
  }

  let newBounces = 0;
  if (bounced.size > 0) {
    const rows = [...bounced].map(value => ({ type: "bounced", value }));
    const { error } = await supabase.from("email_blast_suppressed").upsert(rows, { onConflict: "type,value" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    newBounces = rows.length;
  }

  let openedUpdated = 0;
  if (openedSeq1.size > 0) {
    const { error } = await supabase
      .from("email_blast_contacts")
      .update({ seq1_opened: true })
      .in("email", [...openedSeq1]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    openedUpdated = openedSeq1.size;
  }

  return NextResponse.json({
    bouncedSynced: newBounces,
    seq1OpensSynced: openedUpdated,
    at: new Date().toISOString(),
  });
}
