import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const REMINDER_WINDOWS = [60, 30, 7];
const FROM = "kakisewa <noreply@kakisewa.com>";

function emailSentKey(type: string, days: number, relatedId: string): string {
  return `email_${type}_${days}d_${relatedId}`;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: "No Resend key" }, { status: 500 });

  const supabase = createServiceClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  // Get agent emails from auth.users via admin API
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailById = Object.fromEntries((users ?? []).map((u: { id: string; email?: string }) => [u.id, u.email]));

  let sent = 0;
  let skipped = 0;

  for (const daysBefore of REMINDER_WINDOWS) {
    const targetDate = new Date(today.getTime() + daysBefore * 86400000);
    const targetStr = targetDate.toISOString().slice(0, 10);
    const whenLabel = daysBefore === 60 ? "in 2 months" : daysBefore === 30 ? "in 1 month" : "in 7 days";

    // ── Contract expiry reminders ─────────────────────────────────────────────
    const { data: expiring } = await supabase
      .from("tenancies")
      .select("id, user_id, tenant_name, property_name, amount, contract_end")
      .eq("contract_end", targetStr)
      .neq("lifecycle_stage", "closed");

    for (const row of expiring ?? []) {
      const email = emailById[row.user_id];
      if (!email) { skipped++; continue; }

      const sentKey = emailSentKey("renewal", daysBefore, row.id);

      // Idempotency: check email_sent_log
      const { count } = await supabase
        .from("push_sent_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", row.user_id)
        .eq("notification_key", sentKey);

      if ((count ?? 0) > 0) { skipped++; continue; }

      const propLabel = row.property_name ?? "your property";
      const rent = row.amount ? `RM ${Number(row.amount).toLocaleString()}/month` : null;
      const rentLine = rent ? `<p style="font-size:13px;color:#6C6C70;margin:0 0 20px">Current rent: ${rent}</p>` : "";

      const subject =
        daysBefore === 7 ? `Action needed: ${row.tenant_name}'s contract ends in 7 days` :
        daysBefore === 30 ? `Heads up: ${row.tenant_name}'s contract ends next month` :
        `Upcoming renewal: ${row.tenant_name}'s contract in 2 months`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM,
          to: [email],
          subject,
          html: `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
  <p style="font-size:22px;font-weight:700;letter-spacing:-0.02em;margin:0 0 24px">kakisewa</p>
  <h1 style="font-size:18px;font-weight:600;margin:0 0 8px">Contract expiring ${whenLabel}</h1>
  <p style="font-size:14px;color:#6C6C70;margin:0 0 4px"><strong>${row.tenant_name}</strong> at ${propLabel}</p>
  <p style="font-size:13px;color:#6C6C70;margin:0 0 20px">Contract end: ${row.contract_end}</p>
  ${rentLine}
  <a href="https://www.kakisewa.com/existing-listing?highlight=${row.id}"
    style="display:inline-block;background:#1C1C1E;color:#fff;font-size:14px;font-weight:600;
           padding:12px 24px;border-radius:10px;text-decoration:none">
    View in Existing listing
  </a>
  <p style="font-size:12px;color:#AEAEB2;margin:24px 0 0">
    You received this because you have a contract expiring soon on kakisewa.
  </p>
</div>`,
        }),
      });

      await supabase.from("push_sent_log").insert({
        user_id: row.user_id,
        notification_key: sentKey,
      });
      sent++;
    }

    // ── Owner availability reminders ──────────────────────────────────────────
    const { data: available } = await supabase
      .from("owner_leads")
      .select("id, user_id, owner_name, property_name, unit, expected_rent, available_from")
      .eq("available_from", targetStr)
      .in("stage", ["wants_rent", "listed", "replied"]);

    for (const row of available ?? []) {
      const email = emailById[row.user_id];
      if (!email) { skipped++; continue; }

      const sentKey = emailSentKey("availability", daysBefore, row.id);

      const { count } = await supabase
        .from("push_sent_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", row.user_id)
        .eq("notification_key", sentKey);

      if ((count ?? 0) > 0) { skipped++; continue; }

      const propLabel = [row.property_name, row.unit].filter(Boolean).join(" · ") || "a property";
      const rentLine = row.expected_rent
        ? `<p style="font-size:13px;color:#6C6C70;margin:0 0 20px">Expected rent: RM ${Number(row.expected_rent).toLocaleString()}/month</p>`
        : "";

      const subject =
        daysBefore === 7 ? `${propLabel} available in 7 days — start listing now` :
        daysBefore === 30 ? `${propLabel} available next month` :
        `${propLabel} becomes available in 2 months`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM,
          to: [email],
          subject,
          html: `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
  <p style="font-size:22px;font-weight:700;letter-spacing:-0.02em;margin:0 0 24px">kakisewa</p>
  <h1 style="font-size:18px;font-weight:600;margin:0 0 8px">Property becoming available ${whenLabel}</h1>
  <p style="font-size:14px;color:#6C6C70;margin:0 0 4px"><strong>${propLabel}</strong></p>
  <p style="font-size:13px;color:#6C6C70;margin:0 0 20px">Available from: ${row.available_from}</p>
  ${rentLine}
  <a href="https://www.kakisewa.com/my-listing"
    style="display:inline-block;background:#1C1C1E;color:#fff;font-size:14px;font-weight:600;
           padding:12px 24px;border-radius:10px;text-decoration:none">
    View in My listing
  </a>
  <p style="font-size:12px;color:#AEAEB2;margin:24px 0 0">
    You received this because you have an owner lead with an upcoming availability date on kakisewa.
  </p>
</div>`,
        }),
      });

      await supabase.from("push_sent_log").insert({
        user_id: row.user_id,
        notification_key: sentKey,
      });
      sent++;
    }
  }

  // ── Tenant not renewing — one-time email ──────────────────────────────────
  const { data: leaving } = await supabase
    .from("tenancies")
    .select("id, user_id, tenant_name, property_name, contract_end")
    .eq("replied_tenant", "no")
    .neq("lifecycle_stage", "closed")
    .gte("contract_end", todayStr);

  for (const row of leaving ?? []) {
    const email = emailById[row.user_id];
    if (!email) { skipped++; continue; }

    const sentKey = `email_leaving_${row.id}`;

    const { count } = await supabase
      .from("push_sent_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", row.user_id)
      .eq("notification_key", sentKey);

    if ((count ?? 0) > 0) { skipped++; continue; }

    const propLabel = row.property_name ?? "your property";

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: `${row.tenant_name} is not renewing — time to find a replacement`,
        html: `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
  <p style="font-size:22px;font-weight:700;letter-spacing:-0.02em;margin:0 0 24px">kakisewa</p>
  <h1 style="font-size:18px;font-weight:600;margin:0 0 8px">Tenant not renewing</h1>
  <p style="font-size:14px;color:#6C6C70;margin:0 0 4px"><strong>${row.tenant_name}</strong> at ${propLabel}</p>
  <p style="font-size:13px;color:#6C6C70;margin:0 0 20px">Contract ends: ${row.contract_end}</p>
  <p style="font-size:14px;color:#6C6C70;margin:0 0 20px">
    This tenant has replied that they will not be renewing. Start listing this property to find a replacement tenant before the contract ends.
  </p>
  <a href="https://www.kakisewa.com/existing-listing?highlight=${row.id}"
    style="display:inline-block;background:#1C1C1E;color:#fff;font-size:14px;font-weight:600;
           padding:12px 24px;border-radius:10px;text-decoration:none">
    View tenancy
  </a>
  <p style="font-size:12px;color:#AEAEB2;margin:24px 0 0">
    You received this because a tenant marked as not renewing on kakisewa.
  </p>
</div>`,
      }),
    });

    await supabase.from("push_sent_log").insert({
      user_id: row.user_id,
      notification_key: sentKey,
    });
    sent++;
  }

  return NextResponse.json({ sent, skipped, at: today.toISOString() });
}
