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
  function dayWindow(daysFromNow: number) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end   = new Date(d); end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  const w1  = dayWindow(1);
  const w3  = dayWindow(3);
  const w7  = dayWindow(7);
  const w14 = dayWindow(14);

  type AgentRow = { id: string; name: string | null; stripe_subscription_id: string | null };

  async function fetchExpiring(days: number, window: { start: string; end: string }) {
    const [{ data: beta }, { data: trial }] = await Promise.all([
      supabase.from("agent_profiles").select("id, name, stripe_subscription_id")
        .eq("subscription_status", "beta")
        .gte("trial_ends_at", window.start).lte("trial_ends_at", window.end),
      // Skip trial users who have already saved a card in Stripe (they'll be auto-charged)
      supabase.from("agent_profiles").select("id, name, stripe_subscription_id")
        .eq("subscription_status", "trial")
        .is("stripe_subscription_id", null)
        .gte("trial_ends_at", window.start).lte("trial_ends_at", window.end),
    ]);
    return [
      ...(beta ?? []).map((a: AgentRow) => ({ ...a, days, isBeta: true })),
      ...(trial ?? []).map((a: AgentRow) => ({ ...a, days, isBeta: false })),
    ];
  }

  const [ex1, ex3, ex7, ex14] = await Promise.all([
    fetchExpiring(1, w1),
    fetchExpiring(3, w3),
    fetchExpiring(7, w7),
    fetchExpiring(14, w14),
  ]);

  const expiring = [...ex1, ...ex3, ...ex7, ...ex14];

  if (expiring.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailById = Object.fromEntries((users ?? []).map((u: { id: string; email?: string }) => [u.id, u.email]));

  let sent = 0;
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: "No Resend key" }, { status: 500 });

  for (const agent of expiring) {
    const email = emailById[agent.id];
    if (!email) continue;

    const firstName = (agent.name ?? "").split(" ")[0] || "there";
    const { days, isBeta } = agent as { days: number; isBeta: boolean };
    const periodLabel = isBeta ? "beta period" : "trial";

    const subject =
      days === 1  ? `Your ${periodLabel} ends tomorrow` :
      days === 3  ? `Your ${periodLabel} ends in 3 days` :
      days === 7  ? `Your ${periodLabel} ends in 7 days` :
                    `Your ${periodLabel} ends in 14 days`;

    const headline =
      days === 1  ? `Hi ${firstName}, your ${periodLabel} ends tomorrow` :
      days === 3  ? `Hi ${firstName}, 3 days left on your ${periodLabel}` :
      days === 7  ? `Hi ${firstName}, 7 days left on your ${periodLabel}` :
                    `Hi ${firstName}, 14 days left on your ${periodLabel}`;

    const body =
      days === 1
        ? `Your ${isBeta ? "beta" : "2-month"} access ends tomorrow. Subscribe now to keep tracking your contracts, commissions, and tenants without interruption.`
        : days === 3
        ? `You have 3 days left on your kakisewa ${periodLabel}. Subscribe to keep everything running — contracts, renewals, tenant packs, and commissions.`
        : days === 7
        ? `You have 7 days left on your kakisewa ${periodLabel}. Lock in your plan now to keep everything running seamlessly.`
        : `You have 14 days left on your kakisewa ${periodLabel}. Save your card now — you won't be charged until your trial ends, and you can cancel anytime before then.`;

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
  <p style="font-size:12px;color:#AEAEB2;margin:24px 0 0">Silver starts at RM 30/month. Cancel anytime.</p>
</div>`,
      }),
    });
    sent++;

    const pushKey = `trial_expiry_${days}d_${agent.id}`;
    const { data: alreadyPushed } = await supabase
      .from("push_sent_log")
      .select("id")
      .eq("user_id", agent.id)
      .eq("notification_key", pushKey)
      .maybeSingle();
    if (!alreadyPushed) {
      const pushResult = await sendPushToUser(agent.id, {
        title: subject,
        body: "Subscribe now to keep your account active",
        url: "/subscription",
        tag: pushKey,
      });
      if (pushResult.sent > 0) {
        await supabase.from("push_sent_log").insert({ user_id: agent.id, notification_key: pushKey });
      }
    }
  }

  return NextResponse.json({ sent });
}
