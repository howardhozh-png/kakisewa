import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Replaces the local macOS cron (scripts/email-blast.mjs) — that relied on
// the machine being awake and a working local crontab, both of which turned
// out to be unreliable (crontab writes hang on this machine, and the job
// silently stopped firing around 2026-07-11). This route + email-blast-sync
// run entirely on Vercel instead.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FROM_EMAIL = "jovanne@kakisewaofficial.com";
const FROM_NAME = "Jovanne Ng";
const REPLY_TO = "kkakisewa@gmail.com";
const DAILY_LIMIT = 100;
const SEND_INTERVAL_MS = 500; // 2 req/s — Resend's rate limit
const SEQ2_AFTER_DAYS = 4;

// "rent" | "sale" | null (null = no filter). Kept in sync with Howard's
// 2026-07-12 decision to target rent-listing agents only.
const TARGET_LISTING_TYPE = "rent";

const EMAIL_RE = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

const SEQUENCES: Record<string, { subject: string; body: string }> = {
  seq1: {
    subject: "You messaged the owner. Then lost track.",
    body: `You message owners all day. The hard part is remembering who replied.

kakisewa tracks every owner and reminds you before every tenancy expires. Agents lose 70% of income from existing tenancy without tracking.

Free to sign up. kakisewa.com

How many owners are you tracking right now?

Jovanne Ng
Chief Marketing Officer, kakisewa`,
  },
  seq2: {
    subject: "Send WhatsApp outreach from anywhere",
    body: `Reply from your phone, wherever you are. No pressure, no one waiting on you.

Every message gets tracked automatically, from first contact to renewal.

RM1/day. Free for 2 months. kakisewa.com

Tell us what's holding you back? We'd really appreciate it.

Jovanne Ng
Chief Marketing Officer, kakisewa`,
  },
};

function bodyToHtml(text: string) {
  return text.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("\n");
}

const DOMAIN_TIER: Record<string, number> = {
  "gmail.com": 1, "icloud.com": 1, "me.com": 1, "mac.com": 1,
};
function domainTier(email: string) {
  const d = (email.split("@")[1] ?? "").toLowerCase();
  return DOMAIN_TIER[d] ?? 2;
}

function daysDiff(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

async function sendEmail(to: string, seq: string, resendKey: string) {
  const { subject, body } = SEQUENCES[seq];
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      reply_to: REPLY_TO,
      subject,
      text: body,
      html: bodyToHtml(body),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text.slice(0, 200)}`);
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Supabase/PostgREST caps a single response at 1000 rows regardless of a
// client-requested .range() — the contact pool is ~32k, so this pages
// through in 1000-row windows until a short page signals the end.
async function fetchAllRows<T>(query: any): Promise<T[]> {
  const PAGE = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return all;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: "No Resend key" }, { status: 500 });

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "true";
  const supabase = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  // Idempotency guard — skip if a completed run already exists for today.
  if (!dryRun) {
    const { data: existingRun } = await supabase
      .from("email_blast_runs")
      .select("id")
      .eq("run_date", today)
      .maybeSingle();
    if (existingRun) {
      return NextResponse.json({ skipped: true, reason: `Already ran today (${today}).` });
    }
  }

  const suppressedRows = (await fetchAllRows(supabase.from("email_blast_suppressed").select("type, value"))) as { type: string; value: string }[];
  const bounced = new Set(suppressedRows.filter(r => r.type === "bounced").map(r => r.value));
  const blockedDomains = new Set(suppressedRows.filter(r => r.type === "blocked_domain").map(r => r.value));
  const deferredDomains = new Set(suppressedRows.filter(r => r.type === "deferred_domain").map(r => r.value));

  let query = supabase
    .from("email_blast_contacts")
    .select("email, seq1_sent_at, seq2_sent_at, seq1_opened")
    .is("seq3_sent_at", null); // seq3 disabled per Howard
  if (TARGET_LISTING_TYPE) query = query.eq("listing_type", TARGET_LISTING_TYPE);

  let contacts: { email: string; seq1_sent_at: string | null; seq2_sent_at: string | null; seq1_opened: boolean }[];
  try {
    contacts = await fetchAllRows(query);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }

  let skippedBounce = 0, skippedDeferred = 0, skippedNotOpened = 0;
  const candidates: { email: string; seq: string; tier: number }[] = [];

  for (const c of contacts ?? []) {
    const email = c.email as string;
    if (!EMAIL_RE.test(email)) continue;
    const domain = email.split("@")[1] ?? "";
    if (bounced.has(email) || blockedDomains.has(domain)) { skippedBounce++; continue; }
    if (deferredDomains.has(domain)) { skippedDeferred++; continue; }

    let seq: string | null = null;
    if (!c.seq1_sent_at) {
      seq = "seq1";
    } else if (!c.seq2_sent_at && daysDiff(c.seq1_sent_at) >= SEQ2_AFTER_DAYS) {
      if (c.seq1_opened) seq = "seq2";
      else skippedNotOpened++;
    }
    if (seq) candidates.push({ email, seq, tier: domainTier(email) });
  }

  candidates.sort((a, b) => a.tier - b.tier);
  const queue = candidates.slice(0, DAILY_LIMIT);
  const counts = { seq1: queue.filter(q => q.seq === "seq1").length, seq2: queue.filter(q => q.seq === "seq2").length };

  const summary = {
    dryRun,
    totalCandidatePool: contacts?.length ?? 0,
    skippedBounce,
    skippedDeferred,
    skippedNotOpened,
    queueSize: queue.length,
    counts,
    sample: queue.slice(0, 5).map(q => ({ email: q.email, seq: q.seq })),
  };

  if (dryRun) return NextResponse.json(summary);

  if (queue.length === 0) {
    await supabase.from("email_blast_runs").insert({ run_date: today, seq1_sent: 0, seq2_sent: 0, failed: 0 });
    return NextResponse.json({ ...summary, sent: 0, failed: 0 });
  }

  let sent = 0, failed = 0;
  const sentCounts = { seq1: 0, seq2: 0 };
  for (const item of queue) {
    try {
      await sendEmail(item.email, item.seq, resendKey);
      await supabase.from("email_blast_contacts").update({ [`${item.seq}_sent_at`]: today }).eq("email", item.email);
      sent++;
      sentCounts[item.seq as "seq1" | "seq2"]++;
    } catch (err) {
      failed++;
      console.error(`FAILED [${item.seq}] ${item.email}:`, err instanceof Error ? err.message : err);
    }
    await sleep(SEND_INTERVAL_MS);
  }

  await supabase.from("email_blast_runs").insert({ run_date: today, seq1_sent: sentCounts.seq1, seq2_sent: sentCounts.seq2, failed });

  return NextResponse.json({ ...summary, sent, failed, at: new Date().toISOString() });
}
