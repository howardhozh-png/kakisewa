"use server";

import { revalidatePath, revalidateTag as _revalidateTag } from "next/cache";

// Next.js 16 changed revalidateTag to require a profile arg; cast to old signature
// since unstable_cache tags don't use profiles.
const revalidateTag = _revalidateTag as unknown as (tag: string) => void;

function invalidateCache() {
  revalidateTag("kk-owner-leads");
  revalidateTag("kk-tenancies");
  revalidateTag("kk-tenant-profiles");
  revalidateTag("kk-supports");
}
import { format } from "date-fns";
import { checkRenewalCardCap } from "./plan-caps";
import {
  createTenancy,
  updateTenancy,
  deleteTenancy,
  getTenancy,
  logWhatsApp,
  getAgentProfile,
  updateAgentProfile,
  createOwnerLead,
  bulkCreateOwnerLeads,
  getOwnerLeads,
  updateOwnerLead,
  getOwnerLead,
  deleteOwnerLead,
  createTenantProfile,
  getTenantProfileByPhone,
  getTenantProfileByPhoneAndName,
  updateTenantProfile,
  deleteTenantProfile,
  getOrCreateMatchPack,
  addTenantToPack,
  removeTenantFromPack,
  setOwnerRanking,
  generateOwnerIntakeToken,
  incrementOwnerOutreachCount,
  generateTenantRenewalToken,
  generateOwnerRenewalToken,
  clearRenewalData,
  createTenantIntakeSession,
  deleteTenantIntakeSession,
  recordCommissionEvent,
  createPropertySupport,
  updatePropertySupport,
  deletePropertySupport,
  bumpLoginStreak,
  saveWhatsAppTemplates,
} from "./db";
import { getAgentId } from "./auth";
import { verifyReceiptImage } from "./ai-verify";
import { Tenancy, WhatsAppTemplate, daysUntil, ReplyState, LifecycleStage, SupportType } from "./types";
import { buildLhdnXml } from "./lhdn";
import {
  buildOutbound,
  templateExpiryCheckTenant,
  templateExpiryCheckOwner,
} from "./whatsapp";
import { plansForStage } from "./lifecycle-templates";
import { resolveTemplate, parseTemplateOverrides, type TemplateOverrides } from "./whatsapp-templates";
import { getBaseUrl } from "./origin";

function parseFlexDate(s: string): string | null {
  if (!s) return null;
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
  if (s.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const [d, m, y] = s.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

// ─── Tenancies ────────────────────────────────────────────────────────────────

export async function addTenancy(formData: FormData): Promise<{ ok: boolean; id?: string; reason?: string; current_plan?: string; current_count?: number; current_cap?: number; upgrade_to?: string; upgrade_cap?: number | null; nearest_expiry_days?: number | null }> {
  let ownerLeadId = (formData.get("owner_lead_id") as string) || null;
  const propertyNameFromForm = (formData.get("property_name") as string)?.trim() || null;
  const ownerNameFromForm    = (formData.get("owner_name") as string)?.trim() || "";
  const ownerPhoneFromForm   = (formData.get("owner_phone") as string)?.trim() || "";
  const photoUrls: string[] = [];
  for (let i = 0; i < 4; i++) {
    const u = (formData.get(`photo_url_${i}`) as string) || "";
    if (u) photoUrls.push(u);
  }
  const agreementUrl = (formData.get("agreement_url") as string) || null;

  // If no existing owner_lead selected but a property name was typed, create one on the fly
  if (!ownerLeadId && propertyNameFromForm) {
    const { createOwnerLead } = await import("@/lib/db");
    const newLead = await createOwnerLead({
      owner_name: ownerNameFromForm,
      owner_phone: ownerPhoneFromForm,
      property_name: propertyNameFromForm,
      stage: "matched",
      is_managed: true,
      photo_urls: [],
    } as Parameters<typeof createOwnerLead>[0]);
    ownerLeadId = newLead.id;
  }

  // Mark the owner_lead as managed when creating the tenancy
  if (ownerLeadId) {
    await (await import("@/lib/db")).updateOwnerLead(ownerLeadId, { is_managed: true } as Parameters<typeof import("@/lib/db").updateOwnerLead>[1]);
    if (photoUrls.length > 0) {
      await (await import("@/lib/db")).updateOwnerLeadPhotos(ownerLeadId, photoUrls);
    }
  }

  const contractStart = parseFlexDate((formData.get("contract_start") as string) || "");
  const durationStr   = formData.get("contract_duration_months") as string;
  const durationMonths = durationStr ? parseInt(durationStr, 10) : null;
  let contractEnd: string | null = null;
  if (contractStart && durationMonths) {
    const [y, m, d] = contractStart.split("-").map(Number);
    const end = new Date(y, m - 1 + durationMonths, d);
    contractEnd = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  }

  const cap = await checkRenewalCardCap();
  if (!cap.allowed) return { ok: false, reason: cap.reason, current_plan: cap.current_plan, current_count: cap.current_count, current_cap: cap.current_cap, upgrade_to: cap.upgrade_to, upgrade_cap: cap.upgrade_cap, nearest_expiry_days: cap.nearest_expiry_days };

  const newTenancy = await createTenancy({
    owner_lead_id: ownerLeadId,
    tenant_name: formData.get("tenant_name") as string,
    tenant_phone: formData.get("tenant_phone") as string,
    due_day: parseInt(formData.get("due_day") as string, 10) || 1,
    amount: parseFloat(formData.get("amount") as string),
    current_month_paid: false,
    current_month_receipt_url: null,
    last_paid_month: null,
    last_receipt_url: null,
    lhdn_status: "none",
    status: "Pending",
    contract_start: contractStart,
    contract_end: contractEnd,
    contract_duration_months: durationMonths,
    replied_tenant: "pending",
    replied_owner: "pending",
  });

  if (contractStart) {
    const agent = await getAgentProfile();
    const pct = agent.commission_pct ?? 100;
    recordCommissionEvent({
      tenancy_id: newTenancy.id,
      type: "new_signing",
      amount: Math.round(newTenancy.amount * pct / 100),
      earned_on: contractStart,
    });
  }

  // Create tenant profile if this name+phone combo isn't already in the system
  const tenantPhone = ((formData.get("tenant_phone") as string) || "").trim();
  const tenantNameVal = formData.get("tenant_name") as string;
  if (tenantPhone) {
    const existing = await getTenantProfileByPhoneAndName(tenantPhone, tenantNameVal);
    if (!existing) {
      await createTenantProfile({
        name: tenantNameVal,
        phone: tenantPhone,
        source: "manual",
      });
    }
  }

  if (agreementUrl) {
    await (await import("@/lib/db")).updateTenancy(newTenancy.id, { agreement_url: agreementUrl });
  }

  invalidateCache();
  revalidatePath("/existing-contracts");
  revalidatePath("/tenants");
  revalidatePath("/");
  return { ok: true, id: newTenancy.id };
}

export async function removeTenancy(id: string) {
  // Also delete the linked owner_lead (if it's in "matched" stage — it lives in the Rented column)
  try {
    const tenancy = await getTenancy(id);
    if (tenancy?.owner_lead_id) {
      const lead = await getOwnerLead(tenancy.owner_lead_id);
      if (lead && lead.stage === "matched") {
        await deleteOwnerLead(tenancy.owner_lead_id);
      }
    }
  } catch { /* non-critical */ }
  await deleteTenancy(id);
  invalidateCache();
  revalidatePath("/existing-contracts");
  revalidatePath("/new-owners");
  revalidatePath("/");
}

export async function removeOwnerLead(id: string) {
  await deleteOwnerLead(id);
  invalidateCache();
  revalidatePath("/new-owners");
  revalidatePath("/");
}

export async function bulkDeleteOwnerLeads(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteOwnerLead(id)));
  invalidateCache();
  revalidatePath("/new-owners");
  revalidatePath("/");
}

export async function removeTenantProfile(id: string) {
  await deleteTenantProfile(id);
  invalidateCache();
  revalidatePath("/directory");
  revalidatePath("/");
}

export async function saveAgreementUrl(tenancyId: string, url: string | null): Promise<void> {
  await updateTenancy(tenancyId, { agreement_url: url });
  revalidatePath("/");
}

export async function saveOwnerLeadPhotos(leadId: string, urls: string[]): Promise<void> {
  await updateOwnerLead(leadId, { photo_urls: urls });
  revalidatePath("/");
}

export async function saveOwnerLeadAgreementUrl(leadId: string, url: string | null): Promise<void> {
  await updateOwnerLead(leadId, { agreement_url: url });
  revalidatePath("/");
}

export async function updateTenancyContract(
  id: string,
  data: { contract_start?: string; contract_end?: string; contract_duration_months?: number; amount?: number }
): Promise<{ ok: boolean; message: string }> {
  try {
    const updates: Partial<Tenancy> = {
      contract_start: data.contract_start,
      contract_end: data.contract_end,
      contract_duration_months: data.contract_duration_months,
      amount: data.amount,
    };

    if (data.contract_end) {
      const tenancy = await getTenancy(id);
      if (tenancy) {
        // Don't auto-adjust stages the agent deliberately chose
        const LOCKED = new Set(["renewing", "replacing", "ending", "closed"]);
        if (!LOCKED.has(tenancy.lifecycle_stage ?? "")) {
          const days = Math.round(
            (new Date(data.contract_end).getTime() - new Date().getTime()) / 86400000
          );
          if (days <= 60) {
            // New end date is within expiry window — move to Expiring
            updates.lifecycle_stage = "headsup";
          } else if (["headsup", "pinged", "stalled"].includes(tenancy.lifecycle_stage ?? "")) {
            // Extended past 60 days — clear explicit stage so it auto-computes as Active
            updates.lifecycle_stage = null;
          }
        }
      }
    }

    await updateTenancy(id, updates);
    invalidateCache();
    revalidatePath("/existing-contracts");
    revalidatePath("/");
    return { ok: true, message: "Contract updated" };
  } catch {
    return { ok: false, message: "Could not update contract" };
  }
}

export async function updateTenancyBasicInfo(
  id: string,
  data: { tenant_name?: string; tenant_phone?: string; amount?: number; due_day?: number }
): Promise<{ ok: boolean; message: string }> {
  try {
    await updateTenancy(id, data);
    invalidateCache();
    revalidatePath("/existing-contracts");
    revalidatePath("/");
    return { ok: true, message: "Tenancy updated" };
  } catch {
    return { ok: false, message: "Could not update tenancy" };
  }
}

export async function markReminderSent(id: string) {
  await updateTenancy(id, { status: "Reminder Sent" });
  invalidateCache();
  revalidatePath("/existing-contracts");
  revalidatePath("/");
}

export async function advanceTenancyStatus(id: string, target: Tenancy["status"]) {
  const tenancy = await getTenancy(id);
  if (!tenancy) return { ok: false, message: "Tenancy not found." };

  // Side-effects per target stage
  const updates: Partial<Tenancy> = { status: target };
  if (target === "Verified") {
    updates.current_month_paid = true;
    updates.last_paid_month = format(new Date(), "MMMM yyyy");
  }
  if (target === "Pending") {
    updates.current_month_paid = false;
  }

  await updateTenancy(id, updates);
  invalidateCache();
  revalidatePath("/existing-contracts");
  revalidatePath("/");
  return { ok: true, message: `Moved to ${target}.` };
}

// ─── Action board funnel transitions ─────────────────────────────────────────
// Each call corresponds to a kanban stage advance. Side-effects are
// idempotent and tied to the *current* month only.

import type { ActionStage } from "./types";

export async function setActionStage(id: string, target: ActionStage) {
  const tenancy = await getTenancy(id);
  if (!tenancy) return { ok: false, message: "Tenancy not found." };

  const updates: Partial<Tenancy> = {};

  switch (target) {
    case "owing":
    case "nearing":
      // Reset back to unpaid; clears receipt + forwarded state
      updates.status = "Pending";
      updates.current_month_paid = false;
      updates.current_month_receipt_url = null;
      updates.forwarded_at = null;
      break;
    case "pending_verify":
      // Tenant has paid (manual override) — receipt may not exist yet
      updates.status = "Paid - Pending Verification";
      updates.current_month_paid = false;
      updates.forwarded_at = null;
      break;
    case "awaiting_forward":
      // Verified + paid; not yet sent to owner
      updates.status = "Verified";
      updates.current_month_paid = true;
      updates.last_paid_month = format(new Date(), "MMMM yyyy");
      updates.forwarded_at = null;
      break;
    case "completed":
      // Forwarded to owner this month
      updates.status = "Verified";
      updates.current_month_paid = true;
      updates.last_paid_month = format(new Date(), "MMMM yyyy");
      updates.forwarded_at = new Date().toISOString();
      break;
  }

  await updateTenancy(id, updates);
  invalidateCache();
  revalidatePath("/existing-contracts");
  revalidatePath("/");
  return { ok: true, message: `Moved to ${stageLabel(target)}.` };
}

export async function markForwardedToOwner(id: string) {
  await updateTenancy(id, { forwarded_at: new Date().toISOString() });
  invalidateCache();
  revalidatePath("/existing-contracts");
  revalidatePath("/");
}

// ─── Contract lifecycle pings ────────────────────────────────────────────────

export async function buildExpiryPingTenant(tenancyId: string): Promise<{ url: string; body: string } | null> {
  const [t, agent] = await Promise.all([getTenancy(tenancyId), getAgentProfile()]);
  if (!t || !t.contract_end) return null;
  const days = daysUntil(t.contract_end, new Date());
  const token = await generateTenantRenewalToken(tenancyId);
  const siteUrl = await getBaseUrl();
  const formUrl = `${siteUrl}/rt/${token}?t=${Date.now()}`;
  const firstName = agent.name?.trim().split(/\s+/)[0] ?? undefined;
  const expiryWhen = days > 0
    ? `in ${days} day${days === 1 ? "" : "s"}`
    : days === 0 ? "today"
    : `${Math.abs(days)} day${days === -1 ? "" : "s"} ago`;
  const overrides = parseTemplateOverrides(agent.whatsapp_templates);
  const body = resolveTemplate("expiry_check_tenant", overrides, {
    tenantName: t.tenant_name,
    agentLine: firstName ? `I'm ${firstName}${agent.ren_number ? ` (${agent.ren_number})` : ""}${agent.agency ? ` from ${agent.agency}` : ""}. ` : "",
    propertyName: t.property_name ?? t.owner_lead_id ?? "",
    expiryWhen,
    renewalForm: formUrl,
  });
  const out = buildOutbound({ template: "expiry_check_tenant", toPhone: t.tenant_phone, body });
  await logWhatsApp({
    related_id: t.id,
    related_type: "tenancy",
    template: "expiry_check_tenant",
    recipient_phone: t.tenant_phone,
    recipient_name: t.tenant_name,
    body,
  });
  return { url: out.url, body };
}

// ─── Lifecycle board ──────────────────────────────────────────────────────────

export async function setLifecycleStage(id: string, target: LifecycleStage) {
  const t = await getTenancy(id);
  if (!t) return { ok: false, message: "Tenancy not found." };

  const updates: Partial<Tenancy> = { lifecycle_stage: target };

  // Side-effects per target stage
  if (target === "renewing") {
    updates.replied_tenant = "yes";
    updates.replied_owner = "yes";
  } else if (target === "replacing") {
    updates.replied_owner = "yes";
    if (t.replied_tenant === "pending") updates.replied_tenant = "no";
    // Also auto-create an OwnerLead so the owner appears in /leads at "wants_rent"
    if (t.property?.owner_name && t.property?.owner_phone) {
      await createOwnerLead({
        owner_name: t.property.owner_name,
        owner_phone: t.property.owner_phone,
        property_name: t.property_name ?? null,
        unit: t.property.unit ?? null,
        address: t.property.address ?? null,
        expected_rent: t.amount,
        notes: `Returning landlord — ${t.tenant_name} moving out by ${t.contract_end ?? ""}`,
        source: "auto_replacing",
        stage: "wants_rent",
      });
    }
  } else if (target === "ending") {
    updates.replied_owner = "no";
  } else if (target === "pinged" && t.replied_tenant === "pending" && t.replied_owner === "pending") {
    // Treat the manual move into "pinged" as evidence the agent has contacted both
  }

  await updateTenancy(id, updates);
  invalidateCache();
  revalidatePath("/existing-contracts");
  revalidatePath("/new-owners");
  return { ok: true, message: `Moved to ${target}.` };
}

export async function setReplyChip(
  id: string,
  who: "tenant" | "owner",
  state: ReplyState
) {
  const updates: Partial<Tenancy> = {};
  if (who === "tenant") updates.replied_tenant = state;
  else                  updates.replied_owner  = state;
  await updateTenancy(id, updates);
  invalidateCache();
  revalidatePath("/existing-contracts");
  return { ok: true };
}

export async function sendLifecycleTemplate(
  id: string,
  stage: LifecycleStage
): Promise<{ ok: boolean; urls: string[]; message: string }> {
  const t = await getTenancy(id);
  if (!t) return { ok: false, urls: [], message: "Tenancy not found." };
  const agent = await getAgentProfile();
  const plans = plansForStage(stage, { tenancy: t, agent, today: new Date() });
  const urls: string[] = [];
  for (const p of plans) {
    const out = buildOutbound({
      template: stage === "pinged" ? (p.to === "tenant" ? "expiry_check_tenant" : "expiry_check_owner") : "expiry_check_tenant",
      toPhone: p.phone,
      body: p.body,
    });
    urls.push(out.url);
    await logWhatsApp({
      related_id: t.id,
      related_type: "tenancy",
      template: stage === "pinged" ? (p.to === "tenant" ? "expiry_check_tenant" : "expiry_check_owner") : "expiry_check_tenant",
      recipient_phone: p.phone,
      recipient_name: p.to === "tenant" ? t.tenant_name : (t.property?.owner_name ?? "Owner"),
      body: p.body,
    });
  }
  return { ok: true, urls, message: `Prepared ${urls.length} message${urls.length === 1 ? "" : "s"}` };
}

export async function collectRenewalCommission(
  tenancyId: string,
  opts: {
    newContractEnd: string;
    newContractStart?: string | null;
    newRent?: number | null;
  }
): Promise<{ ok: boolean; message: string }> {
  try {
    const tenancy = await getTenancy(tenancyId);
    if (!tenancy) return { ok: false, message: "Tenancy not found." };

    const effectiveRent = opts.newRent ?? tenancy.amount;

    // Compute duration in months if we have both start and end
    let durationMonths: number | undefined;
    if (opts.newContractStart && opts.newContractEnd) {
      const start = new Date(opts.newContractStart);
      const end   = new Date(opts.newContractEnd);
      const diff  = Math.round((end.getTime() - start.getTime()) / (30.44 * 86400000));
      if (diff > 0) durationMonths = diff;
    }

    await updateTenancy(tenancyId, {
      ...(opts.newRent ? { amount: opts.newRent } : {}),
      ...(opts.newContractStart ? { contract_start: opts.newContractStart } : {}),
      ...(durationMonths ? { contract_duration_months: durationMonths } : {}),
      contract_end: opts.newContractEnd,
      lifecycle_stage: null,
      replied_tenant: "pending",
      replied_owner: "pending",
    });

    await clearRenewalData(tenancyId);

    const today = new Date().toISOString().slice(0, 10);
    recordCommissionEvent({
      tenancy_id: tenancyId,
      owner_lead_id: tenancy.owner_lead_id,
      type: "renewal",
      amount: Math.round(effectiveRent * 0.5),
      earned_on: today,
      notes: `Renewal — new end ${opts.newContractEnd}`,
    });

    invalidateCache();
    revalidatePath("/existing-contracts");
    revalidatePath("/performance");
    revalidatePath("/");
    return { ok: true, message: "Commission recorded — tenancy restarted." };
  } catch {
    return { ok: false, message: "Could not update tenancy." };
  }
}

export async function moveTenantLeaving(
  tenancyId: string,
  data: { expectedRent: number; availableFrom: string | null }
): Promise<{ ok: boolean; message: string }> {
  try {
    const t = await getTenancy(tenancyId);
    if (!t) return { ok: false, message: "Tenancy not found." };

    let bedrooms: number | null = null;
    let bathrooms: number | null = null;
    if (t.owner_lead_id) {
      const orig = await getOwnerLead(t.owner_lead_id);
      if (orig) { bedrooms = orig.bedrooms ?? null; bathrooms = orig.bathrooms ?? null; }
    }

    if (t.property?.owner_name && t.property?.owner_phone) {
      await createOwnerLead({
        owner_name: t.property.owner_name,
        owner_phone: t.property.owner_phone,
        property_name: t.property_name ?? null,
        unit: t.property.unit ?? null,
        address: t.property.address ?? null,
        expected_rent: data.expectedRent,
        bedrooms,
        bathrooms,
        available_from: data.availableFrom,
        notes: `Replacement listing — ${t.tenant_name} moving out by ${t.contract_end ?? ""}`,
        source: "auto_replacing",
        stage: "listed",
      });
    }

    await updateTenancy(tenancyId, { lifecycle_stage: "closed", closed_reason: "tenant_leaving" });
    invalidateCache();
    revalidatePath("/existing-contracts");
    revalidatePath("/new-owners");
    revalidatePath("/");
    return { ok: true, message: "New listing created and tenancy archived." };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Could not process tenant leaving." };
  }
}

export async function moveOwnerLeaving(tenancyId: string): Promise<{ ok: boolean; message: string }> {
  try {
    const t = await getTenancy(tenancyId);
    if (!t) return { ok: false, message: "Tenancy not found." };

    if (t.property?.owner_name && t.property?.owner_phone) {
      await createOwnerLead({
        owner_name: t.property.owner_name,
        owner_phone: t.property.owner_phone,
        property_name: t.property_name ?? null,
        unit: t.property.unit ?? null,
        address: t.property.address ?? null,
        expected_rent: null,
        notes: `Owner keeping for own stay — ${t.tenant_name}'s contract ends ${t.contract_end ?? ""}`,
        source: "manual",
        stage: "own_stay",
      });
    }

    // Look up by both phone AND name to avoid updating the wrong profile
    // when multiple tenants share the same phone number (common in test data)
    const tenantProfile = t.tenant_phone
      ? await getTenantProfileByPhoneAndName(t.tenant_phone, t.tenant_name)
      : null;
    if (tenantProfile) {
      await updateTenantProfile(tenantProfile.id, {
        is_seeking: 1,
        seeking_from: t.contract_end ?? null,
        seeking_budget_max: t.amount,
      });
    } else {
      // No profile yet — create one so the tenant appears in All Tenants as seeking
      await createTenantProfile({
        name: t.tenant_name,
        phone: t.tenant_phone || null,
        is_seeking: 1,
        seeking_from: t.contract_end ?? null,
        seeking_budget_max: t.amount,
        pets: 0,
        smoking: 0,
        source: "owner_leaving",
      });
    }

    await updateTenancy(tenancyId, { lifecycle_stage: "closed", closed_reason: "owner_leaving" });
    invalidateCache();
    revalidatePath("/existing-contracts");
    revalidatePath("/new-owners");
    revalidatePath("/tenants");
    revalidatePath("/");
    return { ok: true, message: "Owner lead created, tenant marked as seeking, tenancy archived." };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Could not process owner leaving." };
  }
}

export async function buildExpiryPingOwner(tenancyId: string): Promise<{ url: string; body: string } | null> {
  const [t, agent] = await Promise.all([getTenancy(tenancyId), getAgentProfile()]);
  if (!t || !t.contract_end || !t.property?.owner_phone) return null;
  const days = daysUntil(t.contract_end, new Date());
  const token = await generateOwnerRenewalToken(tenancyId);
  const siteUrl = await getBaseUrl();
  const formUrl = `${siteUrl}/ro/${token}?t=${Date.now()}`;
  const firstName = agent.name?.trim().split(/\s+/)[0] ?? undefined;
  const expiryWhen = days > 0
    ? `in ${days} day${days === 1 ? "" : "s"}`
    : days === 0 ? "today"
    : `${Math.abs(days)} day${days === -1 ? "" : "s"} ago`;
  const overrides = parseTemplateOverrides(agent.whatsapp_templates);
  const body = resolveTemplate("expiry_check_owner", overrides, {
    ownerName: t.property?.owner_name ?? "",
    agentLine: firstName ? `I'm ${firstName}${agent.ren_number ? ` (${agent.ren_number})` : ""}${agent.agency ? ` from ${agent.agency}` : ""}. ` : "",
    propertyName: t.property_name ?? t.owner_lead_id ?? "",
    tenantName: t.tenant_name,
    expiryWhen,
    renewalForm: formUrl,
  });
  const out = buildOutbound({ template: "expiry_check_owner", toPhone: t.property?.owner_phone ?? "", body });
  await logWhatsApp({
    related_id: t.id,
    related_type: "tenancy",
    template: "expiry_check_owner",
    recipient_phone: t.property.owner_phone,
    recipient_name: t.property.owner_name,
    body,
  });
  return { url: out.url, body };
}

// ─── Owner leads ─────────────────────────────────────────────────────────────

// Bulk export: returns owner rows with per-owner intake links + a WA-sender-ready template.
// Does NOT log outreach or increment send counts.
export async function bulkExportOwnerLeads(leadIds: string[]): Promise<{
  ok: boolean;
  rows: Array<{ name: string; number: string; property: string; unit: string; rent: string; link: string }>;
  template: string;
  samplePackUrl: string;
}> {
  const { getOwnerLead: getLead, getOrCreateOwnerIntakeToken } = await import("./db");
  const agent = await getAgentProfile();
  const firstName = agent.name?.trim().split(/\s+/)[0] ?? "";
  const company = agent.agency ?? "";
  const siteUrl = await getBaseUrl();
  const samplePackUrl = `${siteUrl}/sample-pack`.replace(/^https?:\/\//, "");

  const rows: Array<{ name: string; number: string; property: string; unit: string; rent: string; link: string }> = [];
  for (const id of leadIds) {
    const lead = await getLead(id);
    if (!lead) continue;
    const token = getOrCreateOwnerIntakeToken(id);
    rows.push({
      name: lead.owner_name ?? "",
      number: lead.owner_phone ?? "",
      property: lead.property_name ?? "",
      unit: lead.unit ?? "",
      rent: lead.expected_rent != null ? String(lead.expected_rent) : "",
      link: `${siteUrl}/o/${token}`,
    });
  }

  // Build WA-sender-ready template — replace dynamic vars with {{Column}} placeholders
  const overrides = parseTemplateOverrides(agent.whatsapp_templates);
  const template = resolveTemplate("owner_intake_form", overrides, {
    firstName,
    ownerName: "{{Name}}",
    renNumber: agent.ren_number ?? "",
    company,
    propertyName: "{{Property}}",
    tenantSamplePack: samplePackUrl,
    listingForm: "{{Link}}",
  });

  return { ok: true, rows, template, samplePackUrl };
}

// Returns the owner's intake form URL without logging a send — for WA-sender tools.
export async function peekOwnerIntakeUrl(ownerLeadId: string): Promise<{ ok: boolean; url: string }> {
  const owner = await getOwnerLead(ownerLeadId);
  if (!owner) return { ok: false, url: "" };
  const { getOrCreateOwnerIntakeToken } = await import("./db");
  const token = getOrCreateOwnerIntakeToken(ownerLeadId);
  const siteUrl = await getBaseUrl();
  return { ok: true, url: `${siteUrl}/o/${token}` };
}

export async function setOwnerLeadStage(id: string, stage: import("./types").OwnerLead["stage"]) {
  await updateOwnerLead(id, { stage });
  invalidateCache();
  revalidatePath("/new-owners");
  return { ok: true, message: `Moved to ${stage.replace("_", " ")}.` };
}

export async function bulkSetOwnerLeadStage(ids: string[], stage: import("./types").OwnerLead["stage"]) {
  for (const id of ids) {
    await updateOwnerLead(id, { stage });
  }
  invalidateCache();
  revalidatePath("/new-owners");
  return { ok: true };
}

export async function bulkMarkOwnerLeadsContacted(ids: string[]) {
  const leads = await Promise.all(ids.map((id) => getOwnerLead(id)));
  const now = new Date().toISOString();
  for (const lead of leads) {
    if (!lead || (lead.outreach_count ?? 0) > 0) continue;
    await incrementOwnerOutreachCount(lead.id);
    await updateOwnerLead(lead.id, { intake_sent_at: now });
  }
  invalidateCache();
  revalidatePath("/new-owners");
  return { ok: true };
}

export async function convertLeadToTenancy(
  ownerLeadId: string,
  data: {
    tenant_name: string;
    tenant_phone: string;
    due_day: number;
    amount: number;
    contract_start: string;
    contract_duration_months: number;
  }
): Promise<{ ok: boolean; message: string; current_plan?: string; current_count?: number; current_cap?: number; upgrade_to?: string; upgrade_cap?: number | null; nearest_expiry_days?: number | null }> {
  try {
    const lead = await getOwnerLead(ownerLeadId);
    if (!lead) return { ok: false, message: "Owner lead not found." };

    const isoStart = parseFlexDate(data.contract_start) ?? data.contract_start;
    const [y, m, d] = isoStart.split("-").map(Number);
    const end = new Date(y, m - 1 + data.contract_duration_months, d);
    const contractEnd = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;

    const cap = await checkRenewalCardCap();
    if (!cap.allowed) return { ok: false, message: cap.reason, current_plan: cap.current_plan, current_count: cap.current_count, current_cap: cap.current_cap, upgrade_to: cap.upgrade_to, upgrade_cap: cap.upgrade_cap, nearest_expiry_days: cap.nearest_expiry_days };

    const signedTenancy = await createTenancy({
      owner_lead_id: ownerLeadId,
      tenant_name: data.tenant_name,
      tenant_phone: data.tenant_phone,
      due_day: data.due_day,
      amount: data.amount,
      current_month_paid: false,
      current_month_receipt_url: null,
      last_paid_month: null,
      last_receipt_url: null,
      lhdn_status: "none",
      status: "Pending",
      contract_start: isoStart,
      contract_end: contractEnd,
      contract_duration_months: data.contract_duration_months,
      replied_tenant: "pending",
      replied_owner: "pending",
    });

    const agent = await getAgentProfile();
    const commissionOverride = lead.commission_override_rm ?? null;
    recordCommissionEvent({
      tenancy_id: signedTenancy.id,
      owner_lead_id: ownerLeadId,
      type: "new_signing",
      amount: commissionOverride ?? Math.round(data.amount * (agent.commission_pct ?? 100) / 100),
      earned_on: isoStart,
      notes: commissionOverride ? "override applied" : null,
    });

    await updateOwnerLead(ownerLeadId, { stage: "matched", is_managed: true });

    invalidateCache();
    revalidatePath("/new-owners");
    revalidatePath("/existing-contracts");
    revalidatePath("/");
    return { ok: true, message: "Tenancy created and lead marked as Matched." };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Could not create tenancy." };
  }
}

// ─── Matching ────────────────────────────────────────────────────────────────

export async function ensurePackForOwner(ownerLeadId: string) {
  const pack = await getOrCreateMatchPack(ownerLeadId);
  return { ok: true, pack };
}

export async function quickAddTenantToPack(
  packId: string,
  data: Omit<import("./types").TenantProfile, "id" | "created_at">
) {
  try {
    const tenant = await createTenantProfile(data);
    await addTenantToPack(packId, tenant.id);
    revalidatePath("/matching");
    return { ok: true as const, tenant };
  } catch (err) {
    console.error("[quickAddTenantToPack] error:", err);
    const msg = err instanceof Error ? err.message : ((err as { message?: string })?.message ?? "Database error");
    return { ok: false as const, message: msg };
  }
}

export async function addExistingTenantToPack(packId: string, tenantId: string) {
  await addTenantToPack(packId, tenantId);
  revalidatePath("/matching");
  return { ok: true };
}

export async function detachTenantFromPack(packId: string, tenantId: string) {
  await removeTenantFromPack(packId, tenantId);
  revalidatePath("/matching");
  return { ok: true };
}

export async function saveOwnerPackRanking(
  packId: string,
  rankings: Array<{ tenant_id: string; rank: number; liked: number; owner_note?: string | null }>
) {
  await setOwnerRanking(packId, rankings);
  revalidatePath("/matching");
  return { ok: true };
}

// Build the WhatsApp message to send the share link to the owner.
export async function buildSendPackToOwner(
  ownerLeadId: string,
  shareUrl: string
): Promise<{ ok: boolean; url: string; body: string; message: string }> {
  const all = await getOwnerLeads();
  const owner = all.find((o) => o.id === ownerLeadId);
  if (!owner) return { ok: false, url: "", body: "", message: "Owner lead not found." };
  const agent = await getAgentProfile();

  const propertyLabel = owner.property_name
    ? owner.unit ? `${owner.property_name}, Unit ${owner.unit}` : `${owner.property_name}`
    : "your property";

  const body = `Hi ${owner.owner_name}! I've shortlisted tenants for ${propertyLabel} 🏠

Open this link, drag the cards to rank them, and tap ❤️ on anyone you'd like to view:
${shareUrl}

No login needed — link is private 🙏
— ${agent.name ?? "Your agent"}${agent.agency ? `, ${agent.agency}` : ""}`;

  const out = buildOutbound({ template: "owner_outreach", toPhone: owner.owner_phone, body });
  await logWhatsApp({
    related_id: ownerLeadId,
    related_type: "owner_lead",
    template: "owner_outreach",
    recipient_phone: owner.owner_phone,
    recipient_name: owner.owner_name,
    body,
  });
  return { ok: true, url: out.url, body, message: "Message ready" };
}

export async function updateOwnerLeadDetails(
  id: string,
  data: Partial<Pick<import("./types").OwnerLead, "owner_name" | "owner_phone" | "property_name" | "unit" | "expected_rent" | "bedrooms" | "bathrooms" | "notes" | "is_renewal" | "commission_override_rm" | "available_from" | "listing_purpose">>
) {
  await updateOwnerLead(id, data);

  // Auto-promote: if the lead is in "wants_rent" and now has all listing
  // essentials (rent + beds + baths), advance it to "listed" automatically.
  const all = await getOwnerLeads();
  const lead = all.find((l) => l.id === id);
  let promoted = false;
  if (lead && lead.stage === "wants_rent"
      && lead.expected_rent != null
      && lead.bedrooms != null
      && lead.bathrooms != null) {
    await updateOwnerLead(id, { stage: "listed" });
    promoted = true;
  }

  invalidateCache();
  revalidatePath("/new-owners");
  revalidatePath("/matching");
  return {
    ok: true,
    promoted,
    message: promoted ? "Details captured — moved to Listed." : "Details updated.",
  };
}

export async function sendOwnerOutreach(
  id: string,
  template: "outreach_initial" | "outreach_followup" | "collect_details"
): Promise<{ ok: boolean; url: string; message: string }> {
  const all = await getOwnerLeads();
  const owner = all.find((o) => o.id === id);
  if (!owner) return { ok: false, url: "", message: "Owner lead not found." };

  const agent = await getAgentProfile();
  const propertyLabel = owner.property_name
    ? owner.unit ? `${owner.property_name}, Unit ${owner.unit}` : `${owner.property_name}`
    : "your property";
  const overrides = parseTemplateOverrides(agent.whatsapp_templates);

  let body = "";
  if (template === "outreach_initial") {
    body = resolveTemplate("owner_outreach_initial", overrides, {
      ownerName: owner.owner_name,
      agentName: agent.name ?? "Your agent",
      renNumber: agent.ren_number ?? "",
      agencyLine: agent.agency ? ` from ${agent.agency}` : "",
      propertyName: propertyLabel,
    });
  } else if (template === "outreach_followup") {
    body = resolveTemplate("owner_outreach_followup", overrides, {
      ownerName: owner.owner_name,
      agentName: agent.name ?? "Your agent",
      renNumber: agent.ren_number ?? "",
      propertyName: propertyLabel,
    });
  } else {
    body = `Hi ${owner.owner_name}! To get ${propertyLabel} listed, I just need 5 quick details:

1. Expected monthly rent (RM)
2. Number of bedrooms & bathrooms
3. Earliest move-in date
4. Furnished / unfurnished
5. Any tenant preferences (optional)

Reply here or I can send you a quick form — takes about 2 minutes 🙏
— ${agent.name ?? "Your agent"}${agent.agency ? `, ${agent.agency}` : ""}`;
  }

  const out = buildOutbound({ template: "owner_outreach", toPhone: owner.owner_phone, body });
  await logWhatsApp({
    related_id: owner.id,
    related_type: "owner_lead",
    template: "owner_outreach",
    recipient_phone: owner.owner_phone,
    recipient_name: owner.owner_name,
    body,
  });
  if (template === "outreach_initial") {
    await updateOwnerLead(id, { intake_sent_at: new Date().toISOString() });
  }
  invalidateCache();
  revalidatePath("/new-owners");
  return { ok: true, url: out.url, message: "Message ready" };
}

// ─── Agent profile + goals ───────────────────────────────────────────────────

export async function updateAgentGoals(p: {
  monthly_goal_rm?: number | null;
  quarterly_goal_rm?: number | null;
  commission_pct?: number;
}) {
  await updateAgentProfile(p);
  revalidatePath("/performance");
  return { ok: true };
}

export async function saveTodayFocus(text: string) {
  await updateAgentProfile({
    today_focus: text.trim() || null,
    today_focus_updated_at: new Date().toISOString(),
  });
  revalidatePath("/performance");
  return { ok: true };
}

export async function saveTodayChecklist(items: { id: string; text: string; done: boolean }[]) {
  await updateAgentProfile({ today_checklist: JSON.stringify(items) } as Parameters<typeof updateAgentProfile>[0]);
  revalidatePath("/performance");
  return { ok: true };
}

export async function saveProfileDetails(p: { name?: string; phone?: string; agency?: string; ren_number?: string | null; photo_url?: string | null; accent_color?: string | null; motivation_photo_url?: string | null }) {
  await updateAgentProfile(p);
  revalidatePath("/settings/account");
  revalidatePath("/");
  return { ok: true };
}

export async function saveWhatsAppTemplatesAction(overrides: TemplateOverrides): Promise<{ ok: boolean }> {
  await saveWhatsAppTemplates(overrides);
  revalidatePath("/settings/account");
  return { ok: true };
}

// ─── Owner CSV import ────────────────────────────────────────────────────────

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { canonicalise, canonicaliseWithMapping, parseSpreadsheetRows, type ImportRow, type ColumnMapping } from "./csv-import";

export interface ImportResult {
  ok: boolean;
  imported: number;
  skipped: number;
  errors: ImportRow[];   // rows we couldn't import (with error messages)
  total: number;
  message: string;
}

export async function importOwnerCsv(formData: FormData): Promise<ImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, imported: 0, skipped: 0, errors: [], total: 0, message: "No file uploaded." };
  }
  const isExcel = /\.(xlsx|xls)$/i.test(file.name);
  let rawRows: Record<string, string>[];

  if (isExcel) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows2d = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
    rawRows = parseSpreadsheetRows(rawRows2d).rows;
  } else {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    rawRows = parsed.data;
  }

  const mappingRaw = formData.get("mapping");
  const mapping: ColumnMapping | null = mappingRaw ? JSON.parse(mappingRaw as string) : null;

  const rows: ImportRow[] = rawRows.map((r, i) =>
    mapping
      ? canonicaliseWithMapping(r, mapping, i + 2)
      : canonicalise(r, i + 2)
  );
  const valid = rows.filter((r) => r.errors.length === 0);
  const invalid = rows.filter((r) => r.errors.length > 0);

  const batch = `batch_${Date.now()}`;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session!.user.id;
  await bulkCreateOwnerLeads(
    valid.map(row => ({
      owner_name: row.owner_name,
      owner_phone: row.owner_phone,
      property_name: row.property_name ?? null,
      unit: row.unit ?? null,
      address: row.address ?? null,
      expected_rent: row.expected_rent ?? null,
      bedrooms: row.bedrooms ?? null,
      bathrooms: row.bathrooms ?? null,
      notes: row.notes ?? null,
      source: "csv" as const,
      import_batch_id: batch,
      stage: "imported" as const,
      available_from: null,
    })),
    userId
  );

  invalidateCache();
  revalidatePath("/new-owners");
  return {
    ok: valid.length > 0,
    imported: valid.length,
    skipped: invalid.length,
    errors: invalid,
    total: rows.length,
    message: valid.length === 0
      ? `No valid rows found (${rows.length} total).`
      : `Imported ${valid.length} owner${valid.length === 1 ? "" : "s"}${invalid.length > 0 ? `; ${invalid.length} skipped` : ""}.`,
  };
}

/**
 * Faster alternative to importOwnerCsv: accepts already-parsed rows from the
 * client so we skip the file re-upload and second server-side parse entirely.
 */
export async function importParsedOwnerLeads(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): Promise<ImportResult> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session!.user.id;

  const parsed: ImportRow[] = rows.map((r, i) => canonicaliseWithMapping(r, mapping, i + 2));
  const valid = parsed.filter((r) => r.errors.length === 0);
  const invalid = parsed.filter((r) => r.errors.length > 0);

  const batch = `batch_${Date.now()}`;
  await bulkCreateOwnerLeads(
    valid.map((row) => ({
      owner_name: row.owner_name,
      owner_phone: row.owner_phone,
      property_name: row.property_name ?? null,
      unit: row.unit ?? null,
      address: row.address ?? null,
      expected_rent: row.expected_rent ?? null,
      bedrooms: row.bedrooms ?? null,
      bathrooms: row.bathrooms ?? null,
      notes: row.notes ?? null,
      source: "csv" as const,
      import_batch_id: batch,
      stage: "imported" as const,
      available_from: null,
    })),
    userId
  );

  invalidateCache();
  revalidatePath("/new-owners");
  return {
    ok: valid.length > 0,
    imported: valid.length,
    skipped: invalid.length,
    errors: invalid,
    total: rows.length,
    message: valid.length === 0
      ? `No valid rows found (${rows.length} total).`
      : `Imported ${valid.length} owner${valid.length === 1 ? "" : "s"}${invalid.length > 0 ? `; ${invalid.length} skipped` : ""}.`,
  };
}

// ─── Intake form links ────────────────────────────────────────────────────────

export async function generateOwnerIntakeLink(ownerLeadId: string): Promise<{ ok: boolean; url: string; waUrl: string; message: string }> {
  const owner = await getOwnerLead(ownerLeadId);
  if (!owner) return { ok: false, url: "", waUrl: "", message: "Owner lead not found." };

  const token = await generateOwnerIntakeToken(ownerLeadId);
  const siteUrl = await getBaseUrl();
  const url = `${siteUrl}/o/${token}`;
  const agent = await getAgentProfile();

  // First outreach uses property name only — no unit — keeps message concise
  const propertyLabel = owner.property_name ?? "your property";

  const firstName = agent.name?.trim().split(/\s+/)[0] ?? "Your agent";
  const overrides = parseTemplateOverrides(agent.whatsapp_templates);
  const short = (u: string) => u.replace(/^https?:\/\//, "");
  const body = resolveTemplate("owner_intake_form", overrides, {
    firstName,
    ownerName: owner.owner_name ?? "",
    renNumber: agent.ren_number ?? "",
    company: agent.agency ?? "",
    propertyName: propertyLabel,
    tenantSamplePack: short(`${siteUrl}/s/${token}`),
    listingForm: short(url),
  });

  const { buildOutbound } = await import("./whatsapp");
  const out = buildOutbound({ template: "owner_outreach", toPhone: owner.owner_phone, body });
  await logWhatsApp({
    related_id: ownerLeadId,
    related_type: "owner_lead",
    template: "owner_outreach",
    recipient_phone: owner.owner_phone,
    recipient_name: owner.owner_name,
    body,
  });
  await incrementOwnerOutreachCount(ownerLeadId);
  revalidatePath("/new-owners");
  return { ok: true, url, waUrl: out.url, message: "Intake form link ready" };
}

export async function bulkGenerateOwnerIntakeLinks(
  ownerLeadIds: string[]
): Promise<Array<{ id: string; ownerName: string; waUrl: string; ok: boolean }>> {
  const results = await Promise.all(ownerLeadIds.map(async (id) => {
    const res = await generateOwnerIntakeLink(id);
    const all = await getOwnerLeads();
    const owner = all.find((o) => o.id === id);
    return { id, ownerName: owner?.owner_name ?? id, waUrl: res.waUrl, ok: res.ok };
  }));
  return results;
}

export async function removeInterestedTenant(token: string, ownerLeadId: string): Promise<{ ok: boolean }> {
  await deleteTenantIntakeSession(token);
  revalidatePath(`/matching/${ownerLeadId}`);
  return { ok: true };
}

export async function addInterestedTenantToListing(
  name: string,
  phone: string,
  ownerLeadId: string
): Promise<{ ok: boolean; token?: string; waUrl: string; message: string }> {
  const agentId = await getAgentId();
  const [token, lead, agent] = await Promise.all([
    createTenantIntakeSession(agentId, { name, phone, ownerLeadId }),
    getOwnerLead(ownerLeadId),
    getAgentProfile(),
  ]);
  const siteUrl = await getBaseUrl();
  const url = `${siteUrl}/t/${token}`;
  const propertyName = lead?.property_name ?? "the property";

  const body = `Hi ${name}! I'm ${agent.name ?? "your agent"} from ${agent.agency ?? "kakisewa"}.

Thanks for your interest in ${propertyName}! Please answer 10 quick questions so I can confirm it's the right fit for you:
${url}

Takes about 1 minute. No login needed 🙏`;

  const out = buildOutbound({ template: "tenant_intake", toPhone: phone, body });
  revalidatePath(`/matching/${ownerLeadId}`);
  return { ok: true, token, waUrl: out.url, message: "WhatsApp ready to send" };
}

export async function generateTenantIntakeLink(): Promise<{ ok: boolean; url: string; waUrl: string; message: string }> {
  const token = await createTenantIntakeSession(await getAgentId(), {});
  const siteUrl = await getBaseUrl();
  const url = `${siteUrl}/t/${token}`;

  const { buildOutbound } = await import("./whatsapp");
  const agent = await getAgentProfile();
  const body = `Hi! ${agent.name ?? "Your agent"} from ${agent.agency ?? "kakisewa"} would love to help you find your next home in Malaysia.

Please take 2 minutes to fill in this form so we can match you with the right property:

${url}

No login needed — the link is private.`;

  const out = buildOutbound({ template: "tenant_intake", toPhone: "", body });
  return { ok: true, url, waUrl: out.url, message: "Tenant intake form link ready" };
}

// ─── Manual lead / tenant creation ───────────────────────────────────────────

export async function addOwnerLeadAction(data: {
  owner_name: string;
  owner_phone: string;
  property_name: string | null;
  unit: string | null;
  expected_rent: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  notes?: string | null;
  available_from?: string | null;
  listing_purpose?: "rent" | "sell" | null;
}): Promise<{ ok: boolean; id?: string; message?: string }> {
  const { createOwnerLead } = await import("@/lib/db");
  try {
    const lead = await createOwnerLead({
      owner_name: data.owner_name,
      owner_phone: data.owner_phone,
      property_name: data.property_name,
      unit: data.unit,
      address: null,
      expected_rent: data.expected_rent,
      bedrooms: data.bedrooms ?? null,
      bathrooms: data.bathrooms ?? null,
      notes: data.notes ?? null,
      source: "manual",
      import_batch_id: null,
      stage: "imported",
      intake_token: null,
      intake_sent_at: null,
      intake_completed_at: null,
      available_from: data.available_from ?? null,
      tenant_preferences: null,
      listing_purpose: data.listing_purpose ?? null,
    });
    invalidateCache();
    revalidatePath("/new-owners");
    return { ok: true, id: lead.id };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

export async function addTenantProfileAction(data: {
  name: string;
  phone: string | null;
  occupation: string | null;
  monthly_income: number | null;
  budget_max: number | null;
  bedrooms_pref: number | null;
  preferred_move_in: string | null;
  notes: string | null;
}): Promise<{ ok: boolean; id?: string; message?: string }> {
  const { createTenantProfile } = await import("@/lib/db");
  try {
    const profile = await createTenantProfile({
      name: data.name,
      phone: data.phone,
      occupation: data.occupation,
      monthly_income: data.monthly_income,
      budget_max: data.budget_max,
      bedrooms_pref: data.bedrooms_pref,
      preferred_move_in: data.preferred_move_in,
      notes: data.notes,
      source: "manual",
      age: null,
      employer: null,
      nationality: null,
      occupants: null,
      pets: 0,
      smoking: 0,
      budget_min: null,
      bathrooms_pref: null,
      intake_token: null,
      intake_completed_at: null,
      available_from: null,
    });
    invalidateCache();
    revalidatePath("/tenants");
    return { ok: true, id: profile.id };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

export async function updateTenantProfileAction(
  id: string,
  data: Partial<Omit<import("./types").TenantProfile, "id" | "created_at">>
): Promise<{ ok: boolean; message?: string }> {
  const { updateTenantProfile } = await import("@/lib/db");
  try {
    await updateTenantProfile(id, data);
    invalidateCache();
    revalidatePath("/tenants");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

function stageLabel(s: ActionStage): string {
  return ({
    owing: "Owing",
    nearing: "Due soon",
    pending_verify: "Pending verify",
    awaiting_forward: "Awaiting forward",
    completed: "Completed",
  } as Record<ActionStage, string>)[s];
}

// ─── Receipt Upload (called from public upload portal) ───────────────────────

export async function submitReceiptUpload(
  tenancyId: string,
  imageUrl: string
): Promise<{ ok: boolean; message: string }> {
  const tenancy = await getTenancy(tenancyId);
  if (!tenancy) return { ok: false, message: "Tenancy not found." };

  await updateTenancy(tenancyId, {
    current_month_receipt_url: imageUrl,
    status: "Paid - Pending Verification",
  });

  invalidateCache();
  revalidatePath("/existing-contracts");
  revalidatePath("/");
  return { ok: true, message: "Receipt received. Your agent will verify it shortly." };
}

// ─── AI Verification ─────────────────────────────────────────────────────────

export async function runAiVerification(
  tenancyId: string
): Promise<{ ok: boolean; result?: ReturnType<typeof verifyReceiptImage> extends Promise<infer T> ? T : never; message: string }> {
  const tenancy = await getTenancy(tenancyId);
  if (!tenancy) return { ok: false, message: "Tenancy not found." };
  if (!tenancy.current_month_receipt_url)
    return { ok: false, message: "No receipt uploaded yet." };

  const result = await verifyReceiptImage(
    tenancy.current_month_receipt_url,
    tenancy.amount
  );

  if (result.success && result.confidence >= 70) {
    await updateTenancy(tenancyId, {
      current_month_paid: true,
      status: "Verified",
      last_paid_month: format(new Date(), "MMMM yyyy"),
    });
    invalidateCache();
    revalidatePath("/existing-contracts");
    revalidatePath("/");
  }

  return { ok: true, result, message: result.notes };
}

// ─── LHDN e-Invois ────────────────────────────────────────────────────────────

export async function generateLhdn(
  tenancyId: string
): Promise<{ ok: boolean; xml: string; message: string }> {
  const tenancy = await getTenancy(tenancyId);
  if (!tenancy) return { ok: false, xml: "", message: "Tenancy not found." };

  const xml = buildLhdnXml({
    tenancyId,
    tenantName: tenancy.tenant_name,
    tenantPhone: tenancy.tenant_phone,
    propertyName: tenancy.property_name ?? tenancy.owner_lead_id ?? "",
    amount: tenancy.amount,
    month: format(new Date(), "MMMM yyyy"),
  });

  await updateTenancy(tenancyId, { lhdn_status: "generated" });
  invalidateCache();
  revalidatePath("/existing-contracts");
  revalidatePath("/");

  return { ok: true, xml, message: "e-Invois generated." };
}

// ─── Commission collection ────────────────────────────────────────────────────

export async function markCommissionCollected(
  tenancyId: string
): Promise<{ ok: boolean; message?: string; cap_reached?: { current_plan: string; upgrade_to: string; current_cap: number; upgrade_cap: number | null } }> {
  "use server";
  try {
    // Check contract cap before moving to active
    const capCheck = await checkRenewalCardCap();
    if (!capCheck.allowed) {
      return {
        ok: false,
        message: "cap_reached",
        cap_reached: {
          current_plan: capCheck.current_plan,
          upgrade_to: capCheck.upgrade_to,
          current_cap: capCheck.current_cap,
          upgrade_cap: capCheck.upgrade_cap ?? null,
        },
      };
    }

    const tenancy = await getTenancy(tenancyId);
    if (tenancy?.owner_lead_id) {
      const lead = await getOwnerLead(tenancy.owner_lead_id);
      if (lead) {
        const isRenewal = !!lead.is_renewal;
        const amount =
          lead.commission_override_rm ??
          Math.round((lead.expected_rent ?? tenancy.amount) * (isRenewal ? 0.5 : 1));
        const today = new Date().toISOString().slice(0, 10);
        recordCommissionEvent({
          tenancy_id: tenancyId,
          owner_lead_id: tenancy.owner_lead_id,
          type: isRenewal ? "renewal" : "new_signing",
          amount,
          earned_on: today,
        });
      }
    }
    await updateTenancy(tenancyId, { lifecycle_stage: "active" });
    invalidateCache();
    revalidatePath("/new-owners");
    revalidatePath("/existing-contracts");
    revalidatePath("/");
    revalidatePath("/performance");
    return { ok: true };
  } catch {
    return { ok: false, message: "Could not mark commission collected." };
  }
}

// ─── Property Supports ────────────────────────────────────────────────────────

export async function savePropertySupport(data: {
  id?: string;
  name: string;
  phone: string;
  type: SupportType;
  area?: string | null;
  notes?: string | null;
  starred?: number;
}): Promise<{ ok: boolean }> {
  "use server";
  try {
    if (data.id) {
      updatePropertySupport(data.id, {
        name: data.name, phone: data.phone, type: data.type,
        area: data.area ?? null, notes: data.notes ?? null,
        starred: data.starred,
      });
    } else {
      createPropertySupport({
        name: data.name, phone: data.phone, type: data.type,
        area: data.area ?? null, notes: data.notes ?? null,
        starred: data.starred ?? 0,
      });
    }
    invalidateCache();
    revalidatePath("/supports");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function toggleSupportStar(id: string, starred: number): Promise<{ ok: boolean }> {
  "use server";
  try {
    updatePropertySupport(id, { starred });
    invalidateCache();
    revalidatePath("/supports");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function removeSupportContact(id: string): Promise<{ ok: boolean }> {
  "use server";
  try {
    deletePropertySupport(id);
    invalidateCache();
    revalidatePath("/supports");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function bumpStreak(): Promise<{ streak: number }> {
  const streak = await bumpLoginStreak();
  revalidatePath("/", "layout");
  return { streak };
}

export async function adminResetMyAccount(): Promise<{ ok: boolean }> {
  const { createClient } = await import("@/lib/supabase/server");
  const { createServiceClient } = await import("@/lib/supabase/service");
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false };

  const svc = createServiceClient();
  await Promise.all([
    svc.from("owner_leads").delete().eq("user_id", uid),
    svc.from("tenancies").delete().eq("user_id", uid),
    svc.from("tenant_profiles").delete().eq("user_id", uid),
  ]);
  await svc.from("agent_profiles").update({
    login_streak: 0,
    longest_streak: 0,
    last_login_date: null,
    trial_started_at: new Date().toISOString(),
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  }).eq("id", uid);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function clearTrialDowngradeNotice(): Promise<void> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("agent_profiles")
    .update({ trial_downgrade_archived_count: null })
    .eq("id", user.id);
  revalidatePath("/", "layout");
}
