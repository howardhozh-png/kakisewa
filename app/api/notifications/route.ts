import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export interface NotificationItem {
  id: string;
  type: "contract_expiry" | "tenant_leaving" | "owner_intake" | "owner_renewal" | "owner_pack_ranked" | "tenant_intake" | "tenant_renewal" | "wa_reply" | "wa_reply_owner" | "property_available" | "property_pack_ranked";
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
  const in60 = new Date(today.getTime() + 60 * 86400000).toISOString().slice(0, 10);
  const since30d = new Date(today.getTime() - 30 * 86400000).toISOString();

  const items: NotificationItem[] = [];

  // ── Owner filled in intake form (last 30 days) ───────────────────────────
  const { data: recentIntakes } = await supabase
    .from("owner_leads")
    .select("id, owner_name, property_name, unit, intake_completed_at")
    .not("intake_completed_at", "is", null)
    .gte("intake_completed_at", since30d)
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
      href: `/my-listing?highlight=${row.id}`,
      createdAt: row.intake_completed_at,
      priority: "normal",
    });
  }

  // ── Owner filled in renewal form (last 30 days) ──────────────────────────
  const { data: recentRenewals } = await supabase
    .from("tenancies")
    .select("id, tenant_name, property_name, owner_renewal_completed_at, replied_owner")
    .not("owner_renewal_completed_at", "is", null)
    .gte("owner_renewal_completed_at", since30d)
    .order("owner_renewal_completed_at", { ascending: false })
    .limit(10);

  for (const r of recentRenewals ?? []) {
    const row = r as { id: string; tenant_name: string; property_name: string | null; owner_renewal_completed_at: string; replied_owner: string };
    items.push({
      id: `ownerrenewal_${row.id}`,
      type: "owner_renewal",
      title: row.replied_owner === "yes" ? "Owner wants to renew!" : "Owner not renewing",
      body: `${row.tenant_name}${row.property_name ? ` · ${row.property_name}` : ""}`,
      href: `/existing-listing?highlight=${row.id}`,
      createdAt: row.owner_renewal_completed_at,
      priority: row.replied_owner === "yes" ? "normal" : "high",
    });
  }

  // ── Owner saved ranking in tenant pack (last 30 days) ───────────────────────
  const { data: rankedPacks } = await supabase
    .from("match_packs")
    .select("id, owner_lead_id, property_label, owner_ranked_at")
    .not("owner_ranked_at", "is", null)
    .gte("owner_ranked_at", since30d)
    .order("owner_ranked_at", { ascending: false })
    .limit(5);

  for (const r of rankedPacks ?? []) {
    const row = r as { id: string; owner_lead_id: string; property_label: string | null; owner_ranked_at: string };
    items.push({
      id: `packranked_${row.id}`,
      type: "owner_pack_ranked",
      title: "Owner ranked tenants in pack",
      body: row.property_label ?? "Tenant pack",
      href: `/matching/${row.owner_lead_id}`,
      createdAt: row.owner_ranked_at,
      priority: "normal",
    });
  }

  // ── Contracts expiring within 60 days — 60d / 30d / 7d milestones ────────
  const { data: expiring } = await supabase
    .from("tenancies")
    .select("id, tenant_name, contract_end, property_name, lifecycle_stage")
    .not("contract_end", "is", null)
    .gte("contract_end", todayStr)
    .lte("contract_end", in60)
    .neq("lifecycle_stage", "closed")
    .limit(30);

  for (const r of expiring ?? []) {
    const row = r as { id: string; tenant_name: string; contract_end: string; property_name: string | null };
    const daysLeft = Math.ceil((new Date(row.contract_end).getTime() - today.getTime()) / 86400000);

    let bucket: string;
    let label: string;
    let priority: "high" | "normal";

    if (daysLeft <= 7) {
      bucket = "7d"; label = "7 days"; priority = "high";
    } else if (daysLeft <= 30) {
      bucket = "30d"; label = "1 month"; priority = "normal";
    } else {
      bucket = "60d"; label = "2 months"; priority = "normal";
    }

    items.push({
      id: `exp_${row.id}_${bucket}`,
      type: "contract_expiry",
      title: `Contract expiring — ${label} left`,
      body: `${row.tenant_name}${row.property_name ? ` · ${row.property_name}` : ""}`,
      href: `/existing-listing?highlight=${row.id}`,
      createdAt: today.toISOString(),
      priority,
    });
  }

  // tenant_leaving is intentionally removed — tenant_renewal already covers
  // replied_tenant='no' with high priority. Having both caused duplicate entries.

  // ── Tenant submitted property preference form (last 30 days) ────────────────
  const { data: tenantIntakes } = await supabase
    .from("tenant_profiles")
    .select("id, name, intake_completed_at")
    .not("intake_completed_at", "is", null)
    .eq("source", "intake_form")
    .gte("intake_completed_at", since30d)
    .order("intake_completed_at", { ascending: false })
    .limit(10);

  for (const r of tenantIntakes ?? []) {
    const row = r as { id: string; name: string; intake_completed_at: string };
    items.push({
      id: `tenant_intake_${row.id}`,
      type: "tenant_intake",
      title: "Tenant submitted property preferences",
      body: row.name,
      href: "/directory?view=tenants",
      createdAt: row.intake_completed_at,
      priority: "normal",
    });
  }

  // ── Tenant answered renewal questionnaire (last 30 days) ─────────────────────
  const { data: tenantRenewals } = await supabase
    .from("tenancies")
    .select("id, tenant_name, property_name, tenant_renewal_completed_at, replied_tenant")
    .not("tenant_renewal_completed_at", "is", null)
    .gte("tenant_renewal_completed_at", since30d)
    .order("tenant_renewal_completed_at", { ascending: false })
    .limit(10);

  for (const r of tenantRenewals ?? []) {
    const row = r as { id: string; tenant_name: string; property_name: string | null; tenant_renewal_completed_at: string; replied_tenant: string };
    items.push({
      id: `tenant_renewal_${row.id}`,
      type: "tenant_renewal",
      title: row.replied_tenant === "yes" ? "Renewal confirmed" : "Tenant not renewing",
      body: `${row.tenant_name}${row.property_name ? ` · ${row.property_name}` : ""}`,
      href: `/existing-listing?highlight=${row.id}`,
      createdAt: row.tenant_renewal_completed_at,
      priority: row.replied_tenant === "yes" ? "normal" : "high",
    });
  }

  // ── WhatsApp auto-tracked replies (last 30 days) ──────────────────────────────
  const { data: waReplies } = await supabase
    .from("tenancies")
    .select("id, tenant_name, property_name, last_wa_reply_at, replied_tenant")
    .not("last_wa_reply_at", "is", null)
    .gte("last_wa_reply_at", since30d)
    .in("replied_tenant", ["yes", "no"])
    .order("last_wa_reply_at", { ascending: false })
    .limit(10);

  for (const r of waReplies ?? []) {
    const row = r as { id: string; tenant_name: string; property_name: string | null; last_wa_reply_at: string; replied_tenant: string };
    items.push({
      id: `wa_reply_${row.id}`,
      type: "wa_reply",
      title: row.replied_tenant === "yes" ? "Renewal confirmed via WhatsApp" : "Not renewing (WhatsApp reply)",
      body: `${row.tenant_name}${row.property_name ? ` · ${row.property_name}` : ""}`,
      href: `/existing-listing?highlight=${row.id}`,
      createdAt: row.last_wa_reply_at,
      priority: row.replied_tenant === "yes" ? "normal" : "high",
    });
  }

  // ── Owner replied via WhatsApp (last 30 days) ─────────────────────────────────
  const { data: waOwnerReplies } = await supabase
    .from("owner_leads")
    .select("id, owner_name, property_name, unit, last_wa_reply_at, replied_owner")
    .not("last_wa_reply_at", "is", null)
    .gte("last_wa_reply_at", since30d)
    .in("replied_owner", ["yes", "no"])
    .order("last_wa_reply_at", { ascending: false })
    .limit(10);

  for (const r of waOwnerReplies ?? []) {
    const row = r as { id: string; owner_name: string; property_name: string | null; unit: string | null; last_wa_reply_at: string; replied_owner: string };
    const propParts = [row.property_name, row.unit ? `Unit ${row.unit}` : null].filter(Boolean);
    items.push({
      id: `wa_owner_${row.id}`,
      type: "wa_reply_owner",
      title: row.replied_owner === "yes" ? "Owner wants to list (WhatsApp)" : "Owner not interested (WhatsApp)",
      body: `${row.owner_name}${propParts.length ? ` · ${propParts.join(" · ")}` : ""}`,
      href: `/potential-listing?highlight=${row.id}`,
      createdAt: row.last_wa_reply_at,
      priority: row.replied_owner === "yes" ? "normal" : "high",
    });
  }

  // ── Properties becoming available within 60 days ──────────────────────────────
  const { data: availableSoon } = await supabase
    .from("owner_leads")
    .select("id, owner_name, property_name, unit, available_from")
    .not("available_from", "is", null)
    .gte("available_from", todayStr)
    .lte("available_from", in60)
    .in("stage", ["wants_rent", "listed", "replied"])
    .order("available_from", { ascending: true })
    .limit(10);

  for (const r of availableSoon ?? []) {
    const row = r as { id: string; owner_name: string; property_name: string | null; unit: string | null; available_from: string };
    const daysLeft = Math.ceil((new Date(row.available_from).getTime() - today.getTime()) / 86400000);
    let label: string;
    let bucket: string;
    if (daysLeft <= 7) { bucket = "7d"; label = "7 days"; }
    else if (daysLeft <= 30) { bucket = "30d"; label = "1 month"; }
    else { bucket = "60d"; label = "2 months"; }
    const propParts = [row.property_name, row.unit ? `Unit ${row.unit}` : null].filter(Boolean);
    items.push({
      id: `avail_${row.id}_${bucket}`,
      type: "property_available",
      title: `Property available in ${label}`,
      body: `${propParts.join(" · ") || "Property"} · ${row.owner_name}`,
      href: `/my-listing?highlight=${row.id}`,
      createdAt: today.toISOString(),
      priority: daysLeft <= 7 ? "high" : "normal",
    });
  }

  // ── Tenant ranked property pack (last 30 days) ────────────────────────────────
  const { data: tenantRankedPacks } = await supabase
    .from("property_packs")
    .select("id, tenant_profile_id, tenant_label, tenant_ranked_at")
    .not("tenant_ranked_at", "is", null)
    .gte("tenant_ranked_at", since30d)
    .order("tenant_ranked_at", { ascending: false })
    .limit(5);

  for (const r of tenantRankedPacks ?? []) {
    const row = r as unknown as { id: string; tenant_profile_id: string | null; tenant_label: string | null; tenant_ranked_at: string };
    const href = row.tenant_profile_id
      ? `/property-pack/${row.tenant_profile_id}/results`
      : "/directory?view=tenants";
    items.push({
      id: `proppackranked_${row.id}`,
      type: "property_pack_ranked",
      title: "Tenant ranked your property pack",
      body: row.tenant_label ?? "A tenant ranked their preferred properties",
      href,
      createdAt: row.tenant_ranked_at,
      priority: "normal",
    });
  }

  // Deduplicate: for renewal-type notifications on the same tenancy,
  // keep only the most specific one. wa_reply > tenant_renewal.
  // IDs follow the pattern: wa_reply_<uuid>, tenant_renewal_<uuid>, leaving_<uuid>
  const waReplyTenancyIds = new Set(
    items.filter((i) => i.type === "wa_reply").map((i) => i.id.replace(/^wa_reply_/, ""))
  );
  const deduped = items.filter((i) => {
    if (i.type === "tenant_renewal") {
      const tenancyId = i.id.replace(/^tenant_renewal_/, "");
      return !waReplyTenancyIds.has(tenancyId);
    }
    return true;
  });

  // Sort: high priority first, then by date desc
  deduped.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === "high" ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return NextResponse.json({ items: deduped, unreadCount: deduped.length });
}
