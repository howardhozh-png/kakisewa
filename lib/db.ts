import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import { headers } from "next/headers";
import type { Tenancy, TenancyStatus, LhdnStatus, Tier, PropertySupport, SupportType } from "./types";
import type { WhatsAppLogEntry, WhatsAppTemplate } from "./types";
import type { OwnerLead, AgentProfile, TenantProfile, MatchPack, PackTenant } from "./types";

// ─── Per-request helpers ───────────────────────────────────────────────────────

// Real user UUID from middleware header — safe inside unstable_cache (no cookies).
// Wrapped with React cache() so repeated calls within one render share one lookup.
const getCurrentUserId = cache(async (): Promise<string> => {
  try {
    const h = await headers();
    return (h as unknown as { get(name: string): string | null }).get("x-user-id") ?? "";
  } catch {
    return "";
  }
});

// ─── Header helpers (middleware injects these) ────────────────────────────────

function getAgentMeta(): { name: string | null; email: string | null; phone: string | null; agency: string | null } {
  try {
    const h = headers() as unknown as { get(name: string): string | null };
    return {
      name:   h.get("x-agent-name")   || null,
      email:  h.get("x-agent-email")  || null,
      phone:  h.get("x-agent-phone")  || null,
      agency: h.get("x-agent-agency") || null,
    };
  } catch {
    return { name: null, email: null, phone: null, agency: null };
  }
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function parsePhotoUrls(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string") { try { return JSON.parse(v) as string[]; } catch { return []; } }
  return [];
}

function normaliseReply(r: unknown): import("./types").ReplyState {
  if (r === "yes" || r === "no") return r;
  return "pending";
}

function toTenancy(r: Record<string, unknown>): Tenancy {
  const ol = r.owner_leads as Record<string, unknown> | null | undefined;
  const property = ol
    ? {
        owner_name: (ol.owner_name as string) ?? "",
        owner_phone: (ol.owner_phone as string) ?? "",
        address: (ol.address as string | null) ?? undefined,
        unit: (ol.unit as string | null) ?? undefined,
        photo_urls: parsePhotoUrls(ol.photo_urls),
      }
    : undefined;

  return {
    id: r.id as string,
    property_id: (r.property_id as string | null) ?? undefined,
    tenant_name: r.tenant_name as string,
    tenant_phone: r.tenant_phone as string,
    due_day: r.due_day as number,
    amount: r.amount as number,
    current_month_paid: !!(r.current_month_paid),
    current_month_receipt_url: (r.current_month_receipt_url as string | null) ?? null,
    last_paid_month: (r.last_paid_month as string | null) ?? null,
    last_receipt_url: (r.last_receipt_url as string | null) ?? null,
    lhdn_status: (r.lhdn_status as LhdnStatus) ?? "none",
    status: r.status as TenancyStatus,
    forwarded_at: (r.forwarded_at as string | null) ?? null,
    contract_start: (r.contract_start as string | null) ?? null,
    contract_end: (r.contract_end as string | null) ?? null,
    contract_duration_months: (r.contract_duration_months as number | null) ?? null,
    lifecycle_stage: (r.lifecycle_stage as import("./types").LifecycleStage | null) ?? null,
    replied_tenant: normaliseReply(r.replied_tenant),
    replied_owner:  normaliseReply(r.replied_owner),
    tenant_renewal_completed_at: (r.tenant_renewal_completed_at as string | null) ?? null,
    owner_renewal_completed_at:  (r.owner_renewal_completed_at as string | null) ?? null,
    owner_noted_tenant_intent: (r.owner_noted_tenant_intent as "yes" | "no" | "unsure" | null) ?? null,
    renewal_proposed_start:  (r.renewal_proposed_start as string | null) ?? null,
    renewal_proposed_months: (r.renewal_proposed_months as number | null) ?? null,
    renewal_proposed_rent:   (r.renewal_proposed_rent as number | null) ?? null,
    closed_reason: (r.closed_reason as string | null) ?? null,
    agreement_url: (r.agreement_url as string | null) ?? null,
    created_at: r.created_at as string,
    property_name: (ol?.property_name as string | null) ?? undefined,
    property,
    owner_lead_id: (r.owner_lead_id as string | null) ?? null,
    user_id: (r.user_id as string | null) ?? null,
  };
}

function parseOwnerLead(r: Record<string, unknown>): OwnerLead {
  return {
    ...(r as unknown as OwnerLead),
    photo_urls: parsePhotoUrls(r.photo_urls),
  };
}

// ─── Cached data fetchers ─────────────────────────────────────────────────────
// unstable_cache caches across requests (up to 60s). Cannot use cookies() inside;
// use service client + explicit user_id filter instead.

const _cachedTenancies = unstable_cache(
  async (userId: string): Promise<Tenancy[]> => {
    const svc = createServiceClient();
    const { data, error } = await svc.from("tenancies").select(TENANCY_SELECT).eq("user_id", userId).order("due_day", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r: unknown) => toTenancy(r as Record<string, unknown>));
  },
  ["kk-tenancies"],
  { tags: ["kk-tenancies"], revalidate: 60 }
);

const _cachedLifecycleTenancies = unstable_cache(
  async (userId: string): Promise<Tenancy[]> => {
    const earliest = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const svc = createServiceClient();
    const { data, error } = await svc.from("tenancies").select(TENANCY_SELECT).eq("user_id", userId).not("contract_end", "is", null).gte("contract_end", earliest).order("contract_end", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r: unknown) => toTenancy(r as Record<string, unknown>));
  },
  ["kk-lifecycle-tenancies"],
  { tags: ["kk-tenancies"], revalidate: 60 }
);

const _cachedOwnerLeads = unstable_cache(
  async (userId: string): Promise<OwnerLead[]> => {
    const svc = createServiceClient();
    const { data, error } = await svc.from("owner_leads").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: unknown) => parseOwnerLead(r as Record<string, unknown>));
  },
  ["kk-owner-leads"],
  { tags: ["kk-owner-leads"], revalidate: 60 }
);

const _cachedListedOwnerLeads = unstable_cache(
  async (userId: string): Promise<OwnerLead[]> => {
    const svc = createServiceClient();
    const { data, error } = await svc.from("owner_leads").select("*").eq("user_id", userId).in("stage", ["listed", "matched"]).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: unknown) => parseOwnerLead(r as Record<string, unknown>));
  },
  ["kk-listed-owner-leads"],
  { tags: ["kk-owner-leads"], revalidate: 60 }
);

const _cachedAllTenantProfiles = unstable_cache(
  async (userId: string): Promise<TenantProfile[]> => {
    const svc = createServiceClient();
    const { data, error } = await svc.from("tenant_profiles").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as TenantProfile[];
  },
  ["kk-tenant-profiles"],
  { tags: ["kk-tenant-profiles"], revalidate: 60 }
);

const _cachedPropertySupports = unstable_cache(
  async (userId: string): Promise<PropertySupport[]> => {
    const svc = createServiceClient();
    const { data, error } = await svc.from("property_supports").select("id, name, phone, type, area, notes, starred, source, created_at").eq("user_id", userId).order("starred", { ascending: false }).order("type", { ascending: true }).order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as PropertySupport[];
  },
  ["kk-supports"],
  { tags: ["kk-supports"], revalidate: 60 }
);

const _cachedHomeDashboardStats = unstable_cache(
  async (userId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const in60  = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
    const earliest = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const svc = createServiceClient();
    const [
      { count: totalOwners },
      { count: uncontacted },
      { count: pipeline },
      { count: listedWithoutTenant },
      { count: activeContracts },
      { count: expiringIn60 },
    ] = await Promise.all([
      svc.from("owner_leads").select("*", { count: "exact", head: true }).eq("user_id", userId),
      svc.from("owner_leads").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("stage", "imported").or("outreach_count.is.null,outreach_count.eq.0"),
      svc.from("owner_leads").select("*", { count: "exact", head: true }).eq("user_id", userId).in("stage", ["replied","wants_rent","listed","matched"]),
      svc.from("owner_leads").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("stage", "listed"),
      svc.from("tenancies").select("*", { count: "exact", head: true }).eq("user_id", userId).not("contract_end", "is", null).gte("contract_end", earliest),
      svc.from("tenancies").select("*", { count: "exact", head: true }).eq("user_id", userId).not("contract_end", "is", null).gte("contract_end", today).lte("contract_end", in60),
    ]);
    return {
      totalOwners: totalOwners ?? 0,
      uncontacted: uncontacted ?? 0,
      pipeline: pipeline ?? 0,
      listedWithoutTenant: listedWithoutTenant ?? 0,
      activeContracts: activeContracts ?? 0,
      expiringIn60: expiringIn60 ?? 0,
    };
  },
  ["kk-home-stats"],
  { tags: ["kk-owner-leads", "kk-tenancies"], revalidate: 30 }
);

const _cachedAllActiveTenants = unstable_cache(
  async (userId: string) => {
    const svc = createServiceClient();
    const { data, error } = await svc
      .from("tenancies")
      .select("id, tenant_name, tenant_phone, amount, lifecycle_stage, owner_lead_id")
      .eq("user_id", userId)
      .not("lifecycle_stage", "eq", "closed")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = (data ?? []) as Record<string, unknown>[];
    const olIds = [...new Set(rows.map(r => r.owner_lead_id as string).filter(Boolean))];

    const olsRes = olIds.length > 0
      ? await svc.from("owner_leads").select("id, property_name, unit").in("id", olIds)
      : { data: [] as {id:string;property_name:string|null;unit:string|null}[] };

    const olMap = Object.fromEntries((olsRes.data ?? []).map((ol: {id:string;property_name:string|null;unit:string|null}) => [ol.id, ol]));

    return rows.map(row => {
      const ol = row.owner_lead_id ? olMap[row.owner_lead_id as string] : null;
      return {
        tenancy_id:      row.id as string,
        tenant_name:     row.tenant_name as string,
        tenant_phone:    row.tenant_phone as string | null,
        property_name:   (ol?.property_name ?? null) as string | null,
        unit:            (ol?.unit ?? null) as string | null,
        amount:          row.amount as number | null,
        lifecycle_stage: row.lifecycle_stage as string | null,
      };
    });
  },
  ["kk-active-tenants"],
  { tags: ["kk-tenancies", "kk-owner-leads"], revalidate: 60 }
);

// ─── Email helpers ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(email: string, firstName: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "kakisewa <support@kakisewa.com>",
      to: [email],
      bcc: ["howardhozh@gmail.com"],
      subject: "You're in — 14-day trial started",
      html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2F2F7;">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;">
  <div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 2px 24px rgba(0,0,0,0.09);">

    <!-- Header -->
    <div style="background:#0A0A0F;padding:26px 32px 22px;">
      <span style="font-size:21px;font-weight:800;color:#fff;letter-spacing:-0.03em;">kaki<span style="color:#34C759">sewa</span></span>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px 32px;">
      <h1 style="font-size:24px;font-weight:700;color:#1C1C1E;letter-spacing:-0.02em;margin:0 0 10px;">Hey ${firstName}, you're in.</h1>
      <p style="font-size:14px;color:#48484A;line-height:1.65;margin:0 0 24px;">
        Your 14-day free trial is live. KakiSewa is built for Malaysian rental agents — track tenancies, send tenant packs, and never miss a renewal.
      </p>

      <!-- Steps -->
      <div style="background:#F2F2F7;border-radius:14px;padding:16px 18px;margin:0 0 24px;">
        <p style="font-size:10px;font-weight:700;color:#8E8E93;letter-spacing:0.07em;text-transform:uppercase;margin:0 0 14px;">Get started in 3 steps</p>
        <div style="font-size:13px;color:#1C1C1E;line-height:1;">
          <div style="margin-bottom:10px;display:flex;align-items:baseline;gap:10px;">
            <span style="font-family:'Courier New',monospace;background:#E5E5EA;padding:2px 7px;border-radius:5px;font-size:10px;color:#8E8E93;flex-shrink:0;">01</span>
            <span>Add a property and set your commission rate</span>
          </div>
          <div style="margin-bottom:10px;display:flex;align-items:baseline;gap:10px;">
            <span style="font-family:'Courier New',monospace;background:#E5E5EA;padding:2px 7px;border-radius:5px;font-size:10px;color:#8E8E93;flex-shrink:0;">02</span>
            <span>Create your first tenancy card</span>
          </div>
          <div style="display:flex;align-items:baseline;gap:10px;">
            <span style="font-family:'Courier New',monospace;background:#E5E5EA;padding:2px 7px;border-radius:5px;font-size:10px;color:#8E8E93;flex-shrink:0;">03</span>
            <span>Send a tenant pack to a landlord</span>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <a href="https://www.kakisewa.com/home"
        style="display:inline-block;background:#1C1C1E;color:#fff;font-size:14px;font-weight:600;
               padding:13px 28px;border-radius:12px;text-decoration:none;letter-spacing:-0.01em;">
        Open dashboard →
      </a>

      <!-- Trial badge -->
      <div style="margin-top:20px;padding:11px 16px;border-radius:10px;border:1px solid #E5E5EA;display:inline-block;">
        <span style="font-family:'Courier New',monospace;font-size:11px;color:#34C759;font-weight:700;">TRIAL ACTIVE</span>
        <span style="font-size:12px;color:#8E8E93;margin-left:8px;">14 days free · No card needed yet</span>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#F9F9FB;padding:14px 32px;border-top:1px solid #F2F2F7;">
      <p style="font-size:11px;color:#AEAEB2;margin:0;">Questions? Just reply — we read everything.</p>
    </div>

  </div>
</div>
</body></html>`,
    }),
  });
}

// ─── Tenancies ────────────────────────────────────────────────────────────────

const TENANCY_SELECT = "*, owner_leads!owner_lead_id(id, owner_name, owner_phone, property_name, unit, address, photo_urls, is_managed)";

export async function getTenancies(): Promise<Tenancy[]> {
  const userId = await getCurrentUserId();
  if (!userId) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("tenancies").select(TENANCY_SELECT).order("due_day", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(r => toTenancy(r as Record<string, unknown>));
  }
  return _cachedTenancies(userId);
}

export async function getTenancy(id: string): Promise<Tenancy | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenancies")
    .select(TENANCY_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toTenancy(data as Record<string, unknown>) : null;
}

export async function createTenancy(
  data: Omit<Tenancy, "id" | "created_at" | "property" | "property_name">
): Promise<Tenancy> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  const id = `ten_${Date.now()}`;
  const { error } = await supabase
    .from("tenancies")
    .insert({
      id,
      user_id: user!.id,
      property_id: data.property_id ?? null,
      tenant_name: data.tenant_name,
      tenant_phone: data.tenant_phone,
      due_day: data.due_day,
      amount: data.amount,
      current_month_paid: data.current_month_paid,
      current_month_receipt_url: data.current_month_receipt_url ?? null,
      last_paid_month: data.last_paid_month ?? null,
      last_receipt_url: data.last_receipt_url ?? null,
      lhdn_status: data.lhdn_status ?? "none",
      status: data.status,
      contract_start: data.contract_start ?? null,
      contract_end: data.contract_end ?? null,
      contract_duration_months: data.contract_duration_months ?? null,
      owner_lead_id: data.owner_lead_id ?? null,
    });
  if (error) throw error;
  return (await getTenancy(id))!;
}

export async function upsertTenancyByPhone(
  phone: string,
  data: Partial<Omit<Tenancy, "id" | "created_at" | "property" | "property_name">>
): Promise<Tenancy> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("tenancies")
    .select("id")
    .eq("tenant_phone", phone)
    .maybeSingle();
  if (existing) {
    await updateTenancy(existing.id, data);
    return (await getTenancy(existing.id))!;
  }
  return createTenancy({
    property_id: data.property_id ?? undefined,
    tenant_name: data.tenant_name ?? "Unknown",
    tenant_phone: phone,
    due_day: data.due_day ?? 1,
    amount: data.amount ?? 0,
    current_month_paid: false,
    lhdn_status: "none",
    status: "Pending",
    replied_tenant: "pending",
    replied_owner: "pending",
    ...data,
  } as Omit<Tenancy, "id" | "created_at" | "property" | "property_name">);
}

export async function updateTenancy(id: string, data: Partial<Tenancy>): Promise<Tenancy | null> {
  const updates: Record<string, unknown> = {};
  if (data.status !== undefined)                    updates.status = data.status;
  if (data.current_month_paid !== undefined)        updates.current_month_paid = data.current_month_paid;
  if (data.current_month_receipt_url !== undefined) updates.current_month_receipt_url = data.current_month_receipt_url;
  if (data.last_paid_month !== undefined)           updates.last_paid_month = data.last_paid_month;
  if (data.last_receipt_url !== undefined)          updates.last_receipt_url = data.last_receipt_url;
  if (data.lhdn_status !== undefined)               updates.lhdn_status = data.lhdn_status;
  if (data.due_day !== undefined)                   updates.due_day = data.due_day;
  if (data.amount !== undefined)                    updates.amount = data.amount;
  if (data.tenant_name !== undefined)               updates.tenant_name = data.tenant_name;
  if (data.tenant_phone !== undefined)              updates.tenant_phone = data.tenant_phone;
  if (data.forwarded_at !== undefined)              updates.forwarded_at = data.forwarded_at;
  if (data.contract_start !== undefined)            updates.contract_start = data.contract_start;
  if (data.contract_end !== undefined)              updates.contract_end = data.contract_end;
  if (data.contract_duration_months !== undefined)  updates.contract_duration_months = data.contract_duration_months;
  if (data.lifecycle_stage !== undefined)           updates.lifecycle_stage = data.lifecycle_stage;
  if (data.replied_tenant !== undefined)            updates.replied_tenant = data.replied_tenant;
  if (data.replied_owner !== undefined)             updates.replied_owner = data.replied_owner;
  if (data.owner_lead_id !== undefined)             updates.owner_lead_id = data.owner_lead_id;
  if (data.closed_reason !== undefined)             updates.closed_reason = data.closed_reason;
  if (data.agreement_url !== undefined)             updates.agreement_url = data.agreement_url;

  if (Object.keys(updates).length === 0) return getTenancy(id);
  const supabase = await createClient();
  const { error } = await supabase.from("tenancies").update(updates).eq("id", id);
  if (error) throw error;
  return getTenancy(id);
}

export async function deleteTenancy(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("tenancies").delete().eq("id", id);
  if (error) throw error;
}

// ─── Algorithm of Trust ───────────────────────────────────────────────────────

export async function getCriticalTenancies(): Promise<Tenancy[]> {
  const day = new Date().getDate();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenancies")
    .select(TENANCY_SELECT)
    .eq("current_month_paid", false)
    .lte("due_day", day)
    .order("due_day", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(r => toTenancy(r as Record<string, unknown>));
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getStats() {
  const all = await getTenancies();
  const critical = await getCriticalTenancies();
  const totalRent = all.reduce((s, t) => s + t.amount, 0);
  const collectedRent = all.filter((t) => t.current_month_paid).reduce((s, t) => s + t.amount, 0);
  return {
    total: all.length,
    pending: all.filter((t) => t.status === "Pending").length,
    reminderSent: all.filter((t) => t.status === "Reminder Sent").length,
    pendingVerification: all.filter((t) => t.status === "Paid - Pending Verification").length,
    verified: all.filter((t) => t.status === "Verified").length,
    critical: critical.length,
    totalRent, collectedRent,
    collectionPct: totalRent > 0 ? Math.round((collectedRent / totalRent) * 100) : 0,
  };
}

// ─── WhatsApp message log ────────────────────────────────────────────────────

interface LogParams {
  related_id?: string | null;
  related_type?: string | null;
  template: WhatsAppTemplate;
  recipient_phone: string;
  recipient_name?: string | null;
  body?: string | null;
  channel?: "wa_me" | "bsp_api";
}

export async function logWhatsApp(p: LogParams): Promise<void> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  const id = `wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const { error } = await supabase.from("whatsapp_log").insert({
    id,
    user_id: user!.id,
    related_id: p.related_id ?? null,
    related_type: p.related_type ?? null,
    template: p.template,
    recipient_phone: p.recipient_phone,
    recipient_name: p.recipient_name ?? null,
    body: p.body ?? null,
    channel: p.channel ?? "wa_me",
  });
  if (error) throw error;
}

export async function getExpiringTenancies(maxDays = 60): Promise<Tenancy[]> {
  const today = new Date();
  const past   = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const future = new Date(today.getTime() + maxDays * 86400000).toISOString().slice(0, 10);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenancies")
    .select(TENANCY_SELECT)
    .not("contract_end", "is", null)
    .gte("contract_end", past)
    .lte("contract_end", future)
    .neq("lifecycle_stage", "closed")
    .order("contract_end", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(r => toTenancy(r as Record<string, unknown>));
}

export async function getRecentWhatsAppForRelated(
  related_type: string,
  related_id: string,
  limit = 10
): Promise<WhatsAppLogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whatsapp_log")
    .select("*")
    .eq("related_type", related_type)
    .eq("related_id", related_id)
    .order("sent_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WhatsAppLogEntry[];
}

// ─── Lifecycle board ─────────────────────────────────────────────────────────

export async function getLifecycleTenancies(): Promise<Tenancy[]> {
  const userId = await getCurrentUserId();
  if (!userId) {
    const earliest = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const supabase = await createClient();
    const { data, error } = await supabase.from("tenancies").select(TENANCY_SELECT).not("contract_end", "is", null).gte("contract_end", earliest).order("contract_end", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(r => toTenancy(r as Record<string, unknown>));
  }
  return _cachedLifecycleTenancies(userId);
}

export async function countOwnerLeads(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("owner_leads")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function countLifecycleTenancies(): Promise<number> {
  const earliest = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("tenancies")
    .select("*", { count: "exact", head: true })
    .not("contract_end", "is", null)
    .gte("contract_end", earliest);
  if (error) throw error;
  return count ?? 0;
}

export async function countTenantProfiles(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("tenant_profiles")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function countPropertySupports(since?: Date): Promise<number> {
  const supabase = await createClient();
  let q = supabase.from("property_supports").select("*", { count: "exact", head: true });
  if (since) q = q.gte("created_at", since.toISOString());
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export async function getHomeDashboardStats(): Promise<{
  totalOwners: number;
  uncontacted: number;
  pipeline: number;
  listedWithoutTenant: number;
  activeContracts: number;
  expiringIn60: number;
}> {
  const userId = await getCurrentUserId();
  if (userId) return _cachedHomeDashboardStats(userId);

  const today = new Date().toISOString().slice(0, 10);
  const in60  = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  const earliest = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const supabase = await createClient();
  const [
    { count: totalOwners },
    { count: uncontacted },
    { count: pipeline },
    { count: listedWithoutTenant },
    { count: activeContracts },
    { count: expiringIn60 },
  ] = await Promise.all([
    supabase.from("owner_leads").select("*", { count: "exact", head: true }),
    supabase.from("owner_leads").select("*", { count: "exact", head: true }).eq("stage", "imported").or("outreach_count.is.null,outreach_count.eq.0"),
    supabase.from("owner_leads").select("*", { count: "exact", head: true }).in("stage", ["replied","wants_rent","listed","matched"]),
    supabase.from("owner_leads").select("*", { count: "exact", head: true }).eq("stage", "listed"),
    supabase.from("tenancies").select("*", { count: "exact", head: true }).not("contract_end", "is", null).gte("contract_end", earliest),
    supabase.from("tenancies").select("*", { count: "exact", head: true }).not("contract_end", "is", null).gte("contract_end", today).lte("contract_end", in60),
  ]);
  return {
    totalOwners: totalOwners ?? 0,
    uncontacted: uncontacted ?? 0,
    pipeline: pipeline ?? 0,
    listedWithoutTenant: listedWithoutTenant ?? 0,
    activeContracts: activeContracts ?? 0,
    expiringIn60: expiringIn60 ?? 0,
  };
}

export async function getExpiringContractsPreview(days = 60): Promise<Array<{
  id: string; tenant_name: string; property_name: string | null; unit: string | null; contract_end: string; daysLeft: number;
}>> {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const cutoff = new Date(today.getTime() + days * 86400000).toISOString().slice(0, 10);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenancies")
    .select("id, tenant_name, contract_end, owner_lead_id, owner_leads!owner_lead_id(property_name, unit)")
    .not("contract_end", "is", null)
    .gte("contract_end", todayStr)
    .lte("contract_end", cutoff)
    .order("contract_end", { ascending: true })
    .limit(8);
  if (error) throw error;

  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const ol = row.owner_leads as Record<string, unknown> | null;
    const contract_end = row.contract_end as string;
    return {
      id: row.id as string,
      tenant_name: row.tenant_name as string,
      property_name: (ol?.property_name ?? null) as string | null,
      unit: (ol?.unit ?? null) as string | null,
      contract_end,
      daysLeft: Math.ceil((new Date(contract_end).getTime() - today.getTime()) / 86400000),
    };
  });
}

// ─── Agent profile ───────────────────────────────────────────────────────────

export async function recordCommissionEvent(data: {
  id?: string;
  tenancy_id?: string | null;
  owner_lead_id?: string | null;
  type: "new_signing" | "renewal";
  amount: number;
  earned_on: string;
  notes?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  const id = data.id ?? `ce_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const { error } = await supabase
    .from("commission_events")
    .upsert({
      id,
      user_id: user!.id,
      tenancy_id: data.tenancy_id ?? null,
      owner_lead_id: data.owner_lead_id ?? null,
      type: data.type,
      amount: data.amount,
      earned_on: data.earned_on,
      notes: data.notes ?? null,
    }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
}

function gmt8Today(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function recordLoginStreak(): Promise<number> {
  const today = gmt8Today();
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return 0;

  const { data: row } = await supabase
    .from("agent_profiles")
    .select("login_streak, longest_streak, last_login_date")
    .eq("id", user.id)
    .maybeSingle();

  if (!row) return 0;
  const cur = (row.login_streak as number | null) ?? 0;
  if (row.last_login_date === today) return cur;

  const yesterday = new Date(Date.now() - 86400000 + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const next = row.last_login_date === yesterday ? cur + 1 : 1;
  const longest = Math.max((row.longest_streak as number | null) ?? 0, next);
  await supabase
    .from("agent_profiles")
    .update({ login_streak: next, longest_streak: longest, last_login_date: today })
    .eq("id", user.id);
  return next;
}

export async function bumpLoginStreak(): Promise<number> {
  const today = gmt8Today();
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return 0;

  const { data: row } = await supabase
    .from("agent_profiles")
    .select("login_streak, longest_streak, last_login_date")
    .eq("id", user.id)
    .maybeSingle();

  if (!row) return 0;
  if (row.last_login_date === today) return (row.login_streak as number | null) ?? 0;
  const next = ((row.login_streak as number | null) ?? 0) + 1;
  const longest = Math.max((row.longest_streak as number | null) ?? 0, next);
  await supabase
    .from("agent_profiles")
    .update({ login_streak: next, longest_streak: longest, last_login_date: today })
    .eq("id", user.id);
  return next;
}

export async function getAgentProfileByUserId(userId: string): Promise<{ name: string | null; agency: string | null; photo_url: string | null }> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("agent_profiles")
    .select("name, agency, photo_url")
    .eq("id", userId)
    .maybeSingle();
  const row = data as { name?: string | null; agency?: string | null; photo_url?: string | null } | null;
  return { name: row?.name ?? null, agency: row?.agency ?? null, photo_url: row?.photo_url ?? null };
}

export const getAgentProfile = cache(async (): Promise<AgentProfile> => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return { id: 0 } as AgentProfile;

  const { data: row } = await supabase
    .from("agent_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!row) {
    // First login — seed profile from user_metadata and start trial
    const meta = user.user_metadata ?? {};
    const { BETA_DURATION_DAYS } = await import("./beta-config");
    const trialStart = new Date().toISOString();
    const trialEnd = new Date(Date.now() + BETA_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const renRaw = (meta.ren_number as string | null) ?? null;
    const renNumber = renRaw ? renRaw.toUpperCase().replace(/^REN\s*/i, "REN").trim() : null;
    await supabase.from("agent_profiles").upsert({
      id: user.id,
      name: meta.full_name ?? null,
      phone: meta.phone ?? null,
      agency: meta.agency ?? null,
      ren_number: renNumber,
      trial_started_at: trialStart,
      trial_ends_at: trialEnd,
      subscription_status: "beta",
      referral_slug: (meta.referral_slug as string | null) ?? null,
    });
    // Stamp invite as used (fire-and-forget)
    if (user.email) {
      const { createServiceClient } = await import("./supabase/service");
      const svc = createServiceClient();
      svc.from("invites")
        .update({ used_at: trialStart })
        .eq("email", user.email.toLowerCase().trim())
        .is("used_at", null)
        .then(() => {});
    }
    // Send welcome email non-blocking
    if (user.email) {
      const firstName = ((meta.full_name as string | null) ?? "").split(" ")[0] || "there";
      sendWelcomeEmail(user.email, firstName).catch(() => {});
    }
    const { data: fresh } = await supabase
      .from("agent_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    const base = (fresh ?? { id: 0 }) as AgentProfile;
    const headerMeta = getAgentMeta();
    if (headerMeta.name)   base.name   = headerMeta.name;
    if (headerMeta.phone)  base.phone  = headerMeta.phone;
    if (headerMeta.agency) base.agency = headerMeta.agency;
    return base;
  }

  const base = row as AgentProfile;
  const headerMeta = getAgentMeta();
  if (headerMeta.name)   base.name   = headerMeta.name;
  if (headerMeta.phone)  base.phone  = headerMeta.phone;
  if (headerMeta.agency) base.agency = headerMeta.agency;
  return base;
});

export async function saveProfileContent(data: {
  profile_strengths?: import("./types").ProfileStrengthItem[] | null;
  profile_verbatim?: import("./types").ProfileVerbatimItem[] | null;
}): Promise<void> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;
  const updates: Record<string, unknown> = {};
  if (data.profile_strengths !== undefined) updates.profile_strengths = data.profile_strengths;
  if (data.profile_verbatim  !== undefined) updates.profile_verbatim  = data.profile_verbatim;
  await supabase.from("agent_profiles").update(updates).eq("id", user.id);
}

export async function saveWhatsAppTemplates(overrides: import("./whatsapp-templates").TemplateOverrides): Promise<void> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;
  await supabase
    .from("agent_profiles")
    .update({ whatsapp_templates: JSON.stringify(overrides) })
    .eq("id", user.id);
}

export async function updateAgentProfile(p: Partial<AgentProfile>): Promise<void> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;

  const updates: Record<string, unknown> = {};
  if (p.name !== undefined)                    updates.name = p.name;
  if (p.phone !== undefined)                   updates.phone = p.phone;
  if (p.agency !== undefined)                  updates.agency = p.agency;
  if (p.photo_url !== undefined)               updates.photo_url = p.photo_url;
  if (p.accent_color !== undefined)            updates.accent_color = p.accent_color;
  if (p.commission_pct !== undefined)          updates.commission_pct = p.commission_pct;
  if (p.monthly_goal_rm !== undefined)         updates.monthly_goal_rm = p.monthly_goal_rm;
  if (p.quarterly_goal_rm !== undefined)       updates.quarterly_goal_rm = p.quarterly_goal_rm;
  if (p.today_focus !== undefined)             updates.today_focus = p.today_focus;
  if (p.today_focus_updated_at !== undefined)  updates.today_focus_updated_at = p.today_focus_updated_at;
  if (p.today_checklist !== undefined)         updates.today_checklist = p.today_checklist;
  if (p.motivation_photo_url !== undefined)    updates.motivation_photo_url = p.motivation_photo_url;
  if (p.ren_number !== undefined)             updates.ren_number = p.ren_number;
  if (Object.keys(updates).length === 0) return;

  await supabase.from("agent_profiles").update(updates).eq("id", user.id);
}

export async function getMonthlyCommissionTimeline(year: number = new Date().getFullYear()): Promise<{
  months: Array<{ key: string; label: string; year: number; isPast: boolean; isCurrent: boolean; isFuture: boolean; commission: number }>;
  ytd: number;
  monthlyGoal: number;
  annualGoal: number;
  remainingMonths: number;
  monthlyForecastNeeded: number;
  pct: number;
}> {
  const today = new Date();
  const agent = await getAgentProfile();
  const monthlyGoal = agent.monthly_goal_rm ?? 0;
  const annualGoal  = monthlyGoal * 12;
  const MONTHS_LONG = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const monthsRaw = Array.from({ length: 12 }, (_, i) => ({
    key: `${year}-${String(i + 1).padStart(2, "0")}`,
    label: MONTHS_LONG[i],
    year,
    monthIdx: i,
  }));

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("commission_events")
    .select("earned_on, amount")
    .in("earned_on", monthsRaw.map(m => m.key).flatMap(k => {
      // We need rows where earned_on starts with each key (YYYY-MM)
      return [];
    }));
  // Use a different approach: fetch all for the year and group client-side
  const { data: yearRows } = await supabase
    .from("commission_events")
    .select("earned_on, amount")
    .gte("earned_on", `${year}-01-01`)
    .lte("earned_on", `${year}-12-31`);

  const byMonth = new Map<string, number>();
  for (const r of yearRows ?? []) {
    const row = r as { earned_on: string; amount: number };
    const k = row.earned_on.slice(0, 7);
    byMonth.set(k, (byMonth.get(k) ?? 0) + row.amount);
  }

  const todayMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const months = monthsRaw.map((m) => {
    const mStart = new Date(m.year, m.monthIdx, 1).getTime();
    return {
      key: m.key,
      label: m.label,
      year: m.year,
      isPast:    mStart < todayMonthStart,
      isCurrent: mStart === todayMonthStart,
      isFuture:  mStart > todayMonthStart,
      commission: byMonth.get(m.key) ?? 0,
    };
  });

  const ytd = months.filter((m) => m.isPast || m.isCurrent).reduce((a, b) => a + b.commission, 0);
  const remainingMonths = months.filter((m) => m.isFuture).length;
  const monthlyForecastNeeded = annualGoal > 0 && remainingMonths > 0
    ? Math.max(0, (annualGoal - ytd) / remainingMonths)
    : 0;
  const annualPct = annualGoal > 0 ? Math.round((ytd / annualGoal) * 100) : 0;

  return { months, ytd, monthlyGoal, annualGoal, remainingMonths, monthlyForecastNeeded, pct: annualPct };
}

export async function getPerformanceSummary(): Promise<import("./types").PerformanceSummary> {
  const today = new Date();
  const agent = await getAgentProfile();
  const monthlyGoal   = agent.monthly_goal_rm   ?? 0;
  const quarterlyGoal = agent.quarterly_goal_rm ?? 0;

  const monthIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const monthIsoOf = monthIso(today);

  const quarterMonths: string[] = [];
  for (let i = 0; i < 3; i++) {
    quarterMonths.push(monthIso(new Date(today.getFullYear(), today.getMonth() - i, 1)));
  }
  const yearStart = `${today.getFullYear()}-01-01`;

  const supabase = await createClient();
  const { data: allYear } = await supabase
    .from("commission_events")
    .select("earned_on, amount, type")
    .gte("earned_on", yearStart)
    .lte("earned_on", `${today.getFullYear()}-12-31`);

  let mtdCommission = 0, qtdCommission = 0, ytdCommission = 0;
  let signedThisMonth = 0, signedThisQuarter = 0;
  for (const r of allYear ?? []) {
    const row = r as { earned_on: string; amount: number; type: string };
    const k = row.earned_on.slice(0, 7);
    ytdCommission += row.amount;
    if (quarterMonths.includes(k)) { qtdCommission += row.amount; signedThisQuarter++; }
    if (k === monthIsoOf) { mtdCommission += row.amount; signedThisMonth++; }
  }

  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const q = Math.floor(today.getMonth() / 3) + 1;

  return {
    monthLabel:   `${months[today.getMonth()]} ${today.getFullYear()}`,
    quarterLabel: `Q${q} ${today.getFullYear()}`,
    mtdCommission,
    qtdCommission,
    ytdCommission,
    signedThisMonth,
    signedThisQuarter,
    monthlyGoal,
    quarterlyGoal,
    monthlyPct:   monthlyGoal   > 0 ? Math.round((mtdCommission   / monthlyGoal)   * 100) : 0,
    quarterlyPct: quarterlyGoal > 0 ? Math.round((qtdCommission   / quarterlyGoal) * 100) : 0,
  };
}

// ─── Owner leads ─────────────────────────────────────────────────────────────

export async function getOwnerLeads(): Promise<OwnerLead[]> {
  const userId = await getCurrentUserId();
  if (!userId) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("owner_leads").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => parseOwnerLead(r as Record<string, unknown>));
  }
  return _cachedOwnerLeads(userId);
}

export async function createOwnerLead(data: Omit<OwnerLead, "id" | "created_at">): Promise<OwnerLead> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  const id = `olead_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.from("owner_leads").insert({
    id,
    user_id: user!.id,
    owner_name: data.owner_name,
    owner_phone: data.owner_phone,
    property_name: data.property_name ?? null,
    unit: data.unit ?? null,
    address: data.address ?? null,
    expected_rent: data.expected_rent ?? null,
    bedrooms: data.bedrooms ?? null,
    bathrooms: data.bathrooms ?? null,
    notes: data.notes ?? null,
    source: data.source ?? "manual",
    import_batch_id: data.import_batch_id ?? null,
    stage: data.stage ?? "imported",
    available_from: data.available_from ?? null,
    listing_purpose: data.listing_purpose ?? null,
  });
  if (error) throw error;
  const { data: fresh } = await supabase.from("owner_leads").select("*").eq("id", id).single();
  return parseOwnerLead(fresh as Record<string, unknown>);
}

export async function bulkCreateOwnerLeads(
  rows: Array<Omit<OwnerLead, "id" | "created_at">>,
  userId: string
): Promise<number> {
  if (rows.length === 0) return 0;
  const supabase = await createClient();
  const now = Date.now();
  const records = rows.map((data, i) => ({
    id: `olead_${now}_${i}_${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    owner_name: data.owner_name,
    owner_phone: data.owner_phone,
    property_name: data.property_name ?? null,
    unit: data.unit ?? null,
    address: data.address ?? null,
    expected_rent: data.expected_rent ?? null,
    bedrooms: data.bedrooms ?? null,
    bathrooms: data.bathrooms ?? null,
    notes: data.notes ?? null,
    source: data.source ?? "csv",
    import_batch_id: data.import_batch_id ?? null,
    stage: data.stage ?? "imported",
    available_from: data.available_from ?? null,
  }));
  const CHUNK = 200;
  for (let i = 0; i < records.length; i += CHUNK) {
    const { error } = await supabase.from("owner_leads").insert(records.slice(i, i + CHUNK));
    if (error) throw error;
  }
  return records.length;
}

export async function updateOwnerLead(id: string, data: Partial<OwnerLead>): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (data.owner_name !== undefined)             updates.owner_name = data.owner_name;
  if (data.owner_phone !== undefined)            updates.owner_phone = data.owner_phone;
  if (data.stage !== undefined)                  updates.stage = data.stage;
  if (data.notes !== undefined)                  updates.notes = data.notes;
  if (data.expected_rent !== undefined)          updates.expected_rent = data.expected_rent;
  if (data.bedrooms !== undefined)               updates.bedrooms = data.bedrooms;
  if (data.bathrooms !== undefined)              updates.bathrooms = data.bathrooms;
  if (data.property_name !== undefined)          updates.property_name = data.property_name;
  if (data.unit !== undefined)                   updates.unit = data.unit;
  if (data.address !== undefined)                updates.address = data.address;
  if (data.is_renewal !== undefined)             updates.is_renewal = data.is_renewal;
  if (data.commission_override_rm !== undefined) updates.commission_override_rm = data.commission_override_rm;
  if (data.available_from !== undefined)         updates.available_from = data.available_from;
  if (data.photo_urls !== undefined)             updates.photo_urls = data.photo_urls ?? [];
  if (data.agreement_url !== undefined)          updates.agreement_url = data.agreement_url;
  if (data.intake_sent_at !== undefined)         updates.intake_sent_at = data.intake_sent_at;
  if (data.is_managed !== undefined)             updates.is_managed = data.is_managed;
  if (data.managed_at !== undefined)             updates.managed_at = data.managed_at;
  if (Object.keys(updates).length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("owner_leads").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteOwnerLead(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("owner_leads").delete().eq("id", id);
  if (error) throw error;
}

export async function updateOwnerLeadPhotos(id: string, urls: string[]): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("owner_leads")
    .update({ photo_urls: urls.slice(0, 4) })
    .eq("id", id);
  if (error) throw error;
}

// ─── Matching: tenant profiles + packs ───────────────────────────────────────

export async function createTenantProfile(
  data: Omit<TenantProfile, "id" | "created_at">
): Promise<TenantProfile> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  const id = `tp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  // Build insert object — only include optional newer columns if explicitly provided,
  // so this works even if those columns haven't been migrated yet in the DB.
  const row: Record<string, unknown> = {
    id,
    user_id: user!.id,
    name: data.name,
    phone: data.phone ?? null,
    age: data.age ?? null,
    occupation: data.occupation ?? null,
    nationality: data.nationality ?? null,
    monthly_income: data.monthly_income ?? null,
    preferred_move_in: data.preferred_move_in ?? null,
    occupants: data.occupants ?? null,
    pets: data.pets ?? 0,
    smoking: data.smoking ?? 0,
    budget_max: data.budget_max ?? null,
    bedrooms_pref: data.bedrooms_pref ?? null,
    notes: data.notes ?? null,
    // source column not yet in DB — add via migration 20260531_tenant_profile_source.sql
  };
  if (data.employer !== undefined)           row.employer = data.employer;
  if (data.budget_min !== undefined)         row.budget_min = data.budget_min;
  if (data.bathrooms_pref !== undefined)     row.bathrooms_pref = data.bathrooms_pref;
  if (data.is_seeking !== undefined)         row.is_seeking = data.is_seeking;
  if (data.seeking_from !== undefined)       row.seeking_from = data.seeking_from;
  if (data.seeking_budget_max !== undefined) row.seeking_budget_max = data.seeking_budget_max;
  const { error } = await supabase.from("tenant_profiles").insert(row);
  if (error) throw error;
  const { data: fresh } = await supabase.from("tenant_profiles").select("*").eq("id", id).single();
  return fresh as TenantProfile;
}

export async function getLifetimeCommissionStats(): Promise<{
  dealCount: number;
  totalEarned: number;
  yearDeals: number;
  yearEarned: number;
  yearGoal: number;
  bestMonthAmount: number;
  bestMonthLabel: string | null;
  bestMonthThisYearAmount: number;
  bestMonthThisYearLabel: string | null;
}> {
  const thisYear = new Date().getFullYear().toString();
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const supabase = await createClient();

  const { data: all } = await supabase.from("commission_events").select("earned_on, amount");
  const rows = (all ?? []) as { earned_on: string; amount: number }[];

  let dealCount = 0, totalEarned = 0, yearDeals = 0, yearEarned = 0;
  const byMonth = new Map<string, number>();
  const byMonthYear = new Map<string, number>();

  for (const r of rows) {
    dealCount++;
    totalEarned += r.amount;
    const k = r.earned_on.slice(0, 7);
    byMonth.set(k, (byMonth.get(k) ?? 0) + r.amount);
    if (r.earned_on.startsWith(thisYear)) {
      yearDeals++;
      yearEarned += r.amount;
      byMonthYear.set(k, (byMonthYear.get(k) ?? 0) + r.amount);
    }
  }

  const agent = await getAgentProfile();
  const yearGoal = (agent.monthly_goal_rm ?? 0) * 12;

  const bestEntry = [...byMonth.entries()].sort((a, b) => b[1] - a[1])[0];
  const bestYearEntry = [...byMonthYear.entries()].sort((a, b) => b[1] - a[1])[0];

  const toLabel = (entry: [string, number] | undefined) => {
    if (!entry) return null;
    const [k] = entry;
    const [y, m] = k.split("-");
    return `${MONTHS[parseInt(m) - 1]} ${y}`;
  };

  return {
    dealCount,
    totalEarned,
    yearDeals,
    yearEarned,
    yearGoal,
    bestMonthAmount: bestEntry?.[1] ?? 0,
    bestMonthLabel: toLabel(bestEntry),
    bestMonthThisYearAmount: bestYearEntry?.[1] ?? 0,
    bestMonthThisYearLabel: toLabel(bestYearEntry),
  };
}

export async function getEliteAnalyticsData(): Promise<{
  yoy: {
    currentYear: number;
    lastYear: number;
    monthsCurrent: Array<{ label: string; amount: number }>;
    monthsLast: Array<{ label: string; amount: number }>;
    totalCurrent: number;
    totalLast: number;
  };
  renewalRecovery: {
    recovered: number;
    total: number;
    missed: number;
    recoveredCount: number;
    missedCount: number;
  };
  leadConversion: Array<{
    month: string;
    label: string;
    total: number;
    matched: number;
    rate: number;
  }>;
  outreach: {
    ownerTotal: number;
    ownerContacted: number;
    ownerClickRate: number;
    tenantIntakeSent: number;
    tenantIntake30d: number;
  };
}> {
  const supabase = await createClient();
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now = new Date();
  const currentYear = now.getFullYear();
  const lastYear = currentYear - 1;

  // ── 1. YoY commission ────────────────────────────────────────────────────
  const [currRows, lastRows] = await Promise.all([
    supabase.from("commission_events").select("earned_on, amount")
      .gte("earned_on", `${currentYear}-01-01`).lte("earned_on", `${currentYear}-12-31`),
    supabase.from("commission_events").select("earned_on, amount")
      .gte("earned_on", `${lastYear}-01-01`).lte("earned_on", `${lastYear}-12-31`),
  ]);
  const byMonthCurr = new Map<number, number>();
  let totalCurrent = 0;
  for (const r of currRows.data ?? []) {
    const row = r as { earned_on: string; amount: number };
    const m = parseInt(row.earned_on.slice(5, 7)) - 1;
    byMonthCurr.set(m, (byMonthCurr.get(m) ?? 0) + row.amount);
    totalCurrent += row.amount;
  }
  const byMonthLast = new Map<number, number>();
  let totalLast = 0;
  for (const r of lastRows.data ?? []) {
    const row = r as { earned_on: string; amount: number };
    const m = parseInt(row.earned_on.slice(5, 7)) - 1;
    byMonthLast.set(m, (byMonthLast.get(m) ?? 0) + row.amount);
    totalLast += row.amount;
  }
  const monthsCurrent = MONTHS.map((label, i) => ({ label, amount: byMonthCurr.get(i) ?? 0 }));
  const monthsLast    = MONTHS.map((label, i) => ({ label, amount: byMonthLast.get(i) ?? 0 }));

  // ── 2. Renewal income recovery ──────────────────────────────────────────
  const yearStart = `${currentYear}-01-01`;
  const today = now.toISOString().slice(0, 10);
  const [expiredTenancies, renewalEvents] = await Promise.all([
    supabase.from("tenancies").select("id, amount")
      .not("contract_end", "is", null)
      .gte("contract_end", yearStart)
      .lte("contract_end", today),
    supabase.from("commission_events").select("amount, tenancy_id")
      .eq("type", "renewal")
      .gte("earned_on", yearStart)
      .lte("earned_on", `${currentYear}-12-31`),
  ]);
  const renewedIds = new Set(
    ((renewalEvents.data ?? []) as { tenancy_id: string | null }[])
      .map(r => r.tenancy_id).filter(Boolean)
  );
  const recovered = ((renewalEvents.data ?? []) as { amount: number }[])
    .reduce((s, r) => s + r.amount, 0);
  let totalPotential = 0, missedCount = 0, recoveredCount = 0;
  for (const r of ((expiredTenancies.data ?? []) as { id: string; amount: number }[])) {
    const pot = r.amount * 0.5;
    totalPotential += pot;
    if (renewedIds.has(r.id)) recoveredCount++;
    else missedCount++;
  }
  const missed = Math.max(0, totalPotential - recovered);

  // ── 3. Lead conversion by available_from month ─────────────────────────
  const { data: allLeads } = await supabase
    .from("owner_leads")
    .select("stage, available_from")
    .not("available_from", "is", null);
  const convMap = new Map<string, { label: string; total: number; matched: number }>();
  for (const r of ((allLeads ?? []) as { stage: string; available_from: string }[])) {
    const af = r.available_from;
    if (!af) continue;
    const key = af.slice(0, 7);
    const [y, m] = key.split("-");
    const label = `${MONTHS[parseInt(m) - 1]} ${y}`;
    const cur = convMap.get(key) ?? { label, total: 0, matched: 0 };
    cur.total++;
    if (r.stage === "matched") cur.matched++;
    convMap.set(key, cur);
  }
  const leadConversion = [...convMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, v]) => ({ month, label: v.label, total: v.total, matched: v.matched, rate: v.total > 0 ? Math.round((v.matched / v.total) * 100) : 0 }));

  // ── 4. Outreach click rate ──────────────────────────────────────────────
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const [allLeadsCount, contactedCount, tenantIntakeAll, tenantIntake30d] = await Promise.all([
    supabase.from("owner_leads").select("*", { count: "exact", head: true }),
    supabase.from("owner_leads").select("*", { count: "exact", head: true })
      .not("outreach_count", "is", null).gt("outreach_count", 0),
    supabase.from("whatsapp_log").select("*", { count: "exact", head: true })
      .eq("template", "tenant_intake"),
    supabase.from("whatsapp_log").select("*", { count: "exact", head: true })
      .eq("template", "tenant_intake").gte("sent_at", thirtyDaysAgo),
  ]);
  const ownerTotal    = allLeadsCount.count ?? 0;
  const ownerContacted = contactedCount.count ?? 0;
  const ownerClickRate = ownerTotal > 0 ? Math.round((ownerContacted / ownerTotal) * 100) : 0;

  return {
    yoy: { currentYear, lastYear, monthsCurrent, monthsLast, totalCurrent, totalLast },
    renewalRecovery: { recovered, total: totalPotential, missed, recoveredCount, missedCount },
    leadConversion,
    outreach: {
      ownerTotal,
      ownerContacted,
      ownerClickRate,
      tenantIntakeSent: tenantIntakeAll.count ?? 0,
      tenantIntake30d:  tenantIntake30d.count ?? 0,
    },
  };
}

export async function getListedOwnerLeads(): Promise<OwnerLead[]> {
  const userId = await getCurrentUserId();
  if (!userId) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("owner_leads").select("*").in("stage", ["listed", "matched"]).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => parseOwnerLead(r as Record<string, unknown>));
  }
  return _cachedListedOwnerLeads(userId);
}

export async function getOwnerLead(id: string): Promise<OwnerLead | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("owner_leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? parseOwnerLead(data as Record<string, unknown>) : null;
}

export async function getOrCreateMatchPack(ownerLeadId: string): Promise<MatchPack> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("match_packs")
    .select("*")
    .eq("owner_lead_id", ownerLeadId)
    .maybeSingle();
  if (existing) return existing as MatchPack;

  const lead = await getOwnerLead(ownerLeadId);
  if (!lead) throw new Error("Owner lead not found");

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  const id = `pack_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const share = `${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
  const propertyLabel = lead.property_name
    ? lead.unit ? `${lead.property_name}, Unit ${lead.unit}` : lead.property_name
    : "Owner property";

  const { error } = await supabase.from("match_packs").insert({
    id,
    user_id: user!.id,
    owner_lead_id: ownerLeadId,
    share_token: share,
    property_label: propertyLabel,
    property_rent: lead.expected_rent ?? null,
    property_beds: lead.bedrooms ?? null,
    property_baths: lead.bathrooms ?? null,
  });
  if (error) throw error;
  const { data: fresh } = await supabase.from("match_packs").select("*").eq("id", id).single();
  return fresh as MatchPack;
}

export async function getMatchPackByToken(token: string): Promise<MatchPack | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("match_packs")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();
  return data as MatchPack | null;
}

export async function getPackTenants(packId: string): Promise<PackTenant[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("match_pack_tenants")
    .select("*, tenant_profiles!tenant_profile_id(*)")
    .eq("pack_id", packId)
    .order("position", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((r: Record<string, unknown>) => {
    const row = r;
    const tp  = row.tenant_profiles as Record<string, unknown>;
    return {
      ...(tp as unknown as TenantProfile),
      position:   row.position   as number,
      rank:       row.rank       as number | null,
      liked:      row.liked      as number,
      owner_note: row.owner_note as string | null,
    } as PackTenant;
  });
}

export async function addTenantToPack(packId: string, tenantId: string): Promise<void> {
  const supabase = await createClient();
  const { data: maxRow } = await supabase
    .from("match_pack_tenants")
    .select("position")
    .eq("pack_id", packId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = ((maxRow as Record<string, unknown> | null)?.position as number ?? -1) + 1;
  await supabase.from("match_pack_tenants").upsert(
    { pack_id: packId, tenant_profile_id: tenantId, position: nextPos },
    { onConflict: "pack_id,tenant_profile_id", ignoreDuplicates: true }
  );
}

export async function removeTenantFromPack(packId: string, tenantId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("match_pack_tenants")
    .delete()
    .eq("pack_id", packId)
    .eq("tenant_profile_id", tenantId);
}

export async function setOwnerRanking(
  packId: string,
  rankings: Array<{ tenant_id: string; rank: number; liked: number; owner_note?: string | null }>
): Promise<void> {
  // Must use service client — this is called from the public share-pack page which has no auth session.
  // The anon client is blocked by RLS on match_pack_tenants, causing silent save failures.
  const supabase = createServiceClient();
  await Promise.all([
    ...rankings.map(r =>
      supabase
        .from("match_pack_tenants")
        .update({ rank: r.rank, liked: r.liked, owner_note: r.owner_note ?? null })
        .eq("pack_id", packId)
        .eq("tenant_profile_id", r.tenant_id)
    ),
    supabase
      .from("match_packs")
      .update({ owner_ranked_at: new Date().toISOString() })
      .eq("id", packId),
  ]);
}

export async function getRankedLeadIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_pack_tenants")
    .select("match_packs!pack_id(owner_lead_id)")
    .not("rank", "is", null);
  const ids = new Set<string>();
  for (const r of data ?? []) {
    const mp = (r as Record<string, unknown>).match_packs as Record<string, unknown> | null;
    if (mp?.owner_lead_id) ids.add(mp.owner_lead_id as string);
  }
  return ids;
}

// ─── Account / Tier ───────────────────────────────────────────────────────────

export async function getAccountTier(): Promise<Tier> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return "starter";
  const { data } = await supabase
    .from("agent_profiles")
    .select("tier")
    .eq("id", user.id)
    .maybeSingle();
  return ((data as Record<string, unknown> | null)?.tier as Tier) ?? "starter";
}

export async function setAccountTier(tier: Tier): Promise<void> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;
  await supabase.from("agent_profiles").update({ tier }).eq("id", user.id);
}

export async function incrementOwnerOutreachCount(id: string): Promise<void> {
  const supabase = await createClient();
  // Supabase doesn't have increment shorthand — read then write
  const { data } = await supabase.from("owner_leads").select("outreach_count").eq("id", id).single();
  const cur = ((data as Record<string, unknown> | null)?.outreach_count as number | null) ?? 0;
  await supabase.from("owner_leads").update({ outreach_count: cur + 1 }).eq("id", id);
}

// ─── Owner intake ─────────────────────────────────────────────────────────────

export async function getOrCreateOwnerIntakeToken(ownerLeadId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("owner_leads")
    .select("intake_token")
    .eq("id", ownerLeadId)
    .maybeSingle();
  const existing = (data as Record<string, unknown> | null)?.intake_token as string | null;
  if (existing) return existing;
  const token = Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6);
  await supabase.from("owner_leads").update({ intake_token: token }).eq("id", ownerLeadId);
  return token;
}

export async function generateOwnerIntakeToken(ownerLeadId: string): Promise<string> {
  const token = Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6);
  const supabase = await createClient();
  await supabase
    .from("owner_leads")
    .update({ intake_token: token, intake_sent_at: new Date().toISOString() })
    .eq("id", ownerLeadId);
  return token;
}

export async function getOwnerLeadByIntakeToken(token: string): Promise<OwnerLead | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("owner_leads")
    .select("*")
    .eq("intake_token", token)
    .maybeSingle();
  return data ? parseOwnerLead(data as Record<string, unknown>) : null;
}

export async function completeOwnerIntake(
  token: string,
  data: {
    unit?: string;
    bedrooms?: number;
    bathrooms?: number;
    expected_rent?: number;
    available_from?: string;
    tenant_preferences?: string;
    photoUrls?: string[];
  }
): Promise<void> {
  const updates: Record<string, unknown> = {
    intake_completed_at: new Date().toISOString(),
  };
  if (data.unit !== undefined && data.unit != null)                   updates.unit = data.unit;
  if (data.bedrooms !== undefined && data.bedrooms != null)           updates.bedrooms = data.bedrooms;
  if (data.bathrooms !== undefined && data.bathrooms != null)         updates.bathrooms = data.bathrooms;
  if (data.expected_rent !== undefined && data.expected_rent != null) updates.expected_rent = data.expected_rent;
  if (data.available_from !== undefined && data.available_from != null) updates.available_from = data.available_from;
  if (data.tenant_preferences !== undefined && data.tenant_preferences != null) updates.tenant_preferences = data.tenant_preferences;
  if (data.photoUrls && data.photoUrls.length > 0) updates.photo_urls = data.photoUrls;

  const supabase = createServiceClient();
  // Get current stage to conditionally advance
  const { data: lead } = await supabase
    .from("owner_leads")
    .select("stage")
    .eq("intake_token", token)
    .maybeSingle();
  const stage = (lead as Record<string, unknown> | null)?.stage as string | undefined;
  if (stage && ["imported","replied","wants_rent"].includes(stage)) {
    updates.stage = "listed";
  }
  await supabase.from("owner_leads").update(updates).eq("intake_token", token);
}

// ─── Tenant intake sessions ───────────────────────────────────────────────────

export async function createTenantIntakeSession(
  agentId: string,
  opts?: { name?: string; phone?: string; ownerLeadId?: string }
): Promise<string> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  const token = `ti_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  await supabase.from("tenant_intake_sessions").insert({
    token,
    user_id: user!.id,
    agent_id: agentId,
    name: opts?.name ?? null,
    phone: opts?.phone ?? null,
    owner_lead_id: opts?.ownerLeadId ?? null,
  });
  return token;
}

export async function deleteTenantIntakeSession(token: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("tenant_intake_sessions").delete().eq("token", token);
}

export async function getPendingIntakesForLead(ownerLeadId: string): Promise<Array<{
  token: string; name: string | null; phone: string | null; created_at: string;
}>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenant_intake_sessions")
    .select("token, name, phone, created_at")
    .eq("owner_lead_id", ownerLeadId)
    .is("completed_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as Array<{ token: string; name: string | null; phone: string | null; created_at: string }>;
}

export async function getTenantIntakeSession(token: string): Promise<{
  token: string;
  agent_id: string;
  name: string | null;
  phone: string | null;
  owner_lead_id: string | null;
  created_at: string;
  completed_at: string | null;
  tenant_profile_id: string | null;
} | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("tenant_intake_sessions")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  return data as typeof data & {
    token: string; agent_id: string; name: string | null; phone: string | null;
    owner_lead_id: string | null; created_at: string;
    completed_at: string | null; tenant_profile_id: string | null;
  } | null;
}

export async function completeTenantIntake(
  token: string,
  data: {
    name: string;
    age?: number;
    occupation?: string;
    monthly_income?: number;
    occupants?: number;
    pets: number;
    smoking: number;
    budget_min?: number;
    budget_max?: number;
    bedrooms_pref?: number;
    preferred_move_in?: string;
    notes?: string;
  },
  agentId: string
): Promise<TenantProfile> {
  const svc = createServiceClient();

  // Get session for phone + owner_lead_id
  const { data: sess } = await svc
    .from("tenant_intake_sessions")
    .select("owner_lead_id, phone, user_id")
    .eq("token", token)
    .maybeSingle();
  const sessRow = sess as Record<string, unknown> | null;

  const id = `tp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await svc.from("tenant_profiles").insert({
    id,
    user_id: sessRow?.user_id ?? agentId,
    name: data.name,
    age: data.age ?? null,
    occupation: data.occupation ?? null,
    monthly_income: data.monthly_income ?? null,
    occupants: data.occupants ?? null,
    pets: !!data.pets,
    smoking: !!data.smoking,
    budget_min: data.budget_min ?? null,
    budget_max: data.budget_max ?? null,
    bedrooms_pref: data.bedrooms_pref ?? null,
    preferred_move_in: data.preferred_move_in ?? null,
    notes: data.notes ?? null,
    intake_token: token,
    intake_completed_at: new Date().toISOString(),
    source: "intake_form",
  });

  await svc
    .from("tenant_intake_sessions")
    .update({ completed_at: new Date().toISOString(), tenant_profile_id: id })
    .eq("token", token);

  // Carry phone forward
  if (sessRow?.phone) {
    await svc
      .from("tenant_profiles")
      .update({ phone: sessRow.phone as string })
      .eq("id", id)
      .is("phone", null);
  }

  // Auto-add to match pack if session was linked to an owner lead
  if (sessRow?.owner_lead_id) {
    const { data: pack } = await svc
      .from("match_packs")
      .select("id")
      .eq("owner_lead_id", sessRow.owner_lead_id as string)
      .maybeSingle();
    if (pack) {
      const packRow = pack as Record<string, unknown>;
      const { data: maxRow } = await svc
        .from("match_pack_tenants")
        .select("position")
        .eq("pack_id", packRow.id as string)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextPos = ((maxRow as Record<string, unknown> | null)?.position as number ?? -1) + 1;
      await svc.from("match_pack_tenants").upsert(
        { pack_id: packRow.id as string, tenant_profile_id: id, position: nextPos },
        { onConflict: "pack_id,tenant_profile_id", ignoreDuplicates: true }
      );
    }
  }

  const { data: fresh } = await svc.from("tenant_profiles").select("*").eq("id", id).single();
  return fresh as unknown as TenantProfile;
}

export async function getAllTenantProfiles(): Promise<TenantProfile[]> {
  const userId = await getCurrentUserId();
  if (!userId) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("tenant_profiles").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as TenantProfile[];
  }
  return _cachedAllTenantProfiles(userId);
}

export async function getTenantProfileByPhone(phone: string): Promise<TenantProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenant_profiles")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();
  return data as TenantProfile | null;
}

export async function getTenantProfileByPhoneAndName(phone: string, name: string): Promise<TenantProfile | null> {
  const supabase = await createClient();
  const { data: exact } = await supabase
    .from("tenant_profiles")
    .select("*")
    .eq("phone", phone)
    .eq("name", name)
    .maybeSingle();
  if (exact) return exact as TenantProfile;
  const { data: rows } = await supabase
    .from("tenant_profiles")
    .select("*")
    .eq("phone", phone);
  const arr = rows ?? [];
  return arr.length === 1 ? arr[0] as TenantProfile : null;
}

export async function updateTenantProfile(id: string, data: Partial<Omit<TenantProfile, "id" | "created_at">>): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined)               updates.name = data.name;
  if (data.phone !== undefined)              updates.phone = data.phone;
  if (data.age !== undefined)                updates.age = data.age;
  if (data.occupation !== undefined)         updates.occupation = data.occupation;
  if (data.employer !== undefined)           updates.employer = data.employer;
  if (data.nationality !== undefined)        updates.nationality = data.nationality;
  if (data.monthly_income !== undefined)     updates.monthly_income = data.monthly_income;
  if (data.budget_min !== undefined)         updates.budget_min = data.budget_min;
  if (data.budget_max !== undefined)         updates.budget_max = data.budget_max;
  if (data.bedrooms_pref !== undefined)      updates.bedrooms_pref = data.bedrooms_pref;
  if (data.bathrooms_pref !== undefined)     updates.bathrooms_pref = data.bathrooms_pref;
  if (data.occupants !== undefined)          updates.occupants = data.occupants;
  if (data.preferred_move_in !== undefined)  updates.preferred_move_in = data.preferred_move_in;
  if (data.available_from !== undefined)     updates.available_from = data.available_from;
  if (data.is_seeking !== undefined)         updates.is_seeking = data.is_seeking;
  if (data.seeking_from !== undefined)       updates.seeking_from = data.seeking_from;
  if (data.seeking_budget_max !== undefined) updates.seeking_budget_max = data.seeking_budget_max;
  if (data.pets !== undefined)               updates.pets = !!data.pets;
  if (data.smoking !== undefined)            updates.smoking = !!data.smoking;
  if (data.notes !== undefined)              updates.notes = data.notes;
  if (Object.keys(updates).length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("tenant_profiles").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteTenantProfile(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("tenant_profiles").delete().eq("id", id);
  if (error) throw error;
}

export interface ManagedProperty {
  id: string;
  name: string;
  unit: string | null;
  owner_name: string;
  owner_phone: string | null;
  amount: number | null;
  lifecycle_stage: string | null;
  tenant_name: string | null;
  tenant_phone: string | null;
  tenancy_id: string | null;
}

export async function getManagedProperties(): Promise<ManagedProperty[]> {
  const supabase = await createClient();
  const { data: leads, error } = await supabase
    .from("owner_leads")
    .select("id, property_name, unit, owner_name, owner_phone")
    .eq("is_managed", true)
    .order("owner_name", { ascending: true });
  if (error) throw error;

  const { data: tens } = await supabase
    .from("tenancies")
    .select("id, owner_lead_id, amount, lifecycle_stage, tenant_name, tenant_phone")
    .neq("lifecycle_stage", "closed");

  const tenByLead = new Map<string, Record<string, unknown>>();
  for (const t of tens ?? []) {
    const row = t as Record<string, unknown>;
    const key = row.owner_lead_id as string;
    if (key && !tenByLead.has(key)) tenByLead.set(key, row);
  }

  return (leads ?? []).map(l => {
    const lead = l as Record<string, unknown>;
    const t = tenByLead.get(lead.id as string);
    return {
      id: lead.id as string,
      name: lead.property_name as string,
      unit: lead.unit as string | null,
      owner_name: lead.owner_name as string,
      owner_phone: lead.owner_phone as string | null,
      amount: t ? t.amount as number : null,
      lifecycle_stage: t ? t.lifecycle_stage as string | null : null,
      tenant_name: t ? t.tenant_name as string : null,
      tenant_phone: t ? t.tenant_phone as string | null : null,
      tenancy_id: t ? t.id as string : null,
    };
  });
}

export async function getAllActiveTenants(): Promise<Array<{
  tenancy_id: string;
  tenant_name: string;
  tenant_phone: string | null;
  property_name: string | null;
  unit: string | null;
  amount: number | null;
  lifecycle_stage: string | null;
}>> {
  const userId = await getCurrentUserId();
  if (userId) return _cachedAllActiveTenants(userId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenancies")
    .select("id, tenant_name, tenant_phone, amount, lifecycle_stage, property_id, owner_lead_id")
    .not("lifecycle_stage", "eq", "closed")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as Record<string, unknown>[];
  const olIds = [...new Set(rows.map(r => r.owner_lead_id as string).filter(Boolean))];

  const olsRes = olIds.length > 0
    ? await supabase.from("owner_leads").select("id, property_name, unit").in("id", olIds)
    : { data: [] as {id:string;property_name:string|null;unit:string|null}[] };

  const olMap = Object.fromEntries((olsRes.data ?? []).map((ol: {id:string;property_name:string|null;unit:string|null}) => [ol.id, ol]));

  return rows.map(row => {
    const ol = row.owner_lead_id ? olMap[row.owner_lead_id as string] : null;
    return {
      tenancy_id:     row.id as string,
      tenant_name:    row.tenant_name as string,
      tenant_phone:   row.tenant_phone as string | null,
      property_name:  (ol?.property_name ?? null) as string | null,
      unit:           (ol?.unit ?? null) as string | null,
      amount:         row.amount as number | null,
      lifecycle_stage: row.lifecycle_stage as string | null,
    };
  });
}

export async function getTenantForOwnerLead(ownerLeadId: string): Promise<{ tenant_name: string; tenant_phone: string; tenancy_id: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenancies")
    .select("id, tenant_name, tenant_phone")
    .eq("owner_lead_id", ownerLeadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const r = data as Record<string, unknown>;
  return { tenancy_id: r.id as string, tenant_name: r.tenant_name as string, tenant_phone: r.tenant_phone as string };
}

export async function getTenantsForOwnerLeads(ownerLeadIds: string[]): Promise<Record<string, { tenant_name: string; tenant_phone: string; tenancy_id: string; lifecycle_stage: string | null }>> {
  if (ownerLeadIds.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenancies")
    .select("id, tenant_name, tenant_phone, owner_lead_id, lifecycle_stage")
    .in("owner_lead_id", ownerLeadIds)
    .order("created_at", { ascending: false });

  const out: Record<string, { tenant_name: string; tenant_phone: string; tenancy_id: string; lifecycle_stage: string | null }> = {};
  for (const r of data ?? []) {
    const row = r as Record<string, unknown>;
    const olId = row.owner_lead_id as string;
    if (!out[olId]) {
      out[olId] = {
        tenancy_id: row.id as string,
        tenant_name: row.tenant_name as string,
        tenant_phone: row.tenant_phone as string,
        lifecycle_stage: row.lifecycle_stage as string | null,
      };
    }
  }
  return out;
}

// ─── Property Supports ────────────────────────────────────────────────────────

export async function getPropertySupports(): Promise<PropertySupport[]> {
  const userId = await getCurrentUserId();
  if (!userId) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("property_supports").select("id, name, phone, type, area, notes, starred, source, created_at").order("starred", { ascending: false }).order("type", { ascending: true }).order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as PropertySupport[];
  }
  return _cachedPropertySupports(userId);
}

export async function createPropertySupport(data: {
  name: string; phone: string; type: SupportType;
  area?: string | null; notes?: string | null; starred?: number;
}): Promise<PropertySupport> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  const id = `sup_${Date.now()}`;
  const { error } = await supabase.from("property_supports").insert({
    id,
    user_id: user!.id,
    name: data.name,
    phone: data.phone,
    type: data.type,
    area: data.area ?? null,
    notes: data.notes ?? null,
    starred: data.starred ?? 0,
    source: "custom",
  });
  if (error) throw error;
  const { data: fresh } = await supabase
    .from("property_supports")
    .select("id, name, phone, type, area, notes, starred, source, created_at")
    .eq("id", id)
    .single();
  return fresh as PropertySupport;
}

export async function updatePropertySupport(id: string, data: Partial<{
  name: string; phone: string; type: SupportType;
  area: string | null; notes: string | null; starred: number;
}>): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (data.name    !== undefined) updates.name    = data.name;
  if (data.phone   !== undefined) updates.phone   = data.phone;
  if (data.type    !== undefined) updates.type    = data.type;
  if (data.area    !== undefined) updates.area    = data.area;
  if (data.notes   !== undefined) updates.notes   = data.notes;
  if (data.starred !== undefined) updates.starred = data.starred;
  if (Object.keys(updates).length === 0) return;
  const supabase = await createClient();
  await supabase.from("property_supports").update(updates).eq("id", id);
}

export async function deletePropertySupport(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("property_supports").delete().eq("id", id);
}

// ─── Home dashboard ───────────────────────────────────────────────────────────

export async function getHomeDashboard(): Promise<{
  totalTenancies: number;
  paidThisMonth: number;
  collectionPct: number;
  overdueCount: number;
  pendingVerifyCount: number;
  expiringCount: number;
  renewalsThisYear: number;
  newSigningsThisYear: number;
  leadsNeedingAttention: number;
}> {
  const thisYear = new Date().getFullYear().toString();
  const today = new Date();
  const todayDay = today.getDate();
  const todayStr = today.toISOString().slice(0, 10);
  const in30Str = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30)
    .toISOString().slice(0, 10);

  const tenancies = await getTenancies();
  const active = tenancies.filter((t) => t.lifecycle_stage !== "closed");

  const totalTenancies = active.length;
  const paidThisMonth = active.filter((t) => t.current_month_paid).length;
  const totalRent = active.reduce((s, t) => s + t.amount, 0);
  const collectedRent = active.filter((t) => t.current_month_paid).reduce((s, t) => s + t.amount, 0);
  const collectionPct = totalRent > 0 ? Math.round((collectedRent / totalRent) * 100) : 0;
  const overdueCount = active.filter((t) => !t.current_month_paid && t.due_day <= todayDay).length;
  const pendingVerifyCount = active.filter((t) => t.status === "Paid - Pending Verification").length;
  const expiringCount = active.filter(
    (t) => t.contract_end && t.contract_end >= todayStr && t.contract_end <= in30Str
  ).length;

  const supabase = await createClient();
  const { data: commRows } = await supabase
    .from("commission_events")
    .select("type")
    .gte("earned_on", `${thisYear}-01-01`)
    .lte("earned_on", `${thisYear}-12-31`);

  let renewalsThisYear = 0, newSigningsThisYear = 0;
  for (const r of commRows ?? []) {
    if ((r as Record<string, unknown>).type === "renewal") renewalsThisYear++;
    else newSigningsThisYear++;
  }

  const { count: leadsNeedingAttention } = await supabase
    .from("owner_leads")
    .select("*", { count: "exact", head: true })
    .in("stage", ["imported", "replied"]);

  return {
    totalTenancies,
    paidThisMonth,
    collectionPct,
    overdueCount,
    pendingVerifyCount,
    expiringCount,
    renewalsThisYear,
    newSigningsThisYear,
    leadsNeedingAttention: leadsNeedingAttention ?? 0,
  };
}

// ─── Renewal intake tokens ────────────────────────────────────────────────────

export async function clearRenewalData(tenancyId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("tenancies").update({
    tenant_renewal_completed_at: null,
    owner_renewal_completed_at: null,
    renewal_proposed_start: null,
    renewal_proposed_months: null,
    renewal_proposed_rent: null,
    owner_noted_tenant_intent: null,
  }).eq("id", tenancyId);
}

export async function generateTenantRenewalToken(tenancyId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenancies")
    .select("tenant_renewal_token")
    .eq("id", tenancyId)
    .maybeSingle();
  const existing = (data as Record<string, unknown> | null)?.tenant_renewal_token as string | null;
  if (existing) return existing;
  const token = `rt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  await supabase.from("tenancies").update({ tenant_renewal_token: token }).eq("id", tenancyId);
  return token;
}

export async function generateOwnerRenewalToken(tenancyId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenancies")
    .select("owner_renewal_token")
    .eq("id", tenancyId)
    .maybeSingle();
  const existing = (data as Record<string, unknown> | null)?.owner_renewal_token as string | null;
  if (existing) return existing;
  const token = `ro_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  await supabase.from("tenancies").update({ owner_renewal_token: token }).eq("id", tenancyId);
  return token;
}

export async function getTenancyByTenantRenewalToken(token: string): Promise<Tenancy | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("tenancies")
    .select("*, properties!property_id(*)")
    .eq("tenant_renewal_token", token)
    .maybeSingle();
  return data ? toTenancy(data as Record<string, unknown>) : null;
}

export async function getTenancyByOwnerRenewalToken(token: string): Promise<Tenancy | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("tenancies")
    .select("*, properties!property_id(*)")
    .eq("owner_renewal_token", token)
    .maybeSingle();
  return data ? toTenancy(data as Record<string, unknown>) : null;
}

export async function completeTenantRenewalIntake(
  token: string,
  staying: boolean,
  newEndDate?: string
): Promise<void> {
  const svc = createServiceClient();
  const updates: Record<string, unknown> = {
    replied_tenant: staying ? "yes" : "no",
    tenant_renewal_completed_at: new Date().toISOString(),
  };
  if (staying && newEndDate) updates.contract_end = newEndDate;
  await svc.from("tenancies").update(updates).eq("tenant_renewal_token", token);
}

export async function completeOwnerRenewalIntake(
  token: string,
  continuing: boolean,
  newRent?: number,
  tenantIntent?: "yes" | "no" | "unsure",
  newContractStart?: string,
  durationYears?: number
): Promise<void> {
  const svc = createServiceClient();
  const updates: Record<string, unknown> = {
    replied_owner: continuing ? "yes" : "no",
    owner_renewal_completed_at: new Date().toISOString(),
  };
  if (newRent && newRent > 0)             { updates.renewal_proposed_rent = newRent; updates.amount = newRent; }
  if (newContractStart)                   updates.renewal_proposed_start = newContractStart;
  if (durationYears && durationYears > 0) updates.renewal_proposed_months = durationYears * 12;
  if (tenantIntent)                       updates.owner_noted_tenant_intent = tenantIntent;
  await svc.from("tenancies").update(updates).eq("owner_renewal_token", token);
}
