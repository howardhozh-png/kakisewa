import { createServiceClient } from "@/lib/supabase/service";

const FROM = "kakisewa <noreply@kakisewa.com>";

const EMAIL_BASE = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
  <p style="font-size:22px;font-weight:700;letter-spacing:-0.02em;margin:0 0 24px">kakisewa</p>`;

const EMAIL_FOOTER = `<p style="font-size:12px;color:#AEAEB2;margin:24px 0 0">
    Manage notification preferences in your kakisewa account settings.
  </p>
</div>`;

function cta(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#1C1C1E;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none">${label}</a>`;
}

function detail(text: string): string {
  return `<p style="font-size:13px;color:#6C6C70;margin:0 0 6px">${text}</p>`;
}

function action(text: string): string {
  return `<p style="font-size:14px;color:#1C1C1E;margin:0 0 20px">${text}</p>`;
}

// ── Core send helper ──────────────────────────────────────────────────────────

export async function sendAgentEmail(
  userId: string,
  subject: string,
  html: string
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const svc = createServiceClient();

  const [prefsRes, userRes] = await Promise.all([
    svc.from("agent_profiles").select("notif_email").eq("id", userId).maybeSingle(),
    svc.auth.admin.getUserById(userId),
  ]);

  if (prefsRes.data?.notif_email === false) return;
  const email = userRes.data?.user?.email;
  if (!email) return;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [email], subject, html }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[email] Resend error", res.status, JSON.stringify(err));
  }
}

// ── Pre-built email bodies for each event ─────────────────────────────────────

export function ownerIntakeEmail(p: {
  ownerName: string;
  propLabel: string;
  url: string;
}): string {
  return (
    EMAIL_BASE +
    `<h1 style="font-size:18px;font-weight:600;margin:0 0 12px">${p.ownerName} filled in property details</h1>` +
    detail(p.propLabel) +
    `<div style="margin:20px 0">` + action("Review the details and move this lead forward in My listing.") + `</div>` +
    cta("Open in My listing", p.url) +
    EMAIL_FOOTER
  );
}

export function tenantProfileEmail(p: {
  tenantName: string;
  url: string;
}): string {
  return (
    EMAIL_BASE +
    `<h1 style="font-size:18px;font-weight:600;margin:0 0 12px">${p.tenantName} submitted their profile</h1>` +
    `<div style="margin:20px 0">` + action("Review their property preferences and match them to a suitable listing.") + `</div>` +
    cta("View in Tenant directory", p.url) +
    EMAIL_FOOTER
  );
}

export function tenantRenewalEmail(p: {
  tenantName: string;
  staying: boolean;
  propLabel: string;
  contractEnd: string | null;
  url: string;
}): string {
  const heading = p.staying
    ? `${p.tenantName} confirmed renewal`
    : `${p.tenantName} is not renewing`;
  const actionText = p.staying
    ? "Great news! Prepare the new tenancy agreement and update the contract end date."
    : "Start listing this property to find a replacement tenant before the contract ends.";
  return (
    EMAIL_BASE +
    `<h1 style="font-size:18px;font-weight:600;margin:0 0 12px">${heading}</h1>` +
    detail(p.propLabel) +
    (p.contractEnd ? detail(`Contract end: ${p.contractEnd}`) : "") +
    `<div style="margin:20px 0">` + action(actionText) + `</div>` +
    cta("Open in Existing listing", p.url) +
    EMAIL_FOOTER
  );
}

export function waReplyTenantEmail(p: {
  tenantName: string;
  intent: "yes" | "no";
  propLabel: string | null;
  url: string;
}): string {
  const heading = p.intent === "yes"
    ? `${p.tenantName} confirmed renewal on WhatsApp`
    : `${p.tenantName} is not renewing (WhatsApp reply)`;
  const actionText = p.intent === "yes"
    ? "Prepare the renewal agreement and update the contract in Existing listing."
    : "Start finding a replacement tenant before the contract ends.";
  return (
    EMAIL_BASE +
    `<h1 style="font-size:18px;font-weight:600;margin:0 0 12px">${heading}</h1>` +
    (p.propLabel ? detail(p.propLabel) : "") +
    `<div style="margin:20px 0">` + action(actionText) + `</div>` +
    cta("Open in Existing listing", p.url) +
    EMAIL_FOOTER
  );
}

export function waReplyOwnerEmail(p: {
  ownerName: string;
  intent: "yes" | "no";
  propLabel: string | null;
  url: string;
}): string {
  const heading = p.intent === "yes"
    ? `${p.ownerName} wants to list on WhatsApp`
    : `${p.ownerName} is not interested (WhatsApp reply)`;
  const actionText = p.intent === "yes"
    ? "Move this owner to My listing and send the tenant pack."
    : "Archive this lead or follow up later in Potential listing.";
  return (
    EMAIL_BASE +
    `<h1 style="font-size:18px;font-weight:600;margin:0 0 12px">${heading}</h1>` +
    (p.propLabel ? detail(p.propLabel) : "") +
    `<div style="margin:20px 0">` + action(actionText) + `</div>` +
    cta("Open in Potential listing", p.url) +
    EMAIL_FOOTER
  );
}

export function expiryReminderEmail(p: {
  tenantName: string;
  propLabel: string;
  contractEnd: string;
  whenLabel: string;
  rent: string | null;
  url: string;
}): string {
  const rentLine = p.rent ? detail(`Current rent: ${p.rent}`) : "";
  return (
    EMAIL_BASE +
    `<h1 style="font-size:18px;font-weight:600;margin:0 0 12px">Contract expiring ${p.whenLabel}</h1>` +
    `<p style="font-size:14px;color:#6C6C70;margin:0 0 4px"><strong>${p.tenantName}</strong></p>` +
    detail(p.propLabel) +
    detail(`Contract end: ${p.contractEnd}`) +
    rentLine +
    `<div style="margin:20px 0">` + action(`Send the renewal message to ${p.tenantName} to confirm if they are staying.`) + `</div>` +
    cta("Open in Existing listing", p.url) +
    EMAIL_FOOTER
  );
}

export function ownerRenewalEmail(p: {
  ownerName: string;
  tenantName: string;
  propLabel: string;
  continuing: boolean;
  url: string;
}): string {
  const heading = p.continuing
    ? `${p.ownerName} wants to renew`
    : `${p.ownerName} is not renewing`;
  const actionText = p.continuing
    ? "Update the contract terms and prepare the renewal agreement."
    : "Start listing this property to find a new tenant before the contract ends.";
  return (
    EMAIL_BASE +
    `<h1 style="font-size:18px;font-weight:600;margin:0 0 12px">${heading}</h1>` +
    detail(p.propLabel) +
    detail(`Tenant: ${p.tenantName}`) +
    `<div style="margin:20px 0">` + action(actionText) + `</div>` +
    cta("Open in Existing listing", p.url) +
    EMAIL_FOOTER
  );
}

export function propertyPackRankedEmail(p: {
  tenantName: string;
  url: string;
}): string {
  return (
    EMAIL_BASE +
    `<h1 style="font-size:18px;font-weight:600;margin:0 0 12px">${p.tenantName} ranked your property pack</h1>` +
    `<div style="margin:20px 0">` + action("See which properties they shortlisted and arrange viewings.") + `</div>` +
    cta("View their ranking", p.url) +
    EMAIL_FOOTER
  );
}

export function packRankedEmail(p: {
  propLabel: string;
  url: string;
}): string {
  return (
    EMAIL_BASE +
    `<h1 style="font-size:18px;font-weight:600;margin:0 0 12px">Owner ranked your tenant pack</h1>` +
    detail(p.propLabel) +
    `<div style="margin:20px 0">` + action("Check the rankings and contact the preferred tenant.") + `</div>` +
    cta("View rankings in Potential listing", p.url) +
    EMAIL_FOOTER
  );
}
