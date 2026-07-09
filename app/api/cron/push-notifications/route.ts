import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendPushToUser } from "@/lib/push";
import { notifyTenancyExpiryPush } from "@/lib/tenancy-expiry-push";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const in60 = new Date(today.getTime() + 60 * 86400000).toISOString().slice(0, 10);

  // Fetch users who have opted out of push so we can skip them
  const { data: optedOut } = await supabase
    .from("agent_profiles")
    .select("id")
    .eq("notif_push", false);
  const pushOptedOut = new Set((optedOut ?? []).map((r: { id: string }) => r.id));

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  // ── Contracts expiring within 60 days ─────────────────────────────────────
  // Only for users who have at least one push subscription
  const { data: expiring } = await supabase
    .from("tenancies")
    .select("id, user_id, tenant_name, contract_end, lifecycle_stage, replied_tenant, owner_lead_id")
    .not("contract_end", "is", null)
    .not("user_id", "is", null)
    .gte("contract_end", todayStr)
    .lte("contract_end", in60)
    .neq("lifecycle_stage", "closed");

  // Batch-fetch unit + property name from owner_leads
  const expiringLeadIds = [...new Set((expiring ?? []).map((r: { owner_lead_id: string | null }) => r.owner_lead_id).filter(Boolean))] as string[];
  const { data: expiringOlUnits } = expiringLeadIds.length
    ? await supabase.from("owner_leads").select("id, unit, property_name").in("id", expiringLeadIds)
    : { data: [] as { id: string; unit: string | null; property_name: string | null }[] };
  const unitByExpLeadId = Object.fromEntries((expiringOlUnits ?? []).map((ol: { id: string; unit: string | null; property_name: string | null }) => [ol.id, ol]));

  for (const row of expiring ?? []) {
    if (pushOptedOut.has(row.user_id)) { skipped++; continue; }
    // Tenant already gave a clear answer — no point reminding
    if (row.replied_tenant === "yes" || row.replied_tenant === "no") { skipped++; continue; }

    const expLead = row.owner_lead_id ? unitByExpLeadId[row.owner_lead_id] : null;
    const unit = expLead?.unit ?? null;
    const propParts = [expLead?.property_name, unit ? `Unit ${unit}` : null].filter(Boolean);
    const propLabel = propParts.length ? propParts.join(" · ") : "your property";

    // Shared with the real-time trigger (updateTenancyContract in lib/actions.ts) so
    // the bucket/dedup/send logic only exists in one place.
    const outcome = await notifyTenancyExpiryPush(supabase, row, propLabel);
    if (outcome === "sent") sent++;
    else if (outcome === "send_failed") errors++;
    else skipped++;
  }

  // ── Tenant not renewing — one-time push per tenancy ───────────────────────
  const { data: leaving } = await supabase
    .from("tenancies")
    .select("id, user_id, tenant_name, contract_end, owner_lead_id")
    .eq("replied_tenant", "no")
    .neq("lifecycle_stage", "closed")
    .not("user_id", "is", null)
    .gte("contract_end", todayStr);

  // Batch-fetch unit + property name for leaving tenants
  const leavingLeadIds = [...new Set((leaving ?? []).map((r: { owner_lead_id: string | null }) => r.owner_lead_id).filter(Boolean))] as string[];
  const { data: leavingOlUnits } = leavingLeadIds.length
    ? await supabase.from("owner_leads").select("id, unit, property_name").in("id", leavingLeadIds)
    : { data: [] as { id: string; unit: string | null; property_name: string | null }[] };
  const unitByLeavingLeadId = Object.fromEntries((leavingOlUnits ?? []).map((ol: { id: string; unit: string | null; property_name: string | null }) => [ol.id, ol]));

  for (const row of leaving ?? []) {
    const notifKey = `leaving_${row.id}`;

    const { data: existing } = await supabase
      .from("push_sent_log")
      .select("id")
      .eq("user_id", row.user_id)
      .eq("notification_key", notifKey)
      .maybeSingle();

    if (existing) { skipped++; continue; }
    if (pushOptedOut.has(row.user_id)) { skipped++; continue; }

    const { count } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", row.user_id);

    if (!count || count === 0) { skipped++; continue; }

    const leavingLead = row.owner_lead_id ? unitByLeavingLeadId[row.owner_lead_id] : null;
    const lUnit = leavingLead?.unit ?? null;
    const lPropParts = [leavingLead?.property_name, lUnit ? `Unit ${lUnit}` : null].filter(Boolean);
    const lPropLabel = lPropParts.length ? lPropParts.join(" · ") : "your property";
    const result = await sendPushToUser(row.user_id, {
      title: "Tenant not renewing",
      body: `${lPropLabel} · ${row.tenant_name} — start finding a replacement`,
      url: `/existing-listing?highlight=${row.id}`,
      tag: notifKey,
    });

    if (result.sent > 0) {
      await supabase.from("push_sent_log").insert({
        user_id: row.user_id,
        notification_key: notifKey,
      });
      sent += result.sent;
    } else {
      errors++;
    }
  }

  // ── Property becoming available — 60 / 30 / 7 day reminders ─────────────────
  for (const daysBefore of [60, 30, 7]) {
    const targetDate = new Date(today.getTime() + daysBefore * 86400000);
    const targetStr = targetDate.toISOString().slice(0, 10);
    const bucket = daysBefore === 7 ? "7d" : daysBefore === 30 ? "30d" : "60d";
    const whenLabel = daysBefore === 7 ? "in 7 days" : daysBefore === 30 ? "next month" : "in 2 months";

    const { data: available } = await supabase
      .from("owner_leads")
      .select("id, user_id, property_name, unit, available_from")
      .eq("available_from", targetStr)
      .in("stage", ["wants_rent", "listed", "replied"]);

    for (const row of available ?? []) {
      if (!row.user_id) { skipped++; continue; }
      const notifKey = `push_avail_${bucket}_${row.id}`;

      const { data: existing } = await supabase
        .from("push_sent_log")
        .select("id")
        .eq("user_id", row.user_id)
        .eq("notification_key", notifKey)
        .maybeSingle();

      if (existing) { skipped++; continue; }
      if (pushOptedOut.has(row.user_id)) { skipped++; continue; }

      const { count } = await supabase
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", row.user_id);

      if (!count || count === 0) { skipped++; continue; }

      const propParts = [row.property_name, row.unit ? `Unit ${row.unit}` : null].filter(Boolean);
      const propLabel = propParts.join(" · ") || "a property";

      const result = await sendPushToUser(row.user_id, {
        title: `Property available ${whenLabel}`,
        body: `${propLabel} — start listing now`,
        url: `/my-listing?highlight=${row.id}`,
        tag: notifKey,
      });

      if (result.sent > 0) {
        await supabase.from("push_sent_log").insert({ user_id: row.user_id, notification_key: notifKey });
        sent += result.sent;
      } else {
        errors++;
      }
    }
  }

  return NextResponse.json({ sent, skipped, errors, at: today.toISOString() });
}
