import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export interface NotificationItem {
  id: string;
  type: "wa_reminder" | "action_needed" | "tenant_leaving" | "owner_leaving" | "owner_intake" | "owner_renewal" | "owner_pack_ranked";
  title: string;
  body: string;
  href?: string;
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
  const since24h = new Date(today.getTime() - 24 * 3600000).toISOString();

  const items: NotificationItem[] = [];

  // ── WA reminders queued by cron ─────────────────────────────────────────────
  const { data: waRows } = await supabase
    .from("whatsapp_log")
    .select("id, template, recipient_name, recipient_phone, sent_at, related_id, related_type")
    .eq("channel", "auto_queued")
    .gte("sent_at", since7d)
    .order("sent_at", { ascending: false })
    .limit(20);

  for (const r of waRows ?? []) {
    const row = r as { id: string; template: string; recipient_name: string | null; recipient_phone: string; sent_at: string; related_id: string | null; related_type: string | null };
    const isRenewal = row.template.includes("renewal");
    const days = row.template.includes("60d") ? 60 : row.template.includes("7d") ? 7 : 30;
    const whenLabel = days === 60 ? "2 months" : days === 30 ? "1 month" : "7 days";
    const relatedId = row.related_id;
    const href = relatedId
      ? (row.related_type === "tenancy"
          ? `/existing-contracts?highlight=${relatedId}`
          : `/new-owners?tab=pipeline&highlight=${relatedId}`)
      : (isRenewal ? "/existing-contracts" : "/new-owners?tab=pipeline");
    items.push({
      id: `wa_${row.id}`,
      type: "wa_reminder",
      title: isRenewal
        ? `Renewal reminder — ${whenLabel} out`
        : `Availability reminder — ${whenLabel} out`,
      body: row.recipient_name ? `For ${row.recipient_name}` : `To ${row.recipient_phone}`,
      href,
      createdAt: row.sent_at,
      priority: days <= 30 ? "high" : "normal",
    });
  }

  // ── Owner filled in intake form (last 24h) ────────────────────────────────
  const { data: recentIntakes } = await supabase
    .from("owner_leads")
    .select("id, owner_name, property_name, unit, intake_completed_at")
    .not("intake_completed_at", "is", null)
    .gte("intake_completed_at", since24h)
    .order("intake_completed_at", { ascending: false })
    .limit(10);

  for (const r of recentIntakes ?? []) {
    const row = r as { id: string; owner_name: string; property_name: string | null; unit: string | null; intake_completed_at: string };
    const propLabel = [row.property_name, row.unit ? `Unit ${row.unit}` : null].filter(Boolean).join(" · ");
    items.push({
      id: `intake_${row.id}`,
      type: "owner_intake",
      title: "Owner filled in details",
      body: `${row.owner_name}${propLabel ? ` · ${propLabel}` : ""}`,
      href: `/new-owners?tab=pipeline&highlight=${row.id}`,
      createdAt: row.intake_completed_at,
      priority: "normal",
    });
  }

  // ── Owner filled in renewal form (last 24h) ───────────────────────────────
  const { data: recentRenewals } = await supabase
    .from("tenancies")
    .select("id, tenant_name, property_name, owner_renewal_completed_at, replied_owner")
    .not("owner_renewal_completed_at", "is", null)
    .gte("owner_renewal_completed_at", since24h)
    .order("owner_renewal_completed_at", { ascending: false })
    .limit(10);

  for (const r of recentRenewals ?? []) {
    const row = r as { id: string; tenant_name: string; property_name: string | null; owner_renewal_completed_at: string; replied_owner: string };
    items.push({
      id: `ownerrenewal_${row.id}`,
      type: "owner_renewal",
      title: row.replied_owner === "yes" ? "Owner wants to renew!" : "Owner not renewing",
      body: `${row.tenant_name}${row.property_name ? ` · ${row.property_name}` : ""}`,
      href: `/existing-contracts?highlight=${row.id}`,
      createdAt: row.owner_renewal_completed_at,
      priority: row.replied_owner === "yes" ? "normal" : "high",
    });
  }

  // ── Owner saved ranking in tenant pack (last 24h) ────────────────────────────
  const { data: rankedPacks } = await supabase
    .from("match_packs")
    .select("id, owner_lead_id, property_label, owner_ranked_at")
    .not("owner_ranked_at", "is", null)
    .gte("owner_ranked_at", since24h)
    .order("owner_ranked_at", { ascending: false })
    .limit(5);

  for (const r of rankedPacks ?? []) {
    const row = r as { id: string; owner_lead_id: string; property_label: string | null; owner_ranked_at: string };
    items.push({
      id: `packranked_${row.id}`,
      type: "owner_pack_ranked",
      title: "Owner ranked tenants in pack",
      body: row.property_label ?? "Tenant pack",
      href: `/new-owners?tab=pipeline&highlight=${row.owner_lead_id}`,
      createdAt: row.owner_ranked_at,
      priority: "normal",
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
      href: `/existing-contracts?highlight=${row.id}`,
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
      href: `/existing-contracts?highlight=${row.id}`,
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
