// Templated WhatsApp messages for the contract lifecycle flow.
// Every template is parameterised on the same shape so we can swap
// to a BSP later without changing call sites.

import { Tenancy, AgentProfile, daysUntil } from "./types";

export interface TemplateContext {
  tenancy: Tenancy;
  agent: AgentProfile;
  today: Date;
}

interface Resolved {
  tenant_name: string;
  tenant_phone: string;
  tenant_username: string | null;
  owner_name: string;
  owner_phone: string;
  owner_username: string | null;
  property_name: string;
  unit: string;          // "Unit A-12" or "" if no unit
  rent: string;          // "RM 1,800"
  expiry_date: string;   // "1 June 2026"
  days_until: number;    // signed; negative = expired
  agent_name: string;
  agent_phone: string;
  agency: string;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function resolve(ctx: TemplateContext): Resolved {
  const { tenancy: t, agent } = ctx;
  const days = t.contract_end ? daysUntil(t.contract_end, ctx.today) : 0;
  const expiryDate = t.contract_end
    ? (() => {
        const [y, m, d] = t.contract_end.split("-").map(Number);
        return `${d} ${MONTHS[m - 1]} ${y}`;
      })()
    : "—";
  const unitLabel = (() => {
    // Try to extract from property_name "Residensi Mutiara, Unit A-12" → "Unit A-12"
    const match = t.property_name?.match(/Unit\s+[A-Za-z0-9-]+/);
    if (match) return match[0];
    if (t.property?.unit) return `Unit ${t.property.unit}`;
    return "";
  })();
  return {
    tenant_name: t.tenant_name ?? "",
    tenant_phone: t.tenant_phone ?? "",
    tenant_username: t.tenant_whatsapp_username ?? null,
    owner_name: t.property?.owner_name ?? "Owner",
    owner_phone: t.property?.owner_phone ?? "",
    owner_username: t.property?.owner_whatsapp_username ?? null,
    property_name: t.property_name ?? t.owner_lead_id ?? "",
    unit: unitLabel,
    rent: `RM ${t.amount.toLocaleString()}`,
    expiry_date: expiryDate,
    days_until: days,
    agent_name: agent.name ?? "Your agent",
    agent_phone: agent.phone ?? "",
    agency: agent.agency ?? "",
  };
}

function whenPhrase(days: number): string {
  if (days > 1) return `in ${days} days`;
  if (days === 1) return "tomorrow";
  if (days === 0) return "today";
  if (days === -1) return "yesterday";
  return `${Math.abs(days)} days ago`;
}

// ─── Templates ───────────────────────────────────────────────────────────────

export function tplHeadsupTenant(ctx: TemplateContext): string {
  const v = resolve(ctx);
  const property = v.unit ? `*${v.property_name.replace(/,?\s*Unit\s+[A-Za-z0-9-]+/, "")}, ${v.unit}*` : `*${v.property_name}*`;
  return `Hi ${v.tenant_name}! Your tenancy at ${property} expires ${whenPhrase(v.days_until)} (${v.expiry_date}).

Are you planning to renew? Just reply:
✅ *YES* — to continue
❌ *NO* — if you're moving out

I'll prepare everything once I hear from you 🙏
— ${v.agent_name}${v.agency ? `, ${v.agency}` : ""}`;
}

export function tplHeadsupOwner(ctx: TemplateContext): string {
  const v = resolve(ctx);
  const property = v.unit ? `*${v.property_name.replace(/,?\s*Unit\s+[A-Za-z0-9-]+/, "")}, ${v.unit}*` : `*${v.property_name}*`;
  return `Hi ${v.owner_name}! The tenancy at ${property} with ${v.tenant_name} (${v.rent}/mo) expires ${whenPhrase(v.days_until)} (${v.expiry_date}).

Would you like to continue renting it out? Just reply:
✅ *YES* — renew with same or new tenant
❌ *NO* — end the listing

I'll sort everything once I hear from you 🙏
— ${v.agent_name}${v.agency ? `, ${v.agency}` : ""}`;
}

export function tplRenewalConfirmation(ctx: TemplateContext): string {
  const v = resolve(ctx);
  const property = v.unit ? `*${v.property_name.replace(/,?\s*Unit\s+[A-Za-z0-9-]+/, "")}, ${v.unit}*` : `*${v.property_name}*`;
  return `Hi! Great news — the tenancy at ${property} has been renewed ✅

Tenant: ${v.tenant_name}
Rent: ${v.rent}/month

I'll send the new contract for signing shortly.
— ${v.agent_name}${v.agency ? `, ${v.agency}` : ""}`;
}

export function tplReplacingTenantToOwner(ctx: TemplateContext): string {
  const v = resolve(ctx);
  const property = v.unit ? `*${v.property_name.replace(/,?\s*Unit\s+[A-Za-z0-9-]+/, "")}, ${v.unit}*` : `*${v.property_name}*`;
  return `Hi ${v.owner_name}! ${v.tenant_name} confirmed they're moving out of ${property} by ${v.expiry_date}.

I'll start sourcing a new tenant right away. Any preferences I should screen for?
(e.g. no pets, working professional, expected rent)

Reply here and I'll get started 🏠
— ${v.agent_name}${v.agency ? `, ${v.agency}` : ""}`;
}

export function tplOwnerEndingToTenant(ctx: TemplateContext): string {
  const v = resolve(ctx);
  const property = v.unit ? `*${v.property_name.replace(/,?\s*Unit\s+[A-Za-z0-9-]+/, "")}, ${v.unit}*` : `*${v.property_name}*`;
  return `Hi ${v.tenant_name}! The owner of ${property} has decided to end the tenancy when your contract expires on ${v.expiry_date}.

Please plan for move-out by then. I'll share the handover checklist closer to the date.

Need help finding a new place? Let me know — I can share matching listings 🏠
— ${v.agent_name}${v.agency ? `, ${v.agency}` : ""}`;
}

export function tplMutualEndToBoth(ctx: TemplateContext): string {
  const v = resolve(ctx);
  const property = v.unit ? `*${v.property_name.replace(/,?\s*Unit\s+[A-Za-z0-9-]+/, "")}, ${v.unit}*` : `*${v.property_name}*`;
  return `Hi! Just confirming the tenancy at ${property} will end on ${v.expiry_date} as discussed.

I'll coordinate the handover, key return, and deposit refund process closer to the date.
— ${v.agent_name}${v.agency ? `, ${v.agency}` : ""}`;
}

// Maps a stage transition the agent confirmed to the templates that should
// open in WhatsApp (one tab per recipient).
export interface OutboundPlan {
  to: "tenant" | "owner";
  phone: string;
  username: string | null;
  body: string;
}

export function plansForStage(
  stage: import("./types").LifecycleStage,
  ctx: TemplateContext
): OutboundPlan[] {
  const v = resolve(ctx);
  switch (stage) {
    case "pinged":
      return [
        { to: "tenant", phone: v.tenant_phone, username: v.tenant_username, body: tplHeadsupTenant(ctx) },
        { to: "owner",  phone: v.owner_phone,  username: v.owner_username,  body: tplHeadsupOwner(ctx)  },
      ];
    case "renewing":
      return [
        { to: "tenant", phone: v.tenant_phone, username: v.tenant_username, body: tplRenewalConfirmation(ctx) },
        { to: "owner",  phone: v.owner_phone,  username: v.owner_username,  body: tplRenewalConfirmation(ctx) },
      ];
    case "replacing":
      return [
        { to: "owner",  phone: v.owner_phone,  username: v.owner_username,  body: tplReplacingTenantToOwner(ctx) },
      ];
    case "ending":
      // Owner ended → notify tenant
      return [
        { to: "tenant", phone: v.tenant_phone, username: v.tenant_username, body: tplOwnerEndingToTenant(ctx) },
      ];
    default:
      return [];
  }
}
