import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Vercel Cron passes this header; skip auth check in dev
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  function dayWindow(daysFromNow: number) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end   = new Date(d); end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  const w1 = dayWindow(1);
  const w3 = dayWindow(3);

  // Find agents expiring tomorrow (1-day) or in 3 days (3-day warning)
  const { data: expiring1 } = await supabase
    .from("agent_profiles").select("id, name")
    .eq("subscription_status", "trial")
    .gte("trial_ends_at", w1.start).lte("trial_ends_at", w1.end);

  const { data: expiring3 } = await supabase
    .from("agent_profiles").select("id, name")
    .eq("subscription_status", "trial")
    .gte("trial_ends_at", w3.start).lte("trial_ends_at", w3.end);

  type AgentRow = { id: string; name: string | null };
  const expiring = [
    ...(expiring1 ?? []).map((a: AgentRow) => ({ ...a, days: 1 })),
    ...(expiring3 ?? []).map((a: AgentRow) => ({ ...a, days: 3 })),
  ];

  if (!expiring || expiring.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Fetch emails from auth.users via admin API
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailById = Object.fromEntries((users ?? []).map((u: { id: string; email?: string }) => [u.id, u.email]));

  let sent = 0;
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: "No Resend key" }, { status: 500 });

  for (const agent of expiring) {
    const email = emailById[agent.id];
    if (!email) continue;

    const firstName = (agent.name ?? "").split(" ")[0] || "there";
    const days = (agent as { days: number }).days;
    const subject = days === 1 ? "Your free trial ends tomorrow" : "Your free trial ends in 3 days";
    const headline = days === 1 ? `Hi ${firstName}, your trial ends tomorrow` : `Hi ${firstName}, 3 days left on your trial`;
    const body = days === 1
      ? "Your 14-day free trial ends tomorrow. Upgrade now to keep tracking your contracts, commissions, and tenants without interruption."
      : "You have 3 days left on your kakisewa trial. Upgrade to keep everything running — contracts, renewals, tenant packs, and commissions.";
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "kakisewa <noreply@kakisewa.com>",
        to: [email],
        subject,
        html: `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
  <p style="font-size:22px;font-weight:700;letter-spacing:-0.02em;margin:0 0 24px">kakisewa</p>
  <h1 style="font-size:18px;font-weight:600;margin:0 0 8px">${headline}</h1>
  <p style="font-size:14px;color:#6C6C70;margin:0 0 24px">${body}</p>
  <a href="https://www.kakisewa.com/subscription"
    style="display:inline-block;background:#1C1C1E;color:#fff;font-size:14px;font-weight:600;
           padding:12px 24px;border-radius:10px;text-decoration:none">
    View plans
  </a>
  <p style="font-size:12px;color:#AEAEB2;margin:24px 0 0">Silver starts at RM 39/month. Cancel anytime.</p>
</div>`,
      }),
    });
    sent++;
  }

  return NextResponse.json({ sent });
}
