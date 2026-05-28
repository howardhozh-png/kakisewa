import db from "./db-client";
import { Property, Tenancy, TenancyStatus, LhdnStatus, Tier, MonthlyCollection, PropertySupport, SupportType } from "./types";
import { format } from "date-fns";

// ─── Row types ────────────────────────────────────────────────────────────────

type PropRow = {
  id: string; name: string; address: string; unit: string | null;
  owner_name: string; owner_phone: string; photo_urls: string; created_at: string;
};
type TenRow = {
  id: string; property_id: string; tenant_name: string; tenant_phone: string;
  due_day: number; amount: number; current_month_paid: number;
  current_month_receipt_url: string | null; last_paid_month: string | null;
  last_receipt_url: string | null; lhdn_status: LhdnStatus; status: TenancyStatus;
  forwarded_at: string | null;
  contract_start: string | null;
  contract_end: string | null;
  contract_duration_months: number | null;
  lifecycle_stage: string | null;
  replied_tenant: import("./types").ReplyState;
  replied_owner:  import("./types").ReplyState;
  tenant_renewal_completed_at: string | null;
  owner_renewal_completed_at: string | null;
  owner_noted_tenant_intent: string | null;
  renewal_proposed_start: string | null;
  renewal_proposed_months: number | null;
  renewal_proposed_rent: number | null;
  closed_reason: string | null;
  agreement_url: string | null;
  created_at: string;
  property_name?: string; property_address?: string; property_unit?: string;
  owner_name?: string; owner_phone?: string; photo_urls?: string;
  owner_lead_id?: string | null;
};

function toProp(r: PropRow): Property {
  return {
    ...r,
    unit: r.unit ?? undefined,
    photo_urls: (() => { try { return JSON.parse(r.photo_urls) as string[]; } catch { return []; } })(),
  };
}

// Drop any legacy 'unresponsive' values from older DB rows
function normaliseReply(r: string | null | undefined): import("./types").ReplyState {
  if (r === "yes" || r === "no") return r;
  return "pending";
}

function toTenancy(r: TenRow): Tenancy {
  const property: Property | undefined = r.property_name
    ? {
        id: r.property_id, name: r.property_name, address: r.property_address ?? "",
        unit: r.property_unit ?? undefined,
        owner_name: r.owner_name ?? "", owner_phone: r.owner_phone ?? "",
        photo_urls: (() => { try { return JSON.parse(r.photo_urls ?? "[]") as string[]; } catch { return []; } })(),
        created_at: "",
      }
    : undefined;
  return {
    id: r.id, property_id: r.property_id, tenant_name: r.tenant_name,
    tenant_phone: r.tenant_phone, due_day: r.due_day, amount: r.amount,
    current_month_paid: r.current_month_paid === 1,
    current_month_receipt_url: r.current_month_receipt_url,
    last_paid_month: r.last_paid_month,
    last_receipt_url: r.last_receipt_url,
    lhdn_status: r.lhdn_status ?? "none",
    status: r.status,
    forwarded_at: r.forwarded_at,
    contract_start: r.contract_start,
    contract_end: r.contract_end,
    contract_duration_months: r.contract_duration_months,
    lifecycle_stage: (r.lifecycle_stage as import("./types").LifecycleStage | null) ?? null,
    replied_tenant: normaliseReply(r.replied_tenant),
    replied_owner:  normaliseReply(r.replied_owner),
    tenant_renewal_completed_at: r.tenant_renewal_completed_at ?? null,
    owner_renewal_completed_at:  r.owner_renewal_completed_at ?? null,
    owner_noted_tenant_intent:   (r.owner_noted_tenant_intent as "yes" | "no" | "unsure" | null) ?? null,
    renewal_proposed_start:  r.renewal_proposed_start ?? null,
    renewal_proposed_months: r.renewal_proposed_months ?? null,
    renewal_proposed_rent:   r.renewal_proposed_rent ?? null,
    closed_reason: r.closed_reason ?? null,
    agreement_url: r.agreement_url ?? null,
    created_at: r.created_at,
    property_name: r.property_name, property,
    owner_lead_id: r.owner_lead_id ?? null,
  };
}

// ─── Properties ───────────────────────────────────────────────────────────────

export async function getProperties(): Promise<Property[]> {
  return (db.prepare(`SELECT * FROM properties ORDER BY created_at DESC`).all() as PropRow[]).map(toProp);
}

export async function getProperty(id: string): Promise<Property | null> {
  const r = db.prepare(`SELECT * FROM properties WHERE id=?`).get(id) as PropRow | undefined;
  return r ? toProp(r) : null;
}

export async function createProperty(data: Omit<Property, "id"|"created_at">): Promise<Property> {
  const id = `prop_${Date.now()}`;
  db.prepare(
    `INSERT INTO properties (id,name,address,unit,owner_name,owner_phone,photo_urls) VALUES (?,?,?,?,?,?,?)`
  ).run(id, data.name, data.address, data.unit ?? null, data.owner_name, data.owner_phone,
    JSON.stringify(data.photo_urls ?? []));
  return (await getProperty(id))!;
}

export async function updatePropertyPhotos(id: string, urls: string[]): Promise<void> {
  db.prepare(`UPDATE properties SET photo_urls=? WHERE id=?`).run(JSON.stringify(urls.slice(0, 4)), id);
}

export async function deleteProperty(id: string): Promise<void> {
  db.prepare(`DELETE FROM properties WHERE id=?`).run(id);
}

// ─── Tenancies ────────────────────────────────────────────────────────────────

const JOIN = `
  SELECT t.*, p.name AS property_name, p.address AS property_address, p.unit AS property_unit,
         p.owner_name, p.owner_phone, p.photo_urls,
         t.tenant_renewal_completed_at, t.owner_renewal_completed_at,
         t.owner_noted_tenant_intent
  FROM   tenancies t JOIN properties p ON p.id=t.property_id
`;

export async function getTenancies(): Promise<Tenancy[]> {
  return (db.prepare(`${JOIN} ORDER BY t.due_day ASC, t.created_at DESC`).all() as TenRow[]).map(toTenancy);
}

export async function getTenancy(id: string): Promise<Tenancy | null> {
  const r = db.prepare(`${JOIN} WHERE t.id=?`).get(id) as TenRow | undefined;
  return r ? toTenancy(r) : null;
}

export async function createTenancy(
  data: Omit<Tenancy, "id"|"created_at"|"property"|"property_name">
): Promise<Tenancy> {
  const id = `ten_${Date.now()}`;
  db.prepare(
    `INSERT INTO tenancies
       (id,property_id,tenant_name,tenant_phone,due_day,amount,
        current_month_paid,current_month_receipt_url,last_paid_month,
        last_receipt_url,lhdn_status,status,
        contract_start,contract_end,contract_duration_months,owner_lead_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id, data.property_id, data.tenant_name, data.tenant_phone,
    data.due_day, data.amount, data.current_month_paid ? 1 : 0,
    data.current_month_receipt_url ?? null, data.last_paid_month ?? null,
    data.last_receipt_url ?? null, data.lhdn_status ?? "none", data.status,
    data.contract_start ?? null, data.contract_end ?? null,
    data.contract_duration_months ?? null, data.owner_lead_id ?? null
  );
  return (await getTenancy(id))!;
}

export async function upsertTenancyByPhone(
  phone: string,
  data: Partial<Omit<Tenancy, "id"|"created_at"|"property"|"property_name">>
): Promise<Tenancy> {
  const existing = db.prepare(`SELECT id FROM tenancies WHERE tenant_phone=?`).get(phone) as { id: string } | undefined;
  if (existing) {
    await updateTenancy(existing.id, data);
    return (await getTenancy(existing.id))!;
  }
  return createTenancy({
    property_id: data.property_id ?? "",
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
  const fields: string[] = [];
  const vals: unknown[] = [];
  const set = (col: string, val: unknown) => { fields.push(`${col}=?`); vals.push(val); };

  if (data.status !== undefined)                    set("status", data.status);
  if (data.current_month_paid !== undefined)        set("current_month_paid", data.current_month_paid ? 1 : 0);
  if (data.current_month_receipt_url !== undefined) set("current_month_receipt_url", data.current_month_receipt_url);
  if (data.last_paid_month !== undefined)           set("last_paid_month", data.last_paid_month);
  if (data.last_receipt_url !== undefined)          set("last_receipt_url", data.last_receipt_url);
  if (data.lhdn_status !== undefined)               set("lhdn_status", data.lhdn_status);
  if (data.due_day !== undefined)                   set("due_day", data.due_day);
  if (data.amount !== undefined)                    set("amount", data.amount);
  if (data.tenant_name !== undefined)               set("tenant_name", data.tenant_name);
  if (data.tenant_phone !== undefined)              set("tenant_phone", data.tenant_phone);
  if (data.forwarded_at !== undefined)               set("forwarded_at", data.forwarded_at);
  if (data.contract_start !== undefined)             set("contract_start", data.contract_start);
  if (data.contract_end !== undefined)               set("contract_end", data.contract_end);
  if (data.contract_duration_months !== undefined)   set("contract_duration_months", data.contract_duration_months);
  if (data.lifecycle_stage !== undefined)            set("lifecycle_stage", data.lifecycle_stage);
  if (data.replied_tenant !== undefined)             set("replied_tenant", data.replied_tenant);
  if (data.replied_owner !== undefined)              set("replied_owner", data.replied_owner);
  if (data.owner_lead_id !== undefined)              set("owner_lead_id", data.owner_lead_id);
  if (data.closed_reason !== undefined)              set("closed_reason", data.closed_reason);
  if (data.agreement_url !== undefined)              set("agreement_url", data.agreement_url);

  if (fields.length === 0) return getTenancy(id);
  vals.push(id);
  db.prepare(`UPDATE tenancies SET ${fields.join(",")} WHERE id=?`).run(...vals);
  return getTenancy(id);
}

export async function deleteTenancy(id: string): Promise<void> {
  db.prepare(`DELETE FROM tenancies WHERE id=?`).run(id);
}

// ─── Algorithm of Trust ───────────────────────────────────────────────────────

export async function getCriticalTenancies(): Promise<Tenancy[]> {
  const day = new Date().getDate();
  return (db.prepare(`${JOIN} WHERE t.current_month_paid=0 AND t.due_day<=? ORDER BY t.due_day ASC`).all(day) as TenRow[]).map(toTenancy);
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

// ─── Rent payment history ─────────────────────────────────────────────────────

type PayRow = { month: string; total: number; collected: number; payment_count: number; paid_count: number };

const MONTH_LABEL = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export async function getRecentMonthlyCollections(monthsBack = 3): Promise<MonthlyCollection[]> {
  const now = new Date();
  const months: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const rows = db.prepare(`
    SELECT month,
           SUM(amount) as total,
           SUM(CASE WHEN status='verified' THEN amount ELSE 0 END) as collected,
           COUNT(*) as payment_count,
           SUM(CASE WHEN status='verified' THEN 1 ELSE 0 END) as paid_count
    FROM rent_payments
    WHERE month IN (${months.map(() => "?").join(",")})
    GROUP BY month
  `).all(...months) as PayRow[];

  const byMonth = new Map(rows.map((r) => [r.month, r]));
  return months.map((m) => {
    const r = byMonth.get(m);
    const total = r?.total ?? 0;
    const collected = r?.collected ?? 0;
    const [, mm] = m.split("-");
    return {
      month: m,
      label: MONTH_LABEL[parseInt(mm, 10) - 1] ?? m,
      total,
      collected,
      outstanding: Math.max(0, total - collected),
      pct: total > 0 ? Math.round((collected / total) * 100) : 0,
      paymentCount: r?.payment_count ?? 0,
      paidCount: r?.paid_count ?? 0,
    };
  });
}

export async function getPaymentsByTenancy(monthsBack = 3): Promise<Record<string, import("./types").RentPayment[]>> {
  const now = new Date();
  const months: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const rows = db.prepare(`
    SELECT id, tenancy_id, month, amount, paid_at, receipt_url, status
    FROM rent_payments
    WHERE month IN (${months.map(() => "?").join(",")})
    ORDER BY month DESC
  `).all(...months) as Array<{
    id: string; tenancy_id: string; month: string; amount: number;
    paid_at: string | null; receipt_url: string | null; status: import("./types").PaymentStatus;
  }>;

  const out: Record<string, import("./types").RentPayment[]> = {};
  for (const r of rows) {
    (out[r.tenancy_id] ??= []).push(r);
  }
  return out;
}

// ─── WhatsApp message log ────────────────────────────────────────────────────

import type { WhatsAppLogEntry, WhatsAppTemplate } from "./types";

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
  const id = `wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(
    `INSERT INTO whatsapp_log
       (id, related_id, related_type, template, recipient_phone, recipient_name, body, channel)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(
    id,
    p.related_id ?? null,
    p.related_type ?? null,
    p.template,
    p.recipient_phone,
    p.recipient_name ?? null,
    p.body ?? null,
    p.channel ?? "wa_me"
  );
}

export async function getExpiringTenancies(maxDays = 60): Promise<Tenancy[]> {
  // Returns tenancies whose contract_end is between yesterday and (today + maxDays).
  // Sorted by expiry date ascending — soonest first.
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const future = new Date(today.getTime() + maxDays * 86400000).toISOString().slice(0, 10);
  const past   = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10); // include 30d expired
  const rows = db.prepare(`
    ${JOIN}
    WHERE t.contract_end IS NOT NULL
      AND t.contract_end >= ?
      AND t.contract_end <= ?
      AND (t.lifecycle_stage IS NULL OR t.lifecycle_stage != 'closed')
    ORDER BY t.contract_end ASC
  `).all(past, future) as TenRow[];
  return rows.map(toTenancy);
}

export async function getRecentWhatsAppForRelated(
  related_type: string,
  related_id: string,
  limit = 10
): Promise<WhatsAppLogEntry[]> {
  return db.prepare(
    `SELECT * FROM whatsapp_log
     WHERE related_type=? AND related_id=?
     ORDER BY sent_at DESC LIMIT ?`
  ).all(related_type, related_id, limit) as WhatsAppLogEntry[];
}

// ─── Lifecycle board ─────────────────────────────────────────────────────────

import type { OwnerLead, AgentProfile } from "./types";

export async function getLifecycleTenancies(): Promise<Tenancy[]> {
  // All tenancies with a contract — the kanban derives the stage per card.
  // Old expired-by-90-days are still excluded (they fall off the board).
  const today = new Date();
  const earliest = new Date(today.getTime() - 90 * 86400000).toISOString().slice(0, 10);
  const rows = db.prepare(`
    ${JOIN}
    WHERE t.contract_end IS NOT NULL
      AND t.contract_end >= ?
    ORDER BY t.contract_end ASC
  `).all(earliest) as TenRow[];
  return rows.map(toTenancy);
}

export async function countOwnerLeads(): Promise<number> {
  return (db.prepare("SELECT COUNT(*) as cnt FROM owner_leads").get() as { cnt: number }).cnt;
}

export async function countLifecycleTenancies(): Promise<number> {
  const earliest = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  return (db.prepare("SELECT COUNT(*) as cnt FROM tenancies WHERE contract_end IS NOT NULL AND contract_end >= ?").get(earliest) as { cnt: number }).cnt;
}

export async function getHomeDashboardStats(): Promise<{
  totalOwners: number;
  uncontacted: number;
  pipeline: number;
  listedWithoutTenant: number;
  activeContracts: number;
  expiringIn60: number;
}> {
  const today = new Date().toISOString().slice(0, 10);
  const in60 = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  const earliest = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const r = (q: string, ...p: unknown[]) => (db.prepare(q).get(...p) as { cnt: number }).cnt;
  return {
    totalOwners:         r("SELECT COUNT(*) as cnt FROM owner_leads"),
    uncontacted:         r("SELECT COUNT(*) as cnt FROM owner_leads WHERE (outreach_count IS NULL OR outreach_count = 0)"),
    pipeline:            r("SELECT COUNT(*) as cnt FROM owner_leads WHERE stage IN ('replied','wants_rent','listed','matched')"),
    listedWithoutTenant: r("SELECT COUNT(*) as cnt FROM owner_leads WHERE stage = 'listed'"),
    activeContracts:     r("SELECT COUNT(*) as cnt FROM tenancies WHERE contract_end IS NOT NULL AND contract_end >= ?", earliest),
    expiringIn60:        r("SELECT COUNT(*) as cnt FROM tenancies WHERE contract_end IS NOT NULL AND contract_end >= ? AND contract_end <= ?", today, in60),
  };
}

export async function getExpiringContractsPreview(days = 60): Promise<Array<{
  id: string; tenant_name: string; property_name: string | null; unit: string | null; contract_end: string; daysLeft: number;
}>> {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const cutoff = new Date(today.getTime() + days * 86400000).toISOString().slice(0, 10);
  const rows = db.prepare(`
    SELECT t.id, t.tenant_name, t.contract_end,
           p.name AS property_name, p.unit AS property_unit,
           ol.property_name AS ol_property_name, ol.unit AS ol_unit
    FROM tenancies t
    LEFT JOIN properties p ON t.property_id = p.id
    LEFT JOIN owner_leads ol ON t.owner_lead_id = ol.id
    WHERE t.contract_end IS NOT NULL AND t.contract_end >= ? AND t.contract_end <= ?
    ORDER BY t.contract_end ASC
    LIMIT 8
  `).all(todayStr, cutoff) as Array<{
    id: string; tenant_name: string; contract_end: string;
    property_name: string | null; property_unit: string | null;
    ol_property_name: string | null; ol_unit: string | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    tenant_name: r.tenant_name,
    property_name: r.property_name ?? r.ol_property_name,
    unit: r.property_unit ?? r.ol_unit,
    contract_end: r.contract_end,
    daysLeft: Math.ceil((new Date(r.contract_end).getTime() - today.getTime()) / 86400000),
  }));
}

// ─── Agent profile ───────────────────────────────────────────────────────────

export function recordCommissionEvent(data: {
  id?: string;
  tenancy_id?: string | null;
  owner_lead_id?: string | null;
  type: "new_signing" | "renewal";
  amount: number;
  earned_on: string;
  notes?: string | null;
}): void {
  const id = data.id ?? `ce_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  db.prepare(
    `INSERT OR IGNORE INTO commission_events (id, tenancy_id, owner_lead_id, type, amount, earned_on, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, data.tenancy_id ?? null, data.owner_lead_id ?? null, data.type, data.amount, data.earned_on, data.notes ?? null);
}

function gmt8Today(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function recordLoginStreak(): number {
  const today = gmt8Today();
  const row = db.prepare(
    "SELECT login_streak, longest_streak, last_login_date FROM agent_profile WHERE id = 1"
  ).get() as { login_streak: number | null; longest_streak: number | null; last_login_date: string | null } | undefined;
  if (!row) return 0;
  const cur = row.login_streak ?? 0;
  if (row.last_login_date === today) return cur;
  const yesterday = new Date(Date.now() - 86400000 + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const next = row.last_login_date === yesterday ? cur + 1 : 1;
  const longest = Math.max(row.longest_streak ?? 0, next);
  db.prepare(
    "UPDATE agent_profile SET login_streak = ?, longest_streak = ?, last_login_date = ? WHERE id = 1"
  ).run(next, longest, today);
  return next;
}

export function bumpLoginStreak(): number {
  const today = gmt8Today();
  const row = db.prepare(
    "SELECT login_streak, longest_streak, last_login_date FROM agent_profile WHERE id = 1"
  ).get() as { login_streak: number | null; longest_streak: number | null; last_login_date: string | null } | undefined;
  if (!row) return 0;
  if (row.last_login_date === today) return row.login_streak ?? 0;
  const next = (row.login_streak ?? 0) + 1;
  const longest = Math.max(row.longest_streak ?? 0, next);
  db.prepare("UPDATE agent_profile SET login_streak = ?, longest_streak = ?, last_login_date = ? WHERE id = 1").run(next, longest, today);
  return next;
}

export async function getAgentProfile(): Promise<AgentProfile> {
  const r = db.prepare("SELECT * FROM agent_profile WHERE id = 1").get() as AgentProfile | undefined;
  return r ?? { id: 1 };
}

export async function saveWhatsAppTemplates(overrides: import("./whatsapp-templates").TemplateOverrides): Promise<void> {
  db.prepare("UPDATE agent_profile SET whatsapp_templates = ? WHERE id = 1").run(JSON.stringify(overrides));
}

export async function updateAgentProfile(p: Partial<AgentProfile>): Promise<void> {
  const fields: string[] = []; const vals: unknown[] = [];
  const set = (col: string, val: unknown) => { fields.push(`${col} = ?`); vals.push(val); };
  if (p.name !== undefined)              set("name", p.name);
  if (p.phone !== undefined)             set("phone", p.phone);
  if (p.agency !== undefined)            set("agency", p.agency);
  if (p.photo_url !== undefined)         set("photo_url", p.photo_url);
  if (p.accent_color !== undefined)      set("accent_color", p.accent_color);
  if (p.commission_pct !== undefined)    set("commission_pct", p.commission_pct);
  if (p.monthly_goal_rm !== undefined)         set("monthly_goal_rm", p.monthly_goal_rm);
  if (p.quarterly_goal_rm !== undefined)       set("quarterly_goal_rm", p.quarterly_goal_rm);
  if (p.today_focus !== undefined)             set("today_focus", p.today_focus);
  if (p.today_focus_updated_at !== undefined)  set("today_focus_updated_at", p.today_focus_updated_at);
  if (p.today_checklist !== undefined)         set("today_checklist", p.today_checklist);
  if (p.motivation_photo_url !== undefined)    set("motivation_photo_url", p.motivation_photo_url);
  if (fields.length === 0) return;
  db.prepare(`UPDATE agent_profile SET ${fields.join(",")} WHERE id = 1`).run(...vals);
}

// Monthly commissions for the last N months + projected forecast for the
// remaining months of the calendar year, given the agent's monthly goal.
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
  const pct   = agent.commission_pct ?? 100;
  const monthlyGoal = agent.monthly_goal_rm ?? 0;
  const annualGoal  = monthlyGoal * 12;
  const MONTH_LABEL_LONG = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Always show Jan–Dec of the requested calendar year
  const monthsRaw = Array.from({ length: 12 }, (_, i) => ({
    key: `${year}-${String(i + 1).padStart(2, "0")}`,
    label: MONTH_LABEL_LONG[i],
    year,
    monthIdx: i,
  }));

  const placeholders = monthsRaw.map(() => "?").join(",");
  const rows = db.prepare(
    `SELECT SUBSTR(earned_on, 1, 7) AS m, COALESCE(SUM(amount), 0) AS s
     FROM commission_events
     WHERE agent_id = 'dev_agent_howard'
       AND SUBSTR(earned_on, 1, 7) IN (${placeholders})
     GROUP BY m`
  ).all(...monthsRaw.map((m) => m.key)) as Array<{ m: string; s: number }>;
  const byMonth = new Map(rows.map((r) => [r.m, r.s]));

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
  // What does each remaining month need to average to hit annual goal?
  const monthlyForecastNeeded = annualGoal > 0 && remainingMonths > 0
    ? Math.max(0, (annualGoal - ytd) / remainingMonths)
    : 0;
  const annualPct = annualGoal > 0 ? Math.round((ytd / annualGoal) * 100) : 0;

  return {
    months,
    ytd,
    monthlyGoal,
    annualGoal,
    remainingMonths,
    monthlyForecastNeeded,
    pct: annualPct,
  };
}

export async function getPerformanceSummary(): Promise<import("./types").PerformanceSummary> {
  const today = new Date();
  const agent = await getAgentProfile();
  const pct = agent.commission_pct ?? 100;

  const monthIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const monthIsoOf = monthIso(today);
  const quarterMonths = (() => {
    const out: string[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      out.push(monthIso(d));
    }
    return out;
  })();
  const yearMonths = (() => {
    const out: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      out.push(monthIso(d));
    }
    return out;
  })();

  const sumIn = (months: string[]) => {
    if (months.length === 0) return { sum: 0, count: 0 };
    const placeholders = months.map(() => "?").join(",");
    const r = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS s, COUNT(*) AS c
       FROM commission_events
       WHERE agent_id = 'dev_agent_howard'
         AND SUBSTR(earned_on, 1, 7) IN (${placeholders})`
    ).get(...months) as { s: number; c: number };
    return { sum: r.s, count: r.c };
  };

  const month   = sumIn([monthIsoOf]);
  const quarter = sumIn(quarterMonths);
  const year    = sumIn(yearMonths);

  const monthlyGoal   = agent.monthly_goal_rm   ?? 0;
  const quarterlyGoal = agent.quarterly_goal_rm ?? 0;

  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const q = Math.floor(today.getMonth() / 3) + 1;

  return {
    monthLabel:   `${months[today.getMonth()]} ${today.getFullYear()}`,
    quarterLabel: `Q${q} ${today.getFullYear()}`,
    mtdCommission:    month.sum,
    qtdCommission:    quarter.sum,
    ytdCommission:    year.sum,
    signedThisMonth:   month.count,
    signedThisQuarter: quarter.count,
    monthlyGoal,
    quarterlyGoal,
    monthlyPct:   monthlyGoal   > 0 ? Math.round(((month.sum   * pct / 100) / monthlyGoal)   * 100) : 0,
    quarterlyPct: quarterlyGoal > 0 ? Math.round(((quarter.sum * pct / 100) / quarterlyGoal) * 100) : 0,
  };
}

// ─── Owner leads ─────────────────────────────────────────────────────────────

type OwnerLeadRow = Omit<OwnerLead, "photo_urls"> & { photo_urls?: string | null };
function parseOwnerLead(r: OwnerLeadRow): OwnerLead {
  return {
    ...r,
    photo_urls: (() => { try { return JSON.parse(r.photo_urls ?? "[]") as string[]; } catch { return []; } })(),
  };
}

export async function getOwnerLeads(): Promise<OwnerLead[]> {
  return (db.prepare(`SELECT * FROM owner_leads ORDER BY created_at DESC`).all() as OwnerLeadRow[]).map(parseOwnerLead);
}

export async function createOwnerLead(data: Omit<OwnerLead, "id" | "created_at">): Promise<OwnerLead> {
  const id = `olead_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(
    `INSERT INTO owner_leads
       (id, owner_name, owner_phone, property_name, unit, address,
        expected_rent, bedrooms, bathrooms, notes, source, import_batch_id, stage, available_from)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id, data.owner_name, data.owner_phone,
    data.property_name ?? null, data.unit ?? null, data.address ?? null,
    data.expected_rent ?? null, data.bedrooms ?? null, data.bathrooms ?? null,
    data.notes ?? null, data.source ?? "manual", data.import_batch_id ?? null,
    data.stage ?? "imported", data.available_from ?? null
  );
  return parseOwnerLead(db.prepare(`SELECT * FROM owner_leads WHERE id = ?`).get(id) as OwnerLeadRow);
}

export async function updateOwnerLead(id: string, data: Partial<OwnerLead>): Promise<void> {
  const fields: string[] = []; const vals: unknown[] = [];
  const set = (col: string, val: unknown) => { fields.push(`${col} = ?`); vals.push(val); };
  if (data.owner_name !== undefined)             set("owner_name", data.owner_name);
  if (data.owner_phone !== undefined)            set("owner_phone", data.owner_phone);
  if (data.stage !== undefined)                  set("stage", data.stage);
  if (data.notes !== undefined)                  set("notes", data.notes);
  if (data.expected_rent !== undefined)          set("expected_rent", data.expected_rent);
  if (data.bedrooms !== undefined)               set("bedrooms", data.bedrooms);
  if (data.bathrooms !== undefined)              set("bathrooms", data.bathrooms);
  if (data.property_name !== undefined)          set("property_name", data.property_name);
  if (data.unit !== undefined)                   set("unit", data.unit);
  if (data.address !== undefined)                set("address", data.address);
  if (data.is_renewal !== undefined)             set("is_renewal", data.is_renewal);
  if (data.commission_override_rm !== undefined) set("commission_override_rm", data.commission_override_rm);
  if (data.available_from !== undefined)         set("available_from", data.available_from);
  if (data.photo_urls !== undefined)             set("photo_urls", JSON.stringify(data.photo_urls ?? []));
  if (data.agreement_url !== undefined)          set("agreement_url", data.agreement_url);
  if (data.intake_sent_at !== undefined)         set("intake_sent_at", data.intake_sent_at);
  if (fields.length === 0) return;
  vals.push(id);
  db.prepare(`UPDATE owner_leads SET ${fields.join(",")} WHERE id = ?`).run(...vals);
}

// ─── Matching: tenant profiles + packs ───────────────────────────────────────

import type { TenantProfile, MatchPack, PackTenant } from "./types";

export async function createTenantProfile(
  data: Omit<TenantProfile, "id" | "created_at">
): Promise<TenantProfile> {
  const id = `tp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(
    `INSERT INTO tenant_profiles
       (id, name, phone, age, occupation, employer, nationality, monthly_income,
        preferred_move_in, occupants, pets, smoking, budget_min, budget_max,
        bedrooms_pref, bathrooms_pref, notes, source,
        is_seeking, seeking_from, seeking_budget_max)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id, data.name, data.phone ?? null, data.age ?? null, data.occupation ?? null,
    data.employer ?? null, data.nationality ?? null, data.monthly_income ?? null,
    data.preferred_move_in ?? null, data.occupants ?? null,
    data.pets ?? 0, data.smoking ?? 0,
    data.budget_min ?? null, data.budget_max ?? null,
    data.bedrooms_pref ?? null, data.bathrooms_pref ?? null,
    data.notes ?? null, data.source ?? "manual",
    data.is_seeking ?? 0, data.seeking_from ?? null, data.seeking_budget_max ?? null
  );
  return (db.prepare(`SELECT * FROM tenant_profiles WHERE id = ?`).get(id) as TenantProfile);
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

  const total = db.prepare(
    `SELECT COUNT(*) as cnt, COALESCE(SUM(amount),0) as earned FROM commission_events WHERE agent_id = 'dev_agent_howard'`
  ).get() as { cnt: number; earned: number };

  const year = db.prepare(
    `SELECT COUNT(*) as cnt, COALESCE(SUM(amount),0) as earned FROM commission_events WHERE agent_id = 'dev_agent_howard' AND SUBSTR(earned_on,1,4) = ?`
  ).get(thisYear) as { cnt: number; earned: number };

  const best = db.prepare(
    `SELECT SUBSTR(earned_on,1,7) as m, SUM(amount) as s FROM commission_events
     WHERE agent_id = 'dev_agent_howard' GROUP BY m ORDER BY s DESC LIMIT 1`
  ).get() as { m: string; s: number } | undefined;

  const bestThisYear = db.prepare(
    `SELECT SUBSTR(earned_on,1,7) as m, SUM(amount) as s FROM commission_events
     WHERE agent_id = 'dev_agent_howard' AND SUBSTR(earned_on,1,4) = ? GROUP BY m ORDER BY s DESC LIMIT 1`
  ).get(thisYear) as { m: string; s: number } | undefined;

  const agent = db.prepare("SELECT monthly_goal_rm FROM agent_profile WHERE id = 1").get() as { monthly_goal_rm: number | null } | undefined;
  const yearGoal = (agent?.monthly_goal_rm ?? 0) * 12;

  const toLabel = (row: { m: string } | undefined) =>
    row ? `${MONTHS[parseInt(row.m.split("-")[1]) - 1]} ${row.m.split("-")[0]}` : null;

  return {
    dealCount: total.cnt,
    totalEarned: total.earned,
    yearDeals: year.cnt,
    yearEarned: year.earned,
    yearGoal,
    bestMonthAmount: best?.s ?? 0,
    bestMonthLabel: toLabel(best),
    bestMonthThisYearAmount: bestThisYear?.s ?? 0,
    bestMonthThisYearLabel: toLabel(bestThisYear),
  };
}

export async function getListedOwnerLeads(): Promise<import("./types").OwnerLead[]> {
  return (db.prepare(`SELECT * FROM owner_leads WHERE stage IN ('listed', 'matched') ORDER BY CASE stage WHEN 'matched' THEN 0 ELSE 1 END, created_at DESC`).all() as OwnerLeadRow[]).map(parseOwnerLead);
}

export async function getOwnerLead(id: string): Promise<import("./types").OwnerLead | null> {
  const r = db.prepare(`SELECT * FROM owner_leads WHERE id = ?`).get(id) as OwnerLeadRow | undefined;
  return r ? parseOwnerLead(r) : null;
}

export async function getOrCreateMatchPack(ownerLeadId: string): Promise<MatchPack> {
  const existing = db.prepare(`SELECT * FROM match_packs WHERE owner_lead_id = ?`).get(ownerLeadId) as MatchPack | undefined;
  if (existing) return existing;

  const lead = await getOwnerLead(ownerLeadId);
  if (!lead) throw new Error("Owner lead not found");

  const id = `pack_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  // Unguessable share token (16 chars, base36)
  const share = `${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
  const propertyLabel = lead.property_name
    ? lead.unit ? `${lead.property_name}, Unit ${lead.unit}` : lead.property_name
    : "Owner property";

  db.prepare(
    `INSERT INTO match_packs (id, owner_lead_id, share_token, property_label, property_rent, property_beds, property_baths)
     VALUES (?,?,?,?,?,?,?)`
  ).run(id, ownerLeadId, share, propertyLabel, lead.expected_rent ?? null, lead.bedrooms ?? null, lead.bathrooms ?? null);

  return (db.prepare(`SELECT * FROM match_packs WHERE id = ?`).get(id) as MatchPack);
}

export async function getMatchPackByToken(token: string): Promise<MatchPack | null> {
  return (db.prepare(`SELECT * FROM match_packs WHERE share_token = ?`).get(token) as MatchPack | undefined) ?? null;
}

export async function getPackTenants(packId: string): Promise<PackTenant[]> {
  return db.prepare(`
    SELECT tp.*, mpt.position, mpt.rank, mpt.liked, mpt.owner_note
    FROM match_pack_tenants mpt
    JOIN tenant_profiles tp ON tp.id = mpt.tenant_profile_id
    WHERE mpt.pack_id = ?
    ORDER BY mpt.position ASC, tp.created_at ASC
  `).all(packId) as PackTenant[];
}

export async function addTenantToPack(packId: string, tenantId: string): Promise<void> {
  const maxRow = db.prepare(`SELECT COALESCE(MAX(position), -1) AS m FROM match_pack_tenants WHERE pack_id = ?`).get(packId) as { m: number };
  const nextPos = maxRow.m + 1;
  db.prepare(
    `INSERT OR IGNORE INTO match_pack_tenants (pack_id, tenant_profile_id, position) VALUES (?,?,?)`
  ).run(packId, tenantId, nextPos);
}

export async function removeTenantFromPack(packId: string, tenantId: string): Promise<void> {
  db.prepare(`DELETE FROM match_pack_tenants WHERE pack_id = ? AND tenant_profile_id = ?`).run(packId, tenantId);
}

export async function setOwnerRanking(
  packId: string,
  rankings: Array<{ tenant_id: string; rank: number; liked: number; owner_note?: string | null }>
): Promise<void> {
  const upd = db.prepare(`UPDATE match_pack_tenants SET rank = ?, liked = ?, owner_note = ? WHERE pack_id = ? AND tenant_profile_id = ?`);
  db.transaction(() => {
    for (const r of rankings) upd.run(r.rank, r.liked, r.owner_note ?? null, packId, r.tenant_id);
  })();
}

/** Returns a Set of owner_lead_id values where the owner has submitted a ranking. */
export async function getRankedLeadIds(): Promise<Set<string>> {
  const rows = db.prepare(
    `SELECT DISTINCT mp.owner_lead_id
     FROM match_packs mp
     JOIN match_pack_tenants mpt ON mpt.pack_id = mp.id
     WHERE mpt.rank IS NOT NULL`
  ).all() as { owner_lead_id: string }[];
  return new Set(rows.map((r) => r.owner_lead_id));
}

// ─── Account / Tier ───────────────────────────────────────────────────────────

export async function getAccountTier(): Promise<Tier> {
  const row = db.prepare(`SELECT tier FROM account WHERE id=1`).get() as { tier: Tier } | undefined;
  return row?.tier ?? "starter";
}

export async function setAccountTier(tier: Tier): Promise<void> {
  db.prepare(`UPDATE account SET tier=? WHERE id=1`).run(tier);
}

export async function incrementOwnerOutreachCount(id: string): Promise<void> {
  db.prepare(`UPDATE owner_leads SET outreach_count = COALESCE(outreach_count, 0) + 1 WHERE id = ?`).run(id);
}

// ─── Owner intake ─────────────────────────────────────────────────────────────

// Reuse the existing token if one exists (no outreach logging), create only if missing.
export function getOrCreateOwnerIntakeToken(ownerLeadId: string): string {
  const row = db.prepare(`SELECT intake_token FROM owner_leads WHERE id = ?`).get(ownerLeadId) as { intake_token: string | null } | undefined;
  if (row?.intake_token) return row.intake_token;
  const token = `oi_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  db.prepare(`UPDATE owner_leads SET intake_token = ? WHERE id = ?`).run(token, ownerLeadId);
  return token;
}

export async function generateOwnerIntakeToken(ownerLeadId: string): Promise<string> {
  const token = `oi_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  db.prepare(
    `UPDATE owner_leads SET intake_token = ?, intake_sent_at = datetime('now') WHERE id = ?`
  ).run(token, ownerLeadId);
  return token;
}

export async function getOwnerLeadByIntakeToken(token: string): Promise<OwnerLead | null> {
  return (db.prepare(`SELECT * FROM owner_leads WHERE intake_token = ?`).get(token) as OwnerLead | undefined) ?? null;
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
  }
): Promise<void> {
  const fields: string[] = [`intake_completed_at = datetime('now')`];
  const vals: unknown[] = [];
  // Only write non-null values so AI returning null never clears existing data
  const set = (col: string, val: unknown) => { if (val != null) { fields.push(`${col} = ?`); vals.push(val); } };
  if (data.unit !== undefined)               set("unit", data.unit);
  if (data.bedrooms !== undefined)           set("bedrooms", data.bedrooms);
  if (data.bathrooms !== undefined)          set("bathrooms", data.bathrooms);
  if (data.expected_rent !== undefined)      set("expected_rent", data.expected_rent);
  if (data.available_from !== undefined)     set("available_from", data.available_from);
  if (data.tenant_preferences !== undefined) set("tenant_preferences", data.tenant_preferences);
  // Auto-advance to Listed — intake completed means the owner is ready to list
  fields.push(`stage = CASE WHEN stage IN ('imported','replied','wants_rent') THEN 'listed' ELSE stage END`);
  vals.push(token);
  db.prepare(`UPDATE owner_leads SET ${fields.join(", ")} WHERE intake_token = ?`).run(...vals);
}

// ─── Tenant intake sessions ───────────────────────────────────────────────────

export async function createTenantIntakeSession(
  agentId: string,
  opts?: { name?: string; phone?: string; ownerLeadId?: string }
): Promise<string> {
  const token = `ti_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  db.prepare(
    `INSERT INTO tenant_intake_sessions (token, agent_id, name, phone, owner_lead_id) VALUES (?, ?, ?, ?, ?)`
  ).run(token, agentId, opts?.name ?? null, opts?.phone ?? null, opts?.ownerLeadId ?? null);
  return token;
}

export async function deleteTenantIntakeSession(token: string): Promise<void> {
  db.prepare(`DELETE FROM tenant_intake_sessions WHERE token = ?`).run(token);
}

export async function getPendingIntakesForLead(ownerLeadId: string): Promise<Array<{
  token: string; name: string | null; phone: string | null; created_at: string;
}>> {
  return db.prepare(`
    SELECT token, name, phone, created_at
    FROM tenant_intake_sessions
    WHERE owner_lead_id = ? AND completed_at IS NULL
    ORDER BY created_at DESC
  `).all(ownerLeadId) as Array<{ token: string; name: string | null; phone: string | null; created_at: string }>;
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
  return (db.prepare(`SELECT * FROM tenant_intake_sessions WHERE token = ?`).get(token) as {
    token: string; agent_id: string; name: string | null; phone: string | null;
    owner_lead_id: string | null; created_at: string;
    completed_at: string | null; tenant_profile_id: string | null;
  } | undefined) ?? null;
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
  const id = `tp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(
    `INSERT INTO tenant_profiles
       (id, name, age, occupation, monthly_income, occupants, pets, smoking,
        budget_min, budget_max, bedrooms_pref, preferred_move_in, notes,
        intake_token, intake_completed_at, agent_id, source)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),?,'intake_form')`
  ).run(
    id, data.name, data.age ?? null, data.occupation ?? null,
    data.monthly_income ?? null, data.occupants ?? null,
    data.pets, data.smoking,
    data.budget_min ?? null, data.budget_max ?? null,
    data.bedrooms_pref ?? null, data.preferred_move_in ?? null,
    data.notes ?? null, token, agentId
  );

  db.prepare(
    `UPDATE tenant_intake_sessions SET completed_at = datetime('now'), tenant_profile_id = ? WHERE token = ?`
  ).run(id, token);

  // If session was linked to a property, carry phone forward and auto-add to pack
  const sess = db.prepare(
    `SELECT owner_lead_id, phone FROM tenant_intake_sessions WHERE token = ?`
  ).get(token) as { owner_lead_id: string | null; phone: string | null } | undefined;

  if (sess?.phone) {
    db.prepare(`UPDATE tenant_profiles SET phone = ? WHERE id = ? AND phone IS NULL`).run(sess.phone, id);
  }

  if (sess?.owner_lead_id) {
    const pack = db.prepare(
      `SELECT id FROM match_packs WHERE owner_lead_id = ?`
    ).get(sess.owner_lead_id) as { id: string } | undefined;
    if (pack) {
      const maxPos = (db.prepare(
        `SELECT COALESCE(MAX(position), -1) AS m FROM match_pack_tenants WHERE pack_id = ?`
      ).get(pack.id) as { m: number }).m;
      db.prepare(
        `INSERT OR IGNORE INTO match_pack_tenants (pack_id, tenant_profile_id, position) VALUES (?,?,?)`
      ).run(pack.id, id, maxPos + 1);
    }
  }

  return (db.prepare(`SELECT * FROM tenant_profiles WHERE id = ?`).get(id) as TenantProfile);
}

export async function getAllTenantProfiles(): Promise<TenantProfile[]> {
  return db.prepare(`SELECT * FROM tenant_profiles ORDER BY created_at DESC`).all() as TenantProfile[];
}

export async function getTenantProfileByPhone(phone: string): Promise<TenantProfile | null> {
  return (db.prepare(`SELECT * FROM tenant_profiles WHERE phone = ?`).get(phone) as TenantProfile | undefined) ?? null;
}

export async function getTenantProfileByPhoneAndName(phone: string, name: string): Promise<TenantProfile | null> {
  // Prefer exact name+phone match; fall back to phone-only for unique phones
  const exact = db.prepare(`SELECT * FROM tenant_profiles WHERE phone = ? AND name = ?`).get(phone, name) as TenantProfile | undefined;
  if (exact) return exact;
  // Only fall back to phone-only if there's exactly one profile with that phone
  const rows = db.prepare(`SELECT * FROM tenant_profiles WHERE phone = ?`).all(phone) as TenantProfile[];
  return rows.length === 1 ? rows[0] : null;
}

export async function updateTenantProfile(id: string, data: Partial<Omit<TenantProfile, "id" | "created_at">>): Promise<void> {
  const fields: string[] = []; const vals: unknown[] = [];
  const set = (col: string, val: unknown) => { fields.push(`${col} = ?`); vals.push(val); };
  if (data.name !== undefined)               set("name", data.name);
  if (data.phone !== undefined)              set("phone", data.phone);
  if (data.age !== undefined)                set("age", data.age);
  if (data.occupation !== undefined)         set("occupation", data.occupation);
  if (data.employer !== undefined)           set("employer", data.employer);
  if (data.nationality !== undefined)        set("nationality", data.nationality);
  if (data.monthly_income !== undefined)     set("monthly_income", data.monthly_income);
  if (data.budget_min !== undefined)         set("budget_min", data.budget_min);
  if (data.budget_max !== undefined)         set("budget_max", data.budget_max);
  if (data.bedrooms_pref !== undefined)      set("bedrooms_pref", data.bedrooms_pref);
  if (data.bathrooms_pref !== undefined)     set("bathrooms_pref", data.bathrooms_pref);
  if (data.occupants !== undefined)          set("occupants", data.occupants);
  if (data.preferred_move_in !== undefined)  set("preferred_move_in", data.preferred_move_in);
  if (data.available_from !== undefined)       set("available_from", data.available_from);
  if (data.is_seeking !== undefined)           set("is_seeking", data.is_seeking);
  if (data.seeking_from !== undefined)         set("seeking_from", data.seeking_from);
  if (data.seeking_budget_max !== undefined)   set("seeking_budget_max", data.seeking_budget_max);
  if (data.pets !== undefined)                 set("pets", data.pets);
  if (data.smoking !== undefined)              set("smoking", data.smoking);
  if (data.notes !== undefined)                set("notes", data.notes);
  if (fields.length === 0) return;
  vals.push(id);
  db.prepare(`UPDATE tenant_profiles SET ${fields.join(",")} WHERE id = ?`).run(...vals);
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
  return db.prepare(`
    SELECT p.id, p.name, p.unit, p.owner_name, p.owner_phone,
           t.amount, t.lifecycle_stage, t.tenant_name, t.tenant_phone, t.id as tenancy_id
    FROM properties p
    LEFT JOIN tenancies t ON t.id = (
      SELECT id FROM tenancies
      WHERE property_id = p.id AND (lifecycle_stage IS NULL OR lifecycle_stage != 'closed')
      ORDER BY created_at DESC LIMIT 1
    )
    ORDER BY p.owner_name, p.name
  `).all() as ManagedProperty[];
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
  return db.prepare(`
    SELECT t.id as tenancy_id, t.tenant_name, t.tenant_phone,
           COALESCE(p.name, ol.property_name) as property_name,
           COALESCE(p.unit, ol.unit) as unit,
           t.amount, t.lifecycle_stage
    FROM tenancies t
    LEFT JOIN properties p ON p.id = t.property_id
    LEFT JOIN owner_leads ol ON ol.id = t.owner_lead_id
    WHERE t.lifecycle_stage IS NULL OR t.lifecycle_stage NOT IN ('closed')
    ORDER BY t.created_at DESC
  `).all() as Array<{ tenancy_id: string; tenant_name: string; tenant_phone: string | null; property_name: string | null; unit: string | null; amount: number | null; lifecycle_stage: string | null }>;
}

export async function getTenantForOwnerLead(ownerLeadId: string): Promise<{ tenant_name: string; tenant_phone: string; tenancy_id: string } | null> {
  const r = db.prepare(`SELECT id, tenant_name, tenant_phone FROM tenancies WHERE owner_lead_id = ? ORDER BY created_at DESC LIMIT 1`).get(ownerLeadId) as { id: string; tenant_name: string; tenant_phone: string } | undefined;
  return r ? { tenancy_id: r.id, tenant_name: r.tenant_name, tenant_phone: r.tenant_phone } : null;
}

export async function getTenantsForOwnerLeads(ownerLeadIds: string[]): Promise<Record<string, { tenant_name: string; tenant_phone: string; tenancy_id: string; lifecycle_stage: string | null }>> {
  if (ownerLeadIds.length === 0) return {};
  const placeholders = ownerLeadIds.map(() => "?").join(",");
  const rows = db.prepare(`SELECT id, tenant_name, tenant_phone, owner_lead_id, lifecycle_stage FROM tenancies WHERE owner_lead_id IN (${placeholders}) ORDER BY created_at DESC`).all(...ownerLeadIds) as Array<{ id: string; tenant_name: string; tenant_phone: string; owner_lead_id: string; lifecycle_stage: string | null }>;
  const out: Record<string, { tenant_name: string; tenant_phone: string; tenancy_id: string; lifecycle_stage: string | null }> = {};
  for (const r of rows) {
    if (!out[r.owner_lead_id]) {
      out[r.owner_lead_id] = { tenancy_id: r.id, tenant_name: r.tenant_name, tenant_phone: r.tenant_phone, lifecycle_stage: r.lifecycle_stage };
    }
  }
  return out;
}

// ─── Property Supports ────────────────────────────────────────────────────────

export function getPropertySupports(): PropertySupport[] {
  return db.prepare(
    `SELECT id, name, phone, type, area, notes, starred, source, created_at
     FROM property_supports
     WHERE agent_id = 'dev_agent_howard'
     ORDER BY starred DESC, type, name`
  ).all() as PropertySupport[];
}

export function createPropertySupport(data: {
  name: string; phone: string; type: SupportType;
  area?: string | null; notes?: string | null; starred?: number;
}): PropertySupport {
  const id = `sup_${Date.now()}`;
  db.prepare(
    `INSERT INTO property_supports (id, name, phone, type, area, notes, starred, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'custom')`
  ).run(id, data.name, data.phone, data.type, data.area ?? null, data.notes ?? null, data.starred ?? 0);
  return db.prepare(`SELECT id, name, phone, type, area, notes, starred, source, created_at FROM property_supports WHERE id=?`).get(id) as PropertySupport;
}

export function updatePropertySupport(id: string, data: Partial<{
  name: string; phone: string; type: SupportType;
  area: string | null; notes: string | null; starred: number;
}>): void {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (data.name     !== undefined) { sets.push("name=?");    vals.push(data.name); }
  if (data.phone    !== undefined) { sets.push("phone=?");   vals.push(data.phone); }
  if (data.type     !== undefined) { sets.push("type=?");    vals.push(data.type); }
  if (data.area     !== undefined) { sets.push("area=?");    vals.push(data.area); }
  if (data.notes    !== undefined) { sets.push("notes=?");   vals.push(data.notes); }
  if (data.starred  !== undefined) { sets.push("starred=?"); vals.push(data.starred); }
  if (sets.length === 0) return;
  vals.push(id);
  db.prepare(`UPDATE property_supports SET ${sets.join(",")} WHERE id=?`).run(...vals);
}

export function deletePropertySupport(id: string): void {
  db.prepare(`DELETE FROM property_supports WHERE id=?`).run(id);
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

  const yearStats = db.prepare(
    `SELECT type, COUNT(*) as cnt FROM commission_events WHERE SUBSTR(earned_on,1,4)=? GROUP BY type`
  ).all(thisYear) as { type: string; cnt: number }[];
  const renewalsThisYear = yearStats.find((r) => r.type === "renewal")?.cnt ?? 0;
  const newSigningsThisYear = yearStats.find((r) => r.type === "new_signing")?.cnt ?? 0;

  const leadsRow = db.prepare(
    `SELECT COUNT(*) as cnt FROM owner_leads WHERE stage IN ('imported','replied')`
  ).get() as { cnt: number };

  return {
    totalTenancies,
    paidThisMonth,
    collectionPct,
    overdueCount,
    pendingVerifyCount,
    expiringCount,
    renewalsThisYear,
    newSigningsThisYear,
    leadsNeedingAttention: leadsRow.cnt,
  };
}

// ─── Renewal intake tokens ────────────────────────────────────────────────────

export async function clearRenewalData(tenancyId: string): Promise<void> {
  db.prepare(`UPDATE tenancies SET
    tenant_renewal_completed_at=NULL, owner_renewal_completed_at=NULL,
    renewal_proposed_start=NULL, renewal_proposed_months=NULL, renewal_proposed_rent=NULL,
    owner_noted_tenant_intent=NULL
    WHERE id=?`).run(tenancyId);
}

export async function generateTenantRenewalToken(tenancyId: string): Promise<string> {
  const row = db.prepare(`SELECT tenant_renewal_token FROM tenancies WHERE id=?`).get(tenancyId) as { tenant_renewal_token: string | null } | undefined;
  if (row?.tenant_renewal_token) return row.tenant_renewal_token;
  const token = `rt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  db.prepare(`UPDATE tenancies SET tenant_renewal_token=? WHERE id=?`).run(token, tenancyId);
  return token;
}

export async function generateOwnerRenewalToken(tenancyId: string): Promise<string> {
  const row = db.prepare(`SELECT owner_renewal_token FROM tenancies WHERE id=?`).get(tenancyId) as { owner_renewal_token: string | null } | undefined;
  if (row?.owner_renewal_token) return row.owner_renewal_token;
  const token = `ro_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  db.prepare(`UPDATE tenancies SET owner_renewal_token=? WHERE id=?`).run(token, tenancyId);
  return token;
}

export async function getTenancyByTenantRenewalToken(token: string): Promise<Tenancy | null> {
  const r = db.prepare(`${JOIN} WHERE t.tenant_renewal_token=?`).get(token) as TenRow | undefined;
  return r ? toTenancy(r) : null;
}

export async function getTenancyByOwnerRenewalToken(token: string): Promise<Tenancy | null> {
  const r = db.prepare(`${JOIN} WHERE t.owner_renewal_token=?`).get(token) as TenRow | undefined;
  return r ? toTenancy(r) : null;
}

export async function completeTenantRenewalIntake(
  token: string,
  staying: boolean,
  newEndDate?: string
): Promise<void> {
  const row = db.prepare(`SELECT id FROM tenancies WHERE tenant_renewal_token=?`).get(token) as { id: string } | undefined;
  if (!row) return;

  const fields: string[] = ["replied_tenant=?", "tenant_renewal_completed_at=datetime('now')"];
  const vals: unknown[] = [staying ? "yes" : "no"];

  if (staying && newEndDate) { fields.push("contract_end=?"); vals.push(newEndDate); }

  vals.push(token);
  db.prepare(`UPDATE tenancies SET ${fields.join(",")} WHERE tenant_renewal_token=?`).run(...vals);
}

export async function completeOwnerRenewalIntake(
  token: string,
  continuing: boolean,
  newRent?: number,
  tenantIntent?: "yes" | "no" | "unsure",
  newContractStart?: string,
  durationYears?: number
): Promise<void> {
  const row = db.prepare(`SELECT id FROM tenancies WHERE owner_renewal_token=?`).get(token) as { id: string } | undefined;
  if (!row) return;

  const fields: string[] = ["replied_owner=?", "owner_renewal_completed_at=datetime('now')"];
  const vals: unknown[] = [continuing ? "yes" : "no"];

  // Always save proposed values — useful for listing if owner stops, for renewal if continuing
  // Also write amount live so the card updates immediately without agent action
  if (newRent && newRent > 0)            { fields.push("renewal_proposed_rent=?", "amount=?"); vals.push(newRent, newRent); }
  if (newContractStart)                  { fields.push("renewal_proposed_start=?");  vals.push(newContractStart); }
  if (durationYears && durationYears > 0){ fields.push("renewal_proposed_months=?"); vals.push(durationYears * 12); }
  if (tenantIntent) { fields.push("owner_noted_tenant_intent=?"); vals.push(tenantIntent); }

  vals.push(token);
  db.prepare(`UPDATE tenancies SET ${fields.join(",")} WHERE owner_renewal_token=?`).run(...vals);
}
