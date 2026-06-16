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
    const daysLeft = Math.ceil(
      (new Date(row.contract_end).getTime() - today.getTime()) / 86400000
    );

    let bucket: string;
    let label: string;

    // Send once per milestone bucket — key is stable within each bucket window
    if (daysLeft <= 7) { bucket = "7d"; label = "7 days"; }
    else if (daysLeft <= 30) { bucket = "30d"; label = "1 month"; }
    else { bucket = "60d"; label = "2 months"; }

    const notifKey = `exp_${row.id}_${bucket}`;

    // Skip if already sent this milestone for this user
    const { data: existing } = await supabase
      .from("push_sent_log")
      .select("id")
      .eq("user_id", row.user_id)
      .eq("notification_key", notifKey)
      .maybeSingle();

    if (existing) { skipped++; continue; }
    if (pushOptedOut.has(row.user_id)) { skipped++; continue; }
    // Tenant already gave a clear answer — no point reminding
    if (row.replied_tenant === "yes" || row.replied_tenant === "no") { skipped++; continue; }

    // Check user has push subscriptions before sending
    const { count } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", row.user_id);

    if (!count || count === 0) { skipped++; continue; }

    const expLead = row.owner_lead_id ? unitByExpLeadId[row.owner_lead_id] : null;
    const unit = expLead?.unit ?? null;
    const propParts = [expLead?.property_name, unit ? `Unit ${unit}` : null].filter(Boolean);
    const propLabel = propParts.length ? propParts.join(" · ") : "your property";
    const result = await sendPushToUser(row.user_id, {
      title: `Contract expiring in ${label}`,
      body: `${propLabel} · ${row.tenant_name} — send renewal message now`,
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

  // Property availability notifications removed — creates noise without value.
  // Agents want to be notified when owners reply, not when availability dates approach.

  return NextResponse.json({ sent, skipped, errors, at: today.toISOString() });
}
