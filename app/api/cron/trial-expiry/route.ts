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
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = new Date(tomorrow);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(23, 59, 59, 999);

  // Find agents whose trial expires tomorrow and haven't paid
  const { data: expiring } = await supabase
    .from("agent_profiles")
    .select("id, name, phone")
    .eq("subscription_status", "trial")
    .gte("trial_ends_at", tomorrowStart.toISOString())
    .lte("trial_ends_at", tomorrowEnd.toISOString());

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
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "kakisewa <noreply@kakisewa.com>",
        to: [email],
        subject: "Your free trial ends tomorrow",
        html: `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
  <p style="font-size:22px;font-weight:700;letter-spacing:-0.02em;margin:0 0 24px">kakisewa</p>
  <h1 style="font-size:18px;font-weight:600;margin:0 0 8px">Hi ${firstName}, your trial ends tomorrow</h1>
  <p style="font-size:14px;color:#6C6C70;margin:0 0 24px">
    Your 14-day free trial is ending. Upgrade now to keep tracking your contracts, commissions, and tenants — no interruptions.
  </p>
  <a href="https://www.kakisewa.com/subscription"
    style="display:inline-block;background:#1C1C1E;color:#fff;font-size:14px;font-weight:600;
           padding:12px 24px;border-radius:10px;text-decoration:none">
    View plans
  </a>
  <p style="font-size:12px;color:#AEAEB2;margin:24px 0 0">
    Silver starts at RM 39/month. Cancel anytime.
  </p>
</div>`,
      }),
    });
    sent++;
  }

  return NextResponse.json({ sent });
}
