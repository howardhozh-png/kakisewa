import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export interface NotificationItem {
  id: string;
  type: "wa_reminder" | "action_needed" | "tenant_leaving" | "owner_leaving";
  title: string;
  body: string;
  href?: string;
  waUrl?: string;
  createdAt: string;
  priority: "high" | "normal";
}

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ items: [], unreadCount: 0 });

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const in14 = new Date(today.getTime() + 14 * 86400000).toISOString().slice(0, 10);
  const since7d = new Date(today.getTime() - 7 * 86400000).toISOString();

  const items: NotificationItem[] = [];

  // ── WA reminders queued by cron ─────────────────────────────────────────────
  const { data: waRows } = await supabase
    .from("whatsapp_log")
    .select("id, template, recipient_name, recipient_phone, body, sent_at")
    .eq("channel", "auto_queued")
    .gte("sent_at", since7d)
    .order("sent_at", { ascending: false })
    .limit(20);

  for (const r of waRows ?? []) {
    const row = r as { id: string; template: string; recipient_name: string | null; recipient_phone: string; body: string | null; sent_at: string };
    const isRenewal = row.template.includes("renewal");
    const days = row.template.includes("60d") ? 60 : row.template.includes("7d") ? 7 : 30;
    const whenLabel = days === 60 ? "2 months" : days === 30 ? "1 month" : "7 days";
    items.push({
      id: `wa_${row.id}`,
      type: "wa_reminder",
      title: isRenewal
        ? `Renewal reminder ready — ${whenLabel} out`
        : `Availability reminder ready — ${whenLabel} out`,
      body: row.recipient_name ? `For ${row.recipient_name}` : `To ${row.recipient_phone}`,
      waUrl: row.body ?? undefined,
      createdAt: row.sent_at,
      priority: days <= 30 ? "high" : "normal",
    });
  }

  // ── Contracts expiring in 14 days with no action yet ─────────────────────────
  const { data: expiring } = await supabase
    .from("tenancies")
    .select("id, tenant_name, contract_end, property_name, lifecycle_stage")
    .not("contract_end", "is", null)
    .gte("contract_end", todayStr)
    .lte("contract_end", in14)
    .neq("lifecycle_stage", "closed")
    .eq("replied_tenant", "pending")
    .limit(10);

  for (const r of expiring ?? []) {
    const row = r as { id: string; tenant_name: string; contract_end: string; property_name: string | null };
    const daysLeft = Math.ceil((new Date(row.contract_end).getTime() - today.getTime()) / 86400000);
    items.push({
      id: `exp_${row.id}`,
      type: "action_needed",
      title: `Contract expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
      body: `${row.tenant_name}${row.property_name ? ` · ${row.property_name}` : ""}`,
      href: `/existing-contracts`,
      createdAt: today.toISOString(),
      priority: "high",
    });
  }

  // ── Tenants who said "no" — need replacement ──────────────────────────────
  const { data: leaving } = await supabase
    .from("tenancies")
    .select("id, tenant_name, contract_end, property_name")
    .eq("replied_tenant", "no")
    .neq("lifecycle_stage", "closed")
    .gte("contract_end", todayStr)
    .limit(5);

  for (const r of leaving ?? []) {
    const row = r as { id: string; tenant_name: string; contract_end: string; property_name: string | null };
    items.push({
      id: `leaving_${row.id}`,
      type: "tenant_leaving",
      title: "Tenant not renewing",
      body: `${row.tenant_name}${row.property_name ? ` · ${row.property_name}` : ""} — find a replacement`,
      href: `/existing-contracts`,
      createdAt: today.toISOString(),
      priority: "high",
    });
  }

  // Sort: high priority first, then by date desc
  items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === "high" ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return NextResponse.json({ items, unreadCount: items.length });
}
