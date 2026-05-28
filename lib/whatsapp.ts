// Templated WhatsApp message bodies + wa.me URL builders.
// Every send goes through buildOutbound() so the BSP migration only
// needs one swap point: wa.me URL → BSP API call.

import type { WhatsAppTemplate } from "./types";

export interface OutboundParams {
  template: WhatsAppTemplate;
  toPhone: string;
  body: string;
}

export interface OutboundResult {
  url: string;        // wa.me URL the agent's WhatsApp opens
  body: string;       // raw template body (so callers can log it)
}

export function buildOutbound(p: OutboundParams): OutboundResult {
  return {
    url: `https://wa.me/${normalisePhone(p.toPhone)}?text=${encodeURIComponent(p.body)}`,
    body: p.body,
  };
}

// Strip a leading + and any non-digits — wa.me wants raw digits.
function normalisePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

// ─── Template body builders ──────────────────────────────────────────────────

export function templateRentReminder(p: {
  tenantName: string; propertyName: string; amount: number; uploadUrl: string;
}): string {
  return `Hi ${p.tenantName}, this is a friendly reminder that your rent of RM${p.amount.toFixed(2)} for *${p.propertyName}* is due.\n\nPlease upload your payment receipt here: ${p.uploadUrl}\n\nThank you!`;
}

export function templateForwardReceiptToOwner(p: {
  tenantName: string; propertyName: string; amount: number; receiptUrl: string;
}): string {
  return `Hi Owner, rent for *${p.propertyName}* has been received from ${p.tenantName}.\n\nAmount: RM${p.amount.toFixed(2)}\nReceipt proof: ${p.receiptUrl}\n\nPlease review at your convenience.`;
}

export function templateExpiryCheckTenant(p: {
  tenantName: string; propertyName: string; expiryDate: string; daysUntil: number;
  agentName?: string; agentAgency?: string; formUrl?: string;
}): string {
  const when = p.daysUntil > 0
    ? `in ${p.daysUntil} day${p.daysUntil === 1 ? "" : "s"}`
    : p.daysUntil === 0 ? "today"
    : `${Math.abs(p.daysUntil)} day${p.daysUntil === -1 ? "" : "s"} ago`;
  const agentLine = p.agentName
    ? `I'm ${p.agentName}${p.agentAgency ? ` from ${p.agentAgency}` : ""}. `
    : "";
  if (p.formUrl) {
    return `Hi ${p.tenantName}! ${agentLine}Your tenancy at *${p.propertyName}* is expiring ${when}. Just tap the link to let me know if you're planning to stay:

${p.formUrl}

No login needed 🙏`;
  }
  return `Hi ${p.tenantName}! ${agentLine}Your tenancy at *${p.propertyName}* expires ${when} (${p.expiryDate}). Are you planning to renew? Reply YES to continue or NO if you're moving out 🙏`;
}

export function templateExpiryCheckOwner(p: {
  ownerName: string; propertyName: string; tenantName: string; expiryDate: string; daysUntil: number;
  agentName?: string; agentAgency?: string; formUrl?: string;
}): string {
  const when = p.daysUntil > 0
    ? `in ${p.daysUntil} day${p.daysUntil === 1 ? "" : "s"}`
    : p.daysUntil === 0 ? "today"
    : `${Math.abs(p.daysUntil)} day${p.daysUntil === -1 ? "" : "s"} ago`;
  const agentLine = p.agentName
    ? `I'm ${p.agentName}${p.agentAgency ? ` from ${p.agentAgency}` : ""}. `
    : "";
  if (p.formUrl) {
    return `Hi ${p.ownerName}! ${agentLine}The tenancy at *${p.propertyName}* with ${p.tenantName} is expiring ${when}. Just tap the link to let me know if you'd like to continue renting it out:

${p.formUrl}

No login needed 🙏`;
  }
  return `Hi ${p.ownerName}! ${agentLine}The tenancy at *${p.propertyName}* with ${p.tenantName} expires ${when} (${p.expiryDate}). Would you like to continue renting it out? Reply YES to renew or NO to end the listing 🙏`;
}

// ─── Backwards-compatible shims (kept for existing call sites) ───────────────

export function buildWhatsAppPingUrl(
  tenantPhone: string,
  tenantName: string,
  propertyName: string,
  amount: number,
  uploadUrl: string
): string {
  return buildOutbound({
    template: "rent_reminder",
    toPhone: tenantPhone,
    body: templateRentReminder({ tenantName, propertyName, amount, uploadUrl }),
  }).url;
}

export function buildWhatsAppForwardUrl(
  ownerPhone: string,
  tenantName: string,
  propertyName: string,
  amount: number,
  receiptUrl: string
): string {
  return buildOutbound({
    template: "forward_receipt_to_owner",
    toPhone: ownerPhone,
    body: templateForwardReceiptToOwner({ tenantName, propertyName, amount, receiptUrl }),
  }).url;
}
