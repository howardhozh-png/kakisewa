export type TenancyStatus =
  | "Pending"
  | "Reminder Sent"
  | "Paid - Pending Verification"
  | "Verified";

export type LhdnStatus = "none" | "generated" | "submitted";


export type Tier = "starter" | "pro" | "elite";

export type ReplyState = "pending" | "yes" | "no";

export type LifecycleStage =
  | "active"           // contract is fine, expiry is far away — just sitting in the database
  | "stalled"          // expired and nobody replied — needs immediate attention
  | "headsup"          // T-60 to T-30, neither side asked yet
  | "pinged"           // agent has asked, waiting on ≥1 reply
  | "renewing"         // both said yes
  | "pending_payment"  // renewal/new contract signed, awaiting first month payment
  | "replacing"        // owner wants to keep listing, tenant leaving (hidden)
  | "ending"           // owner ending the listing (hidden)
  | "closed"           // legacy/archive (no longer visible as a column)
  | "reserved";        // tenant confirmed, commission pending — card stays in Rented until moved in

export interface Tenancy {
  id: string;
  property_name?: string;
  tenant_name: string | null;
  tenant_phone: string | null;
  due_day: number;
  amount: number;
  current_month_paid: boolean;
  current_month_receipt_url?: string | null;
  last_paid_month?: string | null;
  last_receipt_url?: string | null;
  lhdn_status: LhdnStatus;
  status: TenancyStatus;
  forwarded_at?: string | null;
  contract_start?: string | null;            // 'YYYY-MM-DD'
  contract_end?: string | null;              // 'YYYY-MM-DD'
  contract_duration_months?: number | null;
  lifecycle_stage?: LifecycleStage | null;
  replied_tenant: ReplyState;
  replied_owner: ReplyState;
  tenant_renewal_completed_at?: string | null;
  owner_renewal_completed_at?: string | null;
  owner_noted_tenant_intent?: "yes" | "no" | "unsure" | null;
  renewal_proposed_start?: string | null;
  renewal_proposed_months?: number | null;
  renewal_proposed_rent?: number | null;
  closed_reason?: string | null;
  agreement_url?: string | null;
  deleted_at?: string | null;
  created_at: string;
  renewal_commission_type?: "full_year" | "half_month" | null;
  last_wa_reply_at?: string | null;
  last_wa_reply_text?: string | null;
  wa_status?: "pending" | "replied" | "no_response" | null;
  property?: {
    owner_name?: string;
    owner_phone?: string;
    address?: string;
    unit?: string;
    photo_urls?: string[];
    cover_photo_index?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
  };
  owner_lead_id?: string | null;
  user_id?: string | null;
}

// Default stage for a tenancy that doesn't have lifecycle_stage explicitly
// set. Used when contract is approaching expiry but agent hasn't moved
// the card yet.
export function defaultLifecycleStage(t: Tenancy, today: Date): LifecycleStage | null {
  if (!t.contract_end) return null;
  const days = daysUntil(t.contract_end, today);
  // Closed tenancies fall off the board entirely after 90 days expired
  if (days < -90) return null;
  // Agent-set stage takes precedence unless it's "active" with <=60 days left,
  // in which case the days-based logic below should auto-move the card to Expiring.
  if (t.lifecycle_stage && !(t.lifecycle_stage === "active" && days <= 60)) return t.lifecycle_stage;
  // Default for far-future contracts with no explicit stage
  if (days > 60) return "active";

  const tr = t.replied_tenant ?? "pending";
  const or = t.replied_owner  ?? "pending";

  // Expired and both chips still pending — show in Follow-up (no separate Stalled column)
  if (days < 0 && tr === "pending" && or === "pending") return "headsup";

  // Both replied
  if (tr === "yes" && or === "yes") return "renewing";
  if (or === "yes" && tr === "no")  return "replacing";
  if (or === "no")                  return "ending";
  // At least one chip flipped from pending → we've started pinging
  if (tr !== "pending" || or !== "pending") return "pinged";
  return "headsup";
}

export interface OwnerLead {
  id: string;
  user_id?: string | null;
  owner_name: string;
  owner_phone: string;
  property_name?: string | null;
  unit?: string | null;
  address?: string | null;
  expected_rent?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking?: string | null;
  notes?: string | null;
  source?: "csv" | "auto_replacing" | "manual" | null;
  import_batch_id?: string | null;
  stage: "imported" | "replied" | "wants_rent" | "own_stay" | "listed" | "matched" | "archived";
  intake_token?: string | null;
  intake_sent_at?: string | null;
  intake_completed_at?: string | null;
  available_from?: string | null;
  tenant_preferences?: string | null;
  photo_urls?: string[];
  cover_photo_index?: number | null;
  agreement_url?: string | null;
  outreach_count?: number | null;
  listing_purpose?: "rent" | "sell" | "both" | null;
  is_managed?: boolean;
  managed_at?: string | null;
  is_competitor_target?: boolean;
  competitor_contract_start?: string | null;
  competitor_contract_duration_months?: number | null;
  competitor_contract_end?: string | null;
  competitor_stage?: "watching" | "reach_out" | "renewing" | "in_talks" | "missed";
  has_active_tenancy?: boolean;
  deleted_at?: string | null;
  property_share_token?: string | null;
  last_wa_reply_at?: string | null;
  last_wa_reply_text?: string | null;
  wa_status?: "pending" | "replied" | "no_response" | null;
  last_outreach_at?: string | null;
  created_at: string;
}

export type CompetitorStage = "watching" | "reach_out" | "renewing" | "in_talks" | "missed";

export type SubscriptionStatus = "beta" | "beta_frozen" | "trial" | "active" | "expired" | "cancelled";

export interface AgentProfile {
  id: number;
  name?: string | null;
  phone?: string | null;
  agency?: string | null;
  ren_number?: string | null;
  photo_url?: string | null;
  accent_color?: string | null;
  commission_pct?: number;       // % of one month's rent earned per signed tenancy. Default 100 (= 1 month rent)
  monthly_goal_rm?: number | null;
  quarterly_goal_rm?: number | null;
  today_focus?: string | null;
  today_focus_updated_at?: string | null;
  today_checklist?: string | null;
  login_streak?: number | null;
  longest_streak?: number | null;
  last_login_date?: string | null;
  motivation_photo_url?: string | null;
  whatsapp_templates?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  subscription_status?: SubscriptionStatus | null;
  subscription_plan?: "silver" | "gold" | "platinum" | "elite" | null;
  subscription_interval?: "monthly" | "annual" | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  subscription_year?: number | null;
  referred_by_slug?: string | null;
  referral_slug?: string | null;
  trial_downgrade_archived_count?: number | null;
  profile_strengths?: ProfileStrengthItem[] | null;
  profile_verbatim?: ProfileVerbatimItem[] | null;
  whatsapp_phone_number_id?: string | null;
  whatsapp_business_account_id?: string | null;
  whatsapp_connected_at?: string | null;
  whatsapp_number?: string | null;
  notif_push?: boolean | null;
  notif_email?: boolean | null;
}

export interface ProfileStrengthItem {
  label: string;
  rating: number; // 0.5 increments, 0.5–5.0
}

export interface ProfileVerbatimItem {
  quote: string;
  ownerName: string;
  ownerRole: string;
}

export interface PerformanceSummary {
  monthLabel: string;
  quarterLabel: string;
  mtdCommission: number;
  qtdCommission: number;
  ytdCommission: number;
  signedThisMonth: number;
  signedThisQuarter: number;
  monthlyGoal: number;
  quarterlyGoal: number;
  monthlyPct: number;
  quarterlyPct: number;
}

export interface TenantProfile {
  id: string;
  name: string;
  phone?: string | null;
  age?: number | null;
  occupation?: string | null;
  employer?: string | null;
  nationality?: string | null;
  monthly_income?: number | null;
  preferred_move_in?: string | null;
  occupants?: number | null;
  pets?: number;       // 0/1 from sqlite
  smoking?: number;
  budget_min?: number | null;
  budget_max?: number | null;
  bedrooms_pref?: number | null;
  bathrooms_pref?: number | null;
  notes?: string | null;
  source?: string;
  intake_token?: string | null;
  intake_completed_at?: string | null;
  available_from?: string | null;
  is_seeking?: number;          // 0/1 — tenant is looking for a new place
  seeking_from?: string | null; // 'YYYY-MM-DD'
  seeking_budget_max?: number | null;
  area_preference?: string | null;
  furnishing_preference?: string | null;
  created_at: string;
}

export interface PendingIntake {
  token: string;
  name: string | null;
  phone: string | null;
  created_at: string;
}

export interface MatchPack {
  id: string;
  user_id?: string | null;
  owner_lead_id: string;
  share_token: string;
  property_label?: string | null;
  property_rent?: number | null;
  property_beds?: number | null;
  property_baths?: number | null;
  owner_ranked_at?: string | null;
  created_at: string;
}

export interface MatchPackEntry {
  pack_id: string;
  tenant_profile_id: string;
  position: number;
  rank?: number | null;
  liked: number;       // 0/1
}

export interface PackTenant extends TenantProfile {
  position: number;
  rank?: number | null;
  liked: number;
  owner_note?: string | null;
}

export const SUPPORT_TYPES = [
  "cleaner", "electrician", "plumber", "aircon",
  "renovation", "interior_design", "locksmith", "pest_control",
  "wifi", "stamping", "other",
] as const;
export type SupportType = typeof SUPPORT_TYPES[number];

export const SUPPORT_LABELS: Record<SupportType, string> = {
  cleaner: "Cleaner",
  electrician: "Electrician",
  plumber: "Plumber",
  aircon: "Air-Cond",
  renovation: "Renovation",
  interior_design: "Interior Design",
  locksmith: "Locksmith",
  pest_control: "Pest Control",
  wifi: "WiFi",
  stamping: "Stamping",
  other: "Other",
};

export const SUPPORT_ICONS: Record<SupportType, string> = {
  cleaner: "🧹",
  electrician: "⚡",
  plumber: "🔧",
  aircon: "❄️",
  renovation: "🏗️",
  interior_design: "🛋️",
  locksmith: "🔑",
  pest_control: "🐜",
  wifi: "📶",
  stamping: "📄",
  other: "📋",
};

export interface PropertySupport {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string;
  type: SupportType;
  area: string | null;
  notes: string | null;
  starred: number; // 0 | 1
  source: string;  // 'seed' | 'custom'
  created_at: string;
}

// Contract lifecycle bucket — derived from contract_end vs today.
export type ContractBucket = "no_contract" | "active" | "expiring_60" | "expiring_30" | "expired";

export function computeContractBucket(t: Tenancy, today: Date): ContractBucket {
  if (!t.contract_end) return "no_contract";
  const days = daysUntil(t.contract_end, today);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_30";
  if (days <= 60) return "expiring_60";
  return "active";
}

// Date-only "today" pinned to Malaysia time, so the value is identical
// whether computed on the server (UTC) or a client browser (UTC+8) — using
// runtime-local `new Date()` instead causes a hydration mismatch for several
// hours every day, since the calendar date differs between those timezones.
export function getBusinessToday(): Date {
  const parts = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const [y, m, d] = parts.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function daysUntil(endDateIso: string, today: Date): number {
  const [y, m, d] = endDateIso.split("-").map(Number);
  const end = new Date(y, m - 1, d);
  const ms = end.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round(ms / 86400000);
}

// WhatsApp message template names — every outbound send tags itself
// with one of these so we can audit + later route via BSP.
export type WhatsAppTemplate =
  | "rent_reminder"
  | "rent_re_reminder"
  | "forward_receipt_to_owner"
  | "expiry_check_tenant"      // "Are you renewing?"
  | "expiry_check_owner"       // "Still want to rent it out?"
  | "competitor_expiry_owner"  // target listing: outreach to competitor unit's owner
  | "owner_outreach"           // bulk to imported owner list (Phase C)
  | "tenant_intake"            // sends intake-form link (Phase D)
  | "property_pack"            // sends property profile pack link (Phase D)
  | "viewing_schedule"         // Phase E
  ;

export interface WhatsAppLogEntry {
  id: string;
  related_id?: string | null;
  related_type?: string | null;
  template: WhatsAppTemplate;
  recipient_phone: string;
  recipient_name?: string | null;
  body?: string | null;
  channel: "wa_me" | "bsp_api";
  sent_at: string;
  bsp_message_id?: string | null;
  bsp_status?: string | null;
}

// Computed funnel stage shown on the Action Board.
// Derived from (status, current_month_paid, due_day vs today, forwarded_at).
export type ActionStage = "owing" | "nearing" | "pending_verify" | "awaiting_forward" | "completed";

export function computeActionStage(t: Tenancy, today: Date): ActionStage {
  // Forwarded to owner this month → done
  if (t.forwarded_at && isSameMonth(new Date(t.forwarded_at), today)) {
    return "completed";
  }
  // Verified + paid but not forwarded → next action is forward
  if (t.current_month_paid || t.status === "Verified") {
    return "awaiting_forward";
  }
  // Receipt uploaded, awaiting verification
  if (t.status === "Paid - Pending Verification") {
    return "pending_verify";
  }
  // Unpaid + due date already passed → owing
  if (today.getDate() >= t.due_day) {
    return "owing";
  }
  // Unpaid + due date upcoming → nearing
  return "nearing";
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export interface VerificationResult {
  success: boolean;
  confidence: number;
  detected_amount?: number;
  detected_date?: string;
  detected_bank?: string;
  notes: string;
}

export interface TierConfig {
  id: Tier;
  name: string;
  price_myr: number | null;
  max_properties: number | null;
  auto_ai: boolean;
  auto_lhdn: boolean;
}

export const TIERS: Record<Tier, TierConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    price_myr: null,
    max_properties: 10,
    auto_ai: false,
    auto_lhdn: false,
  },
  pro: {
    id: "pro",
    name: "Pro",
    price_myr: 99,
    max_properties: 50,
    auto_ai: true,
    auto_lhdn: false,
  },
  elite: {
    id: "elite",
    name: "Elite",
    price_myr: 299,
    max_properties: null,
    auto_ai: true,
    auto_lhdn: true,
  },
};

// Beta ends 90 days from a fixed launch date
export const BETA_END = new Date("2026-08-04T00:00:00Z");
