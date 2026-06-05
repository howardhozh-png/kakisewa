import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

// GET  → seed all notification types for the current user
// DELETE → clean up all __TEST__ rows for the current user

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const userId = session.user.id;
  const svc = createServiceClient();
  const now = new Date();
  const suffix = userId.slice(-6);
  const seeded: string[] = [];
  const errors: string[] = [];

  // ── 1. WA reminder: renewal 60d ────────────────────────────────────────────
  const { error: e1 } = await svc.from("whatsapp_log").upsert({
    id: `test_wa_r60_${suffix}`,
    user_id: userId,
    related_id: null,
    related_type: "tenancy",
    template: "auto_reminder_renewal_60d",
    recipient_phone: "60123456789",
    recipient_name: "Ahmad Hassan",
    body: "https://wa.me/60123456789?text=Test+renewal+60d+reminder",
    channel: "auto_queued",
    sent_at: now.toISOString(),
  });
  e1 ? errors.push(`wa_renewal_60d: ${e1.message}`) : seeded.push("wa_reminder renewal 60d");

  // ── 2. WA reminder: renewal 30d ────────────────────────────────────────────
  const { error: e2 } = await svc.from("whatsapp_log").upsert({
    id: `test_wa_r30_${suffix}`,
    user_id: userId,
    related_id: null,
    related_type: "tenancy",
    template: "auto_reminder_renewal_30d",
    recipient_phone: "60123456789",
    recipient_name: "Priya Nair",
    body: "https://wa.me/60123456789?text=Test+renewal+30d+reminder",
    channel: "auto_queued",
    sent_at: now.toISOString(),
  });
  e2 ? errors.push(`wa_renewal_30d: ${e2.message}`) : seeded.push("wa_reminder renewal 30d");

  // ── 3. WA reminder: renewal 7d ─────────────────────────────────────────────
  const { error: e3 } = await svc.from("whatsapp_log").upsert({
    id: `test_wa_r7_${suffix}`,
    user_id: userId,
    related_id: null,
    related_type: "tenancy",
    template: "auto_reminder_renewal_7d",
    recipient_phone: "60123456789",
    recipient_name: "Kevin Lim",
    body: "https://wa.me/60123456789?text=Test+renewal+7d+reminder",
    channel: "auto_queued",
    sent_at: now.toISOString(),
  });
  e3 ? errors.push(`wa_renewal_7d: ${e3.message}`) : seeded.push("wa_reminder renewal 7d");

  // ── 4. WA reminder: availability 60d ──────────────────────────────────────
  const { error: e4 } = await svc.from("whatsapp_log").upsert({
    id: `test_wa_a60_${suffix}`,
    user_id: userId,
    related_id: null,
    related_type: "owner_lead",
    template: "auto_reminder_availability_60d",
    recipient_phone: "60198765432",
    recipient_name: "Tan Boon Huat",
    body: "https://wa.me/60198765432?text=Test+availability+60d+reminder",
    channel: "auto_queued",
    sent_at: now.toISOString(),
  });
  e4 ? errors.push(`wa_availability_60d: ${e4.message}`) : seeded.push("wa_reminder availability 60d");

  // ── 5. action_needed: contract expiring in 7 days ─────────────────────────
  const contractEnd7d = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const { error: e5 } = await svc.from("tenancies").upsert({
    id: `test_ten_exp_${suffix}`,
    user_id: userId,
    property_id: null,
    tenant_name: "Siti Aminah [TEST]",
    tenant_phone: "60111234567",
    amount: 2800,
    due_day: 1,
    current_month_paid: false,
    lhdn_status: "none",
    status: "active",
    contract_start: new Date(now.getTime() - 11 * 30 * 86400000).toISOString().slice(0, 10),
    contract_end: contractEnd7d,
    contract_duration_months: 12,
    replied_tenant: "pending",
    replied_owner: "pending",
    lifecycle_stage: "headsup",
  });
  e5 ? errors.push(`action_needed tenancy: ${e5.message}`) : seeded.push("action_needed (7d expiry)");

  // ── 6. tenant_leaving: tenant said no ─────────────────────────────────────
  const contractEnd30d = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const { error: e6 } = await svc.from("tenancies").upsert({
    id: `test_ten_leave_${suffix}`,
    user_id: userId,
    property_id: null,
    tenant_name: "Wong Chee Keong [TEST]",
    tenant_phone: "60179876543",
    amount: 3500,
    due_day: 1,
    current_month_paid: false,
    lhdn_status: "none",
    status: "active",
    contract_start: new Date(now.getTime() - 11 * 30 * 86400000).toISOString().slice(0, 10),
    contract_end: contractEnd30d,
    contract_duration_months: 12,
    replied_tenant: "no",
    replied_owner: "pending",
    lifecycle_stage: "headsup",
  });
  e6 ? errors.push(`tenant_leaving tenancy: ${e6.message}`) : seeded.push("tenant_leaving");

  return NextResponse.json({
    ok: true,
    seeded,
    errors: errors.length > 0 ? errors : undefined,
    cleanup: "Hit DELETE /api/admin/seed-notifications to remove test rows",
  });
}

export async function DELETE(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const userId = session.user.id;
  const svc = createServiceClient();
  const suffix = userId.slice(-6);

  await svc.from("whatsapp_log").delete().in("id", [
    `test_wa_r60_${suffix}`,
    `test_wa_r30_${suffix}`,
    `test_wa_r7_${suffix}`,
    `test_wa_a60_${suffix}`,
  ]);
  await svc.from("tenancies").delete().in("id", [
    `test_ten_exp_${suffix}`,
    `test_ten_leave_${suffix}`,
  ]);

  return NextResponse.json({ ok: true, cleaned: true });
}
