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
import { checkRenewalCardCap, checkLeadCap, checkTargetCap, CAP_WARN_THRESHOLD } from "./plan-caps";
import {
  createTenancy,
  updateTenancy,
  deleteTenancy,
  bulkSoftDeleteTenancies,
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
  softDeleteOwnerLeadForce,
  bulkSoftDeleteOwnerLeads,
  restoreOwnerLead,
  hardDeleteOwnerLead,
  bulkHardDeleteOwnerLeads,
  restoreTenancy,
  hardDeleteTenancy,
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
  getOrCreatePropertyShareToken,
  recordCommissionEvent,
  createPropertySupport,
  updatePropertySupport,
  deletePropertySupport,
  bumpLoginStreak,
  saveWhatsAppTemplates,
  markCompetitorRented,
  setCompetitorStage,
  winCompetitorUnit,
  archiveCompetitorLead,
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

export async function addTenancy(formData: FormData): Promise<{ ok: boolean; id?: string; reason?: string; current_plan?: string; current_count?: number; current_cap?: number; upgrade_to?: string; upgrade_cap?: number | null; nearest_expiry_days?: number | null; remaining?: number; low_remaining?: boolean }> {
  let ownerLeadId = (formData.get("owner_lead_id") as string) || null;
  const propertyNameFromForm = (formData.get("property_name") as string)?.trim() || null;
  const ownerNameFromForm    = (formData.get("owner_name") as string)?.trim() || "";
  const ownerPhoneFromForm   = (formData.get("owner_phone") as string)?.trim() || "";
  const ownerWhatsappUsernameFromForm = (formData.get("owner_whatsapp_username") as string)?.trim() || null;
  const tenantWhatsappUsernameFromForm = (formData.get("tenant_whatsapp_username") as string)?.trim() || null;
  const photoUrls: string[] = [];
  for (let i = 0; i < 10; i++) {
    const u = (formData.get(`photo_url_${i}`) as string) || "";
    if (u) photoUrls.push(u);
  }
  const agreementUrl = (formData.get("agreement_url") as string) || null;

  const propertyUnit = (formData.get("property_unit") as string)?.trim() || null;
  const bedroomsRaw = formData.get("bedrooms") as string;
  const bathroomsRaw = formData.get("bathrooms") as string;
  const parkingRaw = (formData.get("parking") as string)?.trim() || null;

  // If no existing owner_lead selected but a property name was typed, create one on the fly
  if (!ownerLeadId && propertyNameFromForm) {
    const { createOwnerLead } = await import("@/lib/db");
    const newLead = await createOwnerLead({
      owner_name: ownerNameFromForm,
      owner_phone: ownerPhoneFromForm,
      owner_whatsapp_username: ownerWhatsappUsernameFromForm,
      property_name: propertyNameFromForm,
      unit: propertyUnit,
      bedrooms: bedroomsRaw !== "" && bedroomsRaw != null ? parseInt(bedroomsRaw, 10) : undefined,
      bathrooms: bathroomsRaw !== "" && bathroomsRaw != null ? parseInt(bathroomsRaw, 10) : undefined,
      parking: parkingRaw ?? undefined,
      stage: "archived",
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
  // contract_end_direct: agent-supplied end date is always the source of truth
  const contractEndDirect = parseFlexDate((formData.get("contract_end_direct") as string) || "");
  let contractEnd: string | null = contractEndDirect || null;
  if (!contractEnd && contractStart && durationMonths) {
    const [y, m, d] = contractStart.split("-").map(Number);
    let end: Date;
    if (d === 1) {
      end = new Date(y, m - 1 + durationMonths, 0);
    } else {
      const anniversary = new Date(y, m - 1 + durationMonths, d);
      end = new Date(anniversary.getTime() - 86400000);
    }
    contractEnd = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  }

  const cap = await checkRenewalCardCap();
  if (!cap.allowed) return { ok: false, reason: cap.reason, current_plan: cap.current_plan, current_count: cap.current_count, current_cap: cap.current_cap, upgrade_to: cap.upgrade_to ?? undefined, upgrade_cap: cap.upgrade_cap, nearest_expiry_days: cap.nearest_expiry_days };

  const newTenancy = await createTenancy({
    owner_lead_id: ownerLeadId,
    tenant_name: formData.get("tenant_name") as string,
    tenant_phone: formData.get("tenant_phone") as string,
    tenant_whatsapp_username: tenantWhatsappUsernameFromForm,
    due_day: parseInt(formData.get("due_day") as string, 10) || 1,
    amount: parseFloat(formData.get("amount") as string),
    current_month_paid: false,
    current_month_receipt_url: null,
    last_paid_month: null,
    last_receipt_url: null,
    lhdn_status: "none",
    status: "Pending",
    lifecycle_stage: "active",
    contract_start: contractStart,
    contract_end: contractEnd,
    contract_duration_months: durationMonths,
    replied_tenant: "pending",
    replied_owner: "pending",
  });

  if (contractStart) {
    const agent = await getAgentProfile();
    const pct = agent.commission_pct ?? 100;
    await recordCommissionEvent({
      tenancy_id: newTenancy.id,
      type: "new_signing",
      amount: Math.round(newTenancy.amount * pct / 100),
      earned_on: contractStart,
    });
  }

  if (agreementUrl) {
    await (await import("@/lib/db")).updateTenancy(newTenancy.id, { agreement_url: agreementUrl });
  }

  // Auto-create a tenant profile so the tenant appears in the directory
  const tenantNameVal = formData.get("tenant_name") as string | null;
  const tenantPhoneVal = formData.get("tenant_phone") as string | null;
  if (tenantNameVal?.trim()) {
    await (await import("@/lib/db")).ensureTenantProfile(tenantNameVal, tenantPhoneVal);
  }

  invalidateCache();
  revalidatePath("/existing-listing");
  revalidatePath("/directory");
  revalidatePath("/");
  const capAfter = await checkRenewalCardCap();
  const remaining = capAfter.allowed ? capAfter.remaining : 0;
  return { ok: true, id: newTenancy.id, remaining, low_remaining: remaining <= CAP_WARN_THRESHOLD };
}

export async function removeTenancy(id: string) {
  // Soft-delete the linked owner_lead if matched with no other active tenancies
  try {
    const tenancy = await getTenancy(id);
    if (tenancy?.owner_lead_id) {
      const lead = await getOwnerLead(tenancy.owner_lead_id);
      if (lead && lead.stage === "matched") {
        await softDeleteOwnerLeadForce(tenancy.owner_lead_id);
      }
    }
  } catch { /* non-critical */ }
  await deleteTenancy(id);
  invalidateCache();
  revalidatePath("/existing-listing");
  revalidatePath("/property-leads"); revalidatePath("/my-listing");
  revalidatePath("/");
}

export async function bulkRemoveTenancies(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await Promise.all(ids.map(async (id) => {
    try {
      const tenancy = await getTenancy(id);
      if (tenancy?.owner_lead_id) {
        const lead = await getOwnerLead(tenancy.owner_lead_id);
        if (lead && lead.stage === "matched") {
          await softDeleteOwnerLeadForce(tenancy.owner_lead_id);
        }
      }
    } catch { /* non-critical */ }
  }));
  await bulkSoftDeleteTenancies(ids);
  invalidateCache();
  revalidatePath("/existing-listing");
  revalidatePath("/property-leads"); revalidatePath("/my-listing");
  revalidatePath("/");
}

export async function removeOwnerLead(id: string) {
  await deleteOwnerLead(id);
  invalidateCache();
  revalidatePath("/property-leads"); revalidatePath("/my-listing");
  revalidatePath("/");
}

export async function removeOwnerLeadForce(id: string) {
  await softDeleteOwnerLeadForce(id);
  invalidateCache();
  revalidatePath("/my-listing"); revalidatePath("/lost-listing");
  revalidatePath("/");
}

export async function bulkDeleteOwnerLeads(ids: string[]): Promise<void> {
  await bulkSoftDeleteOwnerLeads(ids);
  invalidateCache();
  revalidatePath("/property-leads"); revalidatePath("/my-listing");
  revalidatePath("/");
}

export async function restoreOwnerLeadAction(id: string): Promise<void> {
  await restoreOwnerLead(id);
  invalidateCache();
  revalidatePath("/property-leads");
  revalidatePath("/");
}

export async function hardDeleteOwnerLeadAction(id: string): Promise<void> {
  await hardDeleteOwnerLead(id);
  invalidateCache();
  revalidatePath("/property-leads");
  revalidatePath("/");
}

export async function bulkHardDeleteOwnerLeadsAction(ids: string[]): Promise<void> {
  await bulkHardDeleteOwnerLeads(ids);
  invalidateCache();
  revalidatePath("/property-leads");
  revalidatePath("/");
}

export async function restoreTenancyAction(id: string): Promise<void> {
  await restoreTenancy(id);
  invalidateCache();
  revalidatePath("/existing-listing");
  revalidatePath("/");
}

export async function hardDeleteTenancyAction(id: string): Promise<void> {
  await hardDeleteTenancy(id);
  invalidateCache();
  revalidatePath("/existing-listing");
  revalidatePath("/");
}

export async function assignPropertyNameAction(newName: string): Promise<{ ok: boolean; message?: string }> {
  const trimmed = newName.trim();
  if (!trimmed) return { ok: false, message: "Name cannot be empty" };
  const userId = await getAgentId();
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("owner_leads")
    .update({ property_name: trimmed })
    .eq("user_id", userId)
    .is("property_name", null);
  if (error) return { ok: false, message: error.message };
  invalidateCache();
  revalidatePath("/property-leads");
  revalidatePath("/my-listing");
  revalidatePath("/");
  return { ok: true };
}

export async function renamePropertyGroupAction(oldName: string, newName: string): Promise<{ ok: boolean; message?: string }> {
  const trimmed = newName.trim();
  if (!trimmed) return { ok: false, message: "Name cannot be empty" };
  const userId = await getAgentId();
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("owner_leads")
    .update({ property_name: trimmed })
    .eq("user_id", userId)
    .eq("property_name", oldName);
  if (error) return { ok: false, message: error.message };
  invalidateCache();
  revalidatePath("/property-leads");
  revalidatePath("/my-listing");
  revalidatePath("/");
  return { ok: true };
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
      // When agent saves an explicit duration, clear the owner-proposed value so it no longer overrides display
      ...(data.contract_duration_months !== undefined ? { renewal_proposed_months: null } : {}),
      amount: data.amount,
    };

    let existingTenancy: Tenancy | null = null;
    if (data.contract_end) {
      existingTenancy = await getTenancy(id);
      if (existingTenancy) {
        // Don't auto-adjust stages the agent deliberately chose
        const LOCKED = new Set(["renewing", "replacing", "ending", "closed"]);
        if (!LOCKED.has(existingTenancy.lifecycle_stage ?? "")) {
          const days = Math.round(
            (new Date(data.contract_end).getTime() - new Date().getTime()) / 86400000
          );
          if (days <= 60) {
            updates.lifecycle_stage = "headsup";
          } else if (["headsup", "pinged", "stalled"].includes(existingTenancy.lifecycle_stage ?? "")) {
            updates.lifecycle_stage = null;
          }
        }
      }
    }

    await updateTenancy(id, updates);

    // When contract is extended back outside the 60d window, clear notification log so
    // re-entering the window will re-trigger push and email
    if (updates.lifecycle_stage === null && existingTenancy?.user_id) {
      const { createServiceClient } = await import("@/lib/supabase/service");
      const svc = createServiceClient();
      await svc.from("push_sent_log")
        .delete()
        .eq("user_id", existingTenancy.user_id)
        .like("notification_key", `%${id}%`);
    }

    invalidateCache();
    revalidatePath("/existing-listing");
    revalidatePath("/");

    // Fire immediate expiry notification if the new date is within the 60-day window
    if (data.contract_end && existingTenancy) {
      maybeFireExpiryNotification(id, {
        ...existingTenancy,
        contract_end: data.contract_end,
        amount: data.amount ?? existingTenancy.amount,
      }).catch(() => {});
    }

    return { ok: true, message: "Contract updated" };
  } catch {
    return { ok: false, message: "Could not update contract" };
  }
}

async function maybeFireExpiryNotification(
  tenancyId: string,
  tenancy: Tenancy & { contract_end: string }
): Promise<void> {
  if (!tenancy.user_id) return;
  if (tenancy.replied_tenant === "yes" || tenancy.replied_tenant === "no") return;

  const today = new Date();
  const daysLeft = Math.ceil(
    (new Date(tenancy.contract_end).getTime() - today.getTime()) / 86400000
  );
  if (daysLeft > 60 || daysLeft < 0) return;

  let bucket: string;
  let label: string;
  if (daysLeft <= 7) { bucket = "7d"; label = "7 days"; }
  else if (daysLeft <= 30) { bucket = "30d"; label = "1 month"; }
  else { bucket = "60d"; label = "2 months"; }

  // Email uses its own key so push logging (now shared with the cron sweep) cannot block it
  const emailKey = `email_exp_${tenancyId}_${bucket}`;
  const { createServiceClient } = await import("@/lib/supabase/service");
  const supabase = createServiceClient();

  const propParts = [tenancy.property_name, tenancy.property?.unit ? `Unit ${tenancy.property.unit}` : null].filter(Boolean);
  const propLabel = propParts.join(" · ") || "your property";
  const deepLink = `/existing-listing?highlight=${tenancyId}`;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://kakisewa.com";
  const rent = tenancy.amount ? `RM ${Number(tenancy.amount).toLocaleString()}/month` : null;

  const { data: prefs } = await supabase
    .from("agent_profiles")
    .select("notif_push, notif_email")
    .eq("id", tenancy.user_id)
    .maybeSingle();

  // Push — shared with the daily cron sweep (app/api/cron/push-notifications) so the
  // bucket/dedup/send logic only exists in one place.
  if (prefs?.notif_push !== false) {
    const { notifyTenancyExpiryPush } = await import("@/lib/tenancy-expiry-push");
    await notifyTenancyExpiryPush(
      supabase,
      { id: tenancyId, user_id: tenancy.user_id, tenant_name: tenancy.tenant_name ?? null, contract_end: tenancy.contract_end },
      propLabel
    );
  }

  // Email — uses its own key so push cron cannot block it
  if (prefs?.notif_email !== false) {
    const { data: emailLogged } = await supabase
      .from("push_sent_log")
      .select("id")
      .eq("user_id", tenancy.user_id)
      .eq("notification_key", emailKey)
      .maybeSingle();

    if (!emailLogged) {
      const { sendAgentEmail, expiryReminderEmail } = await import("@/lib/email");
      await sendAgentEmail(
        tenancy.user_id,
        `Contract expiring in ${label} — ${tenancy.tenant_name}`,
        expiryReminderEmail({
          tenantName: tenancy.tenant_name ?? "Tenant",
          propLabel,
          contractEnd: tenancy.contract_end,
          whenLabel: label,
          rent,
          url: `${siteUrl}${deepLink}`,
        })
      );
      await supabase.from("push_sent_log").insert({ user_id: tenancy.user_id, notification_key: emailKey });
    }
  }
}

export async function updateTenancyBasicInfo(
  id: string,
  data: { tenant_name?: string; tenant_phone?: string; tenant_whatsapp_username?: string | null; amount?: number; due_day?: number }
): Promise<{ ok: boolean; message: string }> {
  try {
    await updateTenancy(id, data);
    invalidateCache();
    revalidatePath("/existing-listing");
    revalidatePath("/");
    revalidatePath("/directory"); revalidatePath("/matching");
    return { ok: true, message: "Tenancy updated" };
  } catch {
    return { ok: false, message: "Could not update tenancy" };
  }
}

export async function updateMatchedTenancyDetails(
  tenancyId: string,
  data: {
    tenant_name?: string;
    tenant_phone?: string;
    tenant_whatsapp_username?: string | null;
    amount?: number;
    contract_start?: string;
    contract_duration_months?: number;
  }
): Promise<{ ok: boolean; message: string }> {
  try {
    const updates: Partial<Tenancy> = {};
    if (data.tenant_name !== undefined) updates.tenant_name = data.tenant_name;
    if (data.tenant_phone !== undefined) updates.tenant_phone = data.tenant_phone;
    if (data.tenant_whatsapp_username !== undefined) updates.tenant_whatsapp_username = data.tenant_whatsapp_username;
    if (data.amount !== undefined) updates.amount = data.amount;
    if (data.contract_start && data.contract_duration_months) {
      const [y, m, d] = data.contract_start.split("-").map(Number);
      const end = new Date(y, m - 1 + data.contract_duration_months, d);
      updates.contract_start = data.contract_start;
      updates.contract_end = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
      updates.contract_duration_months = data.contract_duration_months;
    }
    await updateTenancy(tenancyId, updates);
    invalidateCache();
    revalidatePath("/my-listing");
    revalidatePath("/");
    revalidatePath("/existing-listing"); revalidatePath("/property-leads"); revalidatePath("/matching");
    return { ok: true, message: "Tenancy updated." };
  } catch {
    return { ok: false, message: "Could not update tenancy." };
  }
}

export async function markReminderSent(id: string) {
  await updateTenancy(id, { status: "Reminder Sent" });
  invalidateCache();
  revalidatePath("/existing-listing");
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
  revalidatePath("/existing-listing");
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
  revalidatePath("/existing-listing");
  revalidatePath("/");
  return { ok: true, message: `Moved to ${stageLabel(target)}.` };
}

export async function markForwardedToOwner(id: string) {
  await updateTenancy(id, { forwarded_at: new Date().toISOString() });
  invalidateCache();
  revalidatePath("/existing-listing");
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
    tenantName: t.tenant_name ?? "",
    agentLine: firstName ? `I'm ${firstName}${agent.ren_number ? ` (${agent.ren_number})` : ""}${agent.agency ? ` from ${agent.agency}` : ""}. ` : "",
    propertyName: t.property_name ?? t.owner_lead_id ?? "",
    expiryWhen,
    renewalForm: formUrl,
  });
  const out = buildOutbound({ template: "expiry_check_tenant", toPhone: t.tenant_phone ?? "", toUsername: t.tenant_whatsapp_username, body });
  await Promise.all([
    logWhatsApp({
      related_id: t.id,
      related_type: "tenancy",
      template: "expiry_check_tenant",
      recipient_phone: t.tenant_phone ?? "",
      recipient_name: t.tenant_name ?? "",
      body,
    }),
    updateTenancy(tenancyId, { wa_status: "pending" }),
  ]);
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
  revalidatePath("/existing-listing");
  revalidatePath("/property-leads"); revalidatePath("/my-listing");
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
  revalidatePath("/existing-listing");
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
      toUsername: p.username,
      body: p.body,
    });
    urls.push(out.url);
    await Promise.all([
      logWhatsApp({
        related_id: t.id,
        related_type: "tenancy",
        template: stage === "pinged" ? (p.to === "tenant" ? "expiry_check_tenant" : "expiry_check_owner") : "expiry_check_tenant",
        recipient_phone: p.phone,
        recipient_name: p.to === "tenant" ? t.tenant_name : (t.property?.owner_name ?? "Owner"),
        body: p.body,
      }),
      updateTenancy(id, { wa_status: "pending" }),
    ]);
  }
  return { ok: true, urls, message: `Prepared ${urls.length} message${urls.length === 1 ? "" : "s"}` };
}

export async function collectRenewalCommission(
  tenancyId: string,
  opts: {
    newContractEnd: string;
    newContractStart?: string | null;
    newRent?: number | null;
    commissionType?: "full_year" | "half_month";
  }
): Promise<{ ok: boolean; message: string }> {
  try {
    const tenancy = await getTenancy(tenancyId);
    if (!tenancy) return { ok: false, message: "Tenancy not found." };

    const effectiveRent = opts.newRent ?? tenancy.amount;
    const commissionType = opts.commissionType ?? "full_year";
    const commissionAmt = commissionType === "full_year"
      ? Math.round(effectiveRent)
      : Math.round(effectiveRent * 0.5);

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
      renewal_commission_type: commissionType,
      lifecycle_stage: null,
      replied_tenant: "pending",
      replied_owner: "pending",
    });

    await clearRenewalData(tenancyId);

    const today = new Date().toISOString().slice(0, 10);
    await recordCommissionEvent({
      tenancy_id: tenancyId,
      owner_lead_id: tenancy.owner_lead_id,
      type: "renewal",
      amount: commissionAmt,
      earned_on: today,
      notes: `Renewal (${commissionType === "full_year" ? "1 year rental" : "50%"}) — new end ${opts.newContractEnd}`,
    });

    invalidateCache();
    revalidatePath("/existing-listing");
    revalidatePath("/performance");
    revalidatePath("/");
    return { ok: true, message: "Commission recorded — tenancy restarted." };
  } catch {
    return { ok: false, message: "Could not update tenancy." };
  }
}

export async function markLeadAsSoldAction(
  leadId: string,
  opts: { salePrice: number; commissionPct: number }
): Promise<{ ok: boolean; message: string }> {
  try {
    const lead = await getOwnerLead(leadId);
    if (!lead) return { ok: false, message: "Listing not found." };

    const commissionAmt = Math.round(opts.salePrice * opts.commissionPct / 100);
    const soldAt = new Date().toISOString();

    await updateOwnerLead(leadId, {
      stage: "sold",
      sale_price: opts.salePrice,
      sale_commission_pct: opts.commissionPct,
      sale_commission_amount: commissionAmt,
      sold_at: soldAt,
    });

    await recordCommissionEvent({
      owner_lead_id: leadId,
      type: "sale",
      amount: commissionAmt,
      earned_on: soldAt.slice(0, 10),
      notes: `Sale price RM${opts.salePrice.toLocaleString()} × ${opts.commissionPct}%`,
    });

    invalidateCache();
    revalidatePath("/my-listing");
    revalidatePath("/performance");
    revalidatePath("/");
    return { ok: true, message: "Sale commission recorded." };
  } catch {
    return { ok: false, message: "Could not record the sale." };
  }
}

export async function moveTenantLeaving(
  tenancyId: string,
  data: { expectedRent: number; availableFrom: string | null }
): Promise<{ ok: boolean; message: string; reason?: string; current_plan?: string; current_count?: number; current_cap?: number; upgrade_to?: string; upgrade_cap?: number | null; remaining?: number; low_remaining?: boolean }> {
  try {
    const t = await getTenancy(tenancyId);
    if (!t) return { ok: false, message: "Tenancy not found." };

    // Block the entire action if the agent is at their My Listing cap
    if (t.owner_lead_id) {
      const capCheck = await checkLeadCap();
      if (!capCheck.allowed) {
        return {
          ok: false,
          message: "My Listing cap reached.",
          reason: "plan_cap_reached",
          current_plan: capCheck.current_plan,
          current_count: capCheck.current_count,
          current_cap: capCheck.current_cap,
          upgrade_to: capCheck.upgrade_to ?? undefined,
          upgrade_cap: capCheck.upgrade_cap,
          remaining: 0,
        };
      }
      await updateOwnerLead(t.owner_lead_id, {
        stage: "listed",
        expected_rent: data.expectedRent,
        available_from: data.availableFrom,
      });
      await updateTenancy(tenancyId, { lifecycle_stage: "closed", closed_reason: "tenant_leaving" });
      invalidateCache();
      revalidatePath("/existing-listing");
      revalidatePath("/property-leads"); revalidatePath("/my-listing");
      revalidatePath("/");
      return {
        ok: true,
        message: "Listing reopened and tenancy archived.",
        remaining: capCheck.remaining - 1,
        low_remaining: (capCheck.remaining - 1) <= CAP_WARN_THRESHOLD,
      };
    }

    await updateTenancy(tenancyId, { lifecycle_stage: "closed", closed_reason: "tenant_leaving" });
    invalidateCache();
    revalidatePath("/existing-listing");
    revalidatePath("/");
    return { ok: true, message: "Tenancy archived." };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Could not process tenant leaving." };
  }
}

export async function moveOwnerLeaving(tenancyId: string): Promise<{ ok: boolean; message: string }> {
  try {
    const t = await getTenancy(tenancyId);
    if (!t) return { ok: false, message: "Tenancy not found." };

    if (t.owner_lead_id) {
      await updateOwnerLead(t.owner_lead_id, { stage: "own_stay" });
    } else {
      // Tenancy was added manually with no owner lead — create one so it surfaces in Property Leads
      const newLead = await createOwnerLead({
        owner_name: t.property?.owner_name ?? "",
        owner_phone: t.property?.owner_phone ?? "",
        property_name: t.property_name ?? null,
        unit: t.property?.unit ?? null,
        expected_rent: t.amount ?? null,
        stage: "own_stay",
        source: "manual",
      } as Parameters<typeof createOwnerLead>[0]);
      await updateTenancy(t.id, { owner_lead_id: newLead.id });
    }

    // Look up by both phone AND name to avoid updating the wrong profile
    // when multiple tenants share the same phone number (common in test data)
    const tenantProfile = t.tenant_phone
      ? await getTenantProfileByPhoneAndName(t.tenant_phone, t.tenant_name ?? "")
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
        name: t.tenant_name ?? "",
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
    revalidatePath("/existing-listing");
    revalidatePath("/property-leads"); revalidatePath("/my-listing");
    revalidatePath("/tenants");
    revalidatePath("/");
    return { ok: true, message: "Lead archived, tenant marked as seeking, tenancy closed." };
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
    tenantName: t.tenant_name ?? "",
    expiryWhen,
    renewalForm: formUrl,
  });
  const out = buildOutbound({ template: "expiry_check_owner", toPhone: t.property?.owner_phone ?? "", toUsername: t.property?.owner_whatsapp_username, body });
  await Promise.all([
    logWhatsApp({
      related_id: t.id,
      related_type: "tenancy",
      template: "expiry_check_owner",
      recipient_phone: t.property.owner_phone,
      recipient_name: t.property.owner_name,
      body,
    }),
    updateTenancy(tenancyId, { wa_status: "pending" }),
  ]);
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

export async function setOwnerLeadStage(id: string, stage: import("./types").OwnerLead["stage"]): Promise<{ ok: boolean; message?: string; reason?: string; current_plan?: string; current_count?: number; current_cap?: number; upgrade_to?: string; upgrade_cap?: number | null; remaining?: number; low_remaining?: boolean }> {
  if (stage === "listed") {
    const capCheck = await checkLeadCap();
    if (!capCheck.allowed) {
      return {
        ok: false,
        reason: "plan_cap_reached",
        current_plan: capCheck.current_plan,
        current_count: capCheck.current_count,
        current_cap: capCheck.current_cap,
        upgrade_to: capCheck.upgrade_to ?? undefined,
        upgrade_cap: capCheck.upgrade_cap,
        remaining: 0,
      };
    }
    await updateOwnerLead(id, { stage });
    invalidateCache();
    revalidatePath("/property-leads"); revalidatePath("/my-listing");
    const remaining = capCheck.remaining - 1;
    return { ok: true, message: "Moved to Listed.", remaining, low_remaining: remaining <= CAP_WARN_THRESHOLD };
  }
  await updateOwnerLead(id, { stage });
  invalidateCache();
  revalidatePath("/property-leads"); revalidatePath("/my-listing");
  return { ok: true, message: `Moved to ${stage.replace("_", " ")}.` };
}

export async function bulkSetOwnerLeadStage(ids: string[], stage: import("./types").OwnerLead["stage"]): Promise<{ ok: boolean; reason?: string; current_plan?: string; current_count?: number; current_cap?: number; upgrade_to?: string; upgrade_cap?: number | null; remaining?: number; low_remaining?: boolean; trying?: number }> {
  if (stage === "listed") {
    const capCheck = await checkLeadCap();
    if (!capCheck.allowed) {
      return {
        ok: false,
        reason: "plan_cap_reached",
        current_plan: capCheck.current_plan,
        current_count: capCheck.current_count,
        current_cap: capCheck.current_cap,
        upgrade_to: capCheck.upgrade_to ?? undefined,
        upgrade_cap: capCheck.upgrade_cap,
        remaining: 0,
        trying: ids.length,
      };
    }
    if (capCheck.remaining < ids.length) {
      // Partial batch would exceed cap — block all (all-or-nothing)
      return {
        ok: false,
        reason: "plan_cap_reached",
        current_plan: capCheck.current_plan,
        current_count: capCheck.current_count,
        current_cap: capCheck.current_cap,
        upgrade_to: capCheck.upgrade_to ?? undefined,
        upgrade_cap: capCheck.upgrade_cap,
        remaining: capCheck.remaining,
        trying: ids.length,
      };
    }
    for (const id of ids) {
      await updateOwnerLead(id, { stage });
    }
    invalidateCache();
    revalidatePath("/property-leads"); revalidatePath("/my-listing");
    const remaining = capCheck.remaining - ids.length;
    return { ok: true, remaining, low_remaining: remaining <= CAP_WARN_THRESHOLD };
  }
  for (const id of ids) {
    await updateOwnerLead(id, { stage });
  }
  invalidateCache();
  revalidatePath("/property-leads"); revalidatePath("/my-listing");
  return { ok: true };
}

export async function bulkMarkOwnerLeadsContacted(ids: string[]) {
  const leads = await Promise.all(ids.map((id) => getOwnerLead(id)));
  const now = new Date().toISOString();
  await Promise.all(
    leads
      .filter((lead): lead is NonNullable<typeof lead> => !!lead && (lead.outreach_count ?? 0) === 0)
      .map((lead) => Promise.all([
        incrementOwnerOutreachCount(lead.id),
        updateOwnerLead(lead.id, { intake_sent_at: now }),
      ]))
  );
  invalidateCache();
  revalidatePath("/property-leads"); revalidatePath("/my-listing");
  return { ok: true };
}

export async function logManualContactAction(id: string, method: "call" | "text") {
  await incrementOwnerOutreachCount(id);
  invalidateCache();
  revalidatePath("/property-leads");
  return { ok: true, method };
}

export async function convertLeadToTenancy(
  ownerLeadId: string,
  data: {
    tenant_name: string;
    tenant_phone: string;
    tenant_whatsapp_username?: string | null;
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
    if (!cap.allowed) return { ok: false, message: cap.reason, current_plan: cap.current_plan, current_count: cap.current_count, current_cap: cap.current_cap, upgrade_to: cap.upgrade_to ?? undefined, upgrade_cap: cap.upgrade_cap, nearest_expiry_days: cap.nearest_expiry_days };

    // Close stale tenancies first so the trigger recalculates has_active_tenancy = false.
    const { createServiceClient } = await import("@/lib/supabase/service");
    const svc = createServiceClient();
    await svc.from("tenancies")
      .update({ lifecycle_stage: "closed", status: "Closed" })
      .eq("owner_lead_id", ownerLeadId)
      .is("deleted_at", null)
      .or("lifecycle_stage.is.null,lifecycle_stage.not.in.(closed,reserved)");

    await createTenancy({
      owner_lead_id: ownerLeadId,
      tenant_name: data.tenant_name,
      tenant_phone: data.tenant_phone,
      tenant_whatsapp_username: data.tenant_whatsapp_username ?? null,
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
      lifecycle_stage: "reserved",
    });

    await updateOwnerLead(ownerLeadId, { stage: "matched", is_managed: true, available_from: isoStart });

    // Auto-create a tenant profile so the tenant appears in the directory
    if (data.tenant_name?.trim()) {
      await (await import("@/lib/db")).ensureTenantProfile(data.tenant_name, data.tenant_phone ?? null);
    }

    invalidateCache();
    revalidatePath("/property-leads"); revalidatePath("/my-listing");
    revalidatePath("/existing-listing");
    revalidatePath("/directory");
    revalidatePath("/");
    return { ok: true, message: "Tenant confirmed." };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Could not create tenancy." };
  }
}

export async function confirmMovedIn(
  tenancyId: string
): Promise<{ ok: boolean; message?: string; cap_reached?: { current_plan: string; upgrade_to?: string; current_cap: number; upgrade_cap: number | null } }> {
  try {
    const capCheck = await checkRenewalCardCap();
    if (!capCheck.allowed) {
      return {
        ok: false,
        message: "cap_reached",
        cap_reached: {
          current_plan: capCheck.current_plan,
          upgrade_to: capCheck.upgrade_to ?? undefined,
          current_cap: capCheck.current_cap,
          upgrade_cap: capCheck.upgrade_cap ?? null,
        },
      };
    }

    const tenancy = await getTenancy(tenancyId);
    if (!tenancy) return { ok: false, message: "Tenancy not found." };

    const agent = await getAgentProfile();
    if (tenancy.owner_lead_id) {
      await recordCommissionEvent({
        tenancy_id: tenancyId,
        owner_lead_id: tenancy.owner_lead_id,
        type: "new_signing",
        amount: Math.round(tenancy.amount * (agent.commission_pct ?? 100) / 100),
        earned_on: tenancy.contract_start ?? new Date().toISOString().slice(0, 10),
      });
    }

    await updateTenancy(tenancyId, { lifecycle_stage: "active" });
    invalidateCache();
    revalidatePath("/property-leads"); revalidatePath("/my-listing");
    revalidatePath("/existing-listing");
    revalidatePath("/performance");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Could not confirm move in." };
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
  const { createServiceClient } = await import("@/lib/supabase/service");
  const { sendPushToUser } = await import("@/lib/push");
  const { sendAgentEmail, packRankedEmail } = await import("@/lib/email");

  const sb = createServiceClient();
  const { data: pack } = await sb
    .from("match_packs")
    .select("user_id, property_label, owner_lead_id")
    .eq("id", packId)
    .maybeSingle();

  await setOwnerRanking(packId, rankings);
  revalidatePath("/matching");

  if (pack?.user_id) {
    const propLabel = pack.property_label ?? "Tenant pack";
    const deepLink = `/property-leads?highlight=${pack.owner_lead_id}`;
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://kakisewa.com";
    sendPushToUser(pack.user_id, {
      title: "Owner ranked your tenant pack",
      body: `${propLabel} — view rankings in Property Leads`,
      url: deepLink,
      tag: `packranked_${packId}`,
    }).catch(() => {});
    sendAgentEmail(
      pack.user_id,
      "Owner ranked your tenant pack",
      packRankedEmail({ propLabel, url: `${siteUrl}${deepLink}` })
    ).catch(() => {});
  }

  return { ok: true };
}

// Build the WhatsApp message to send the share link to the owner.
export async function buildSendPackToOwner(
  ownerLeadId: string,
): Promise<{ ok: boolean; url: string; body: string; message: string; newShareUrl: string }> {
  const all = await getOwnerLeads();
  const owner = all.find((o) => o.id === ownerLeadId);
  if (!owner) return { ok: false, url: "", body: "", message: "Owner lead not found.", newShareUrl: "" };
  const agent = await getAgentProfile();

  // Rotate token + set 1-hour expiry so old links stop working
  const { getOrCreateMatchPack, refreshMatchPackToken } = await import("@/lib/db");
  const { getBaseUrl } = await import("@/lib/origin");
  const [pack, baseUrl] = await Promise.all([getOrCreateMatchPack(ownerLeadId), getBaseUrl()]);
  const newToken = await refreshMatchPackToken(pack.id);
  const shareUrl = `${baseUrl}/share/pack/${newToken}`;

  const propertyLabel = owner.property_name
    ? owner.unit ? `${owner.property_name}, Unit ${owner.unit}` : `${owner.property_name}`
    : "your property";

  const body = `Hi ${owner.owner_name}! I've shortlisted tenants for ${propertyLabel} 🏠

Open this link, drag the cards to rank them, and tap ❤️ on anyone you'd like to view:
${shareUrl}

No login needed — link is private 🙏
— ${agent.name ?? "Your agent"}${agent.agency ? `, ${agent.agency}` : ""}`;

  const out = buildOutbound({ template: "owner_outreach", toPhone: owner.owner_phone, toUsername: owner.owner_whatsapp_username, body });
  await Promise.all([
    logWhatsApp({
      related_id: ownerLeadId,
      related_type: "owner_lead",
      template: "owner_outreach",
      recipient_phone: owner.owner_phone,
      recipient_name: owner.owner_name,
      body,
    }),
    updateOwnerLead(ownerLeadId, { wa_status: "pending" }),
  ]);
  return { ok: true, url: out.url, body, message: "Message ready", newShareUrl: shareUrl };
}

export async function updateOwnerLeadDetails(
  id: string,
  data: Partial<Pick<import("./types").OwnerLead, "owner_name" | "owner_phone" | "owner_whatsapp_username" | "property_name" | "unit" | "expected_rent" | "bedrooms" | "bathrooms" | "parking" | "notes" | "available_from" | "listing_purpose" | "cover_photo_index" | "expected_sale_price" | "expected_sale_commission_pct" | "expected_sale_commission_amount">>
) {
  await updateOwnerLead(id, data);
  invalidateCache();
  revalidatePath("/property-leads"); revalidatePath("/my-listing");
  revalidatePath("/matching");
  revalidatePath("/existing-listing"); revalidatePath("/");
  return { ok: true, promoted: false, message: "Details updated." };
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

  const out = buildOutbound({ template: "owner_outreach", toPhone: owner.owner_phone, toUsername: owner.owner_whatsapp_username, body });
  await Promise.all([
    logWhatsApp({
      related_id: owner.id,
      related_type: "owner_lead",
      template: "owner_outreach",
      recipient_phone: owner.owner_phone,
      recipient_name: owner.owner_name,
      body,
    }),
    updateOwnerLead(id, { wa_status: "pending" }),
  ]);
  if (template === "outreach_initial") {
    await updateOwnerLead(id, { intake_sent_at: new Date().toISOString() });
  }
  invalidateCache();
  revalidatePath("/property-leads"); revalidatePath("/my-listing");
  return { ok: true, url: out.url, message: "Message ready" };
}

// ─── WA Blast queue ──────────────────────────────────────────────────────────

export async function queueOwnerWaBlast(leadId: string): Promise<{ ok: boolean; message: string }> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated." };

  const all = await getOwnerLeads();
  const owner = all.find((o) => o.id === leadId);
  if (!owner) return { ok: false, message: "Lead not found." };
  if (!owner.owner_phone) return { ok: false, message: "No phone number on this lead." };

  const agent = await getAgentProfile();
  const overrides = parseTemplateOverrides(agent.whatsapp_templates);
  const propertyLabel = owner.property_name
    ? owner.unit ? `${owner.property_name}, Unit ${owner.unit}` : owner.property_name
    : "your property";
  const message = resolveTemplate("owner_outreach_initial", overrides, {
    ownerName: owner.owner_name,
    agentName: agent.name ?? "Your agent",
    renNumber: agent.ren_number ?? "",
    agencyLine: agent.agency ? ` from ${agent.agency}` : "",
    propertyName: propertyLabel,
  });

  // Check not already queued
  const { data: existing } = await supabase
    .from("wa_blast_queue")
    .select("id")
    .eq("owner_lead_id", leadId)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) return { ok: false, message: "Already in queue." };

  const { error } = await supabase.from("wa_blast_queue").insert({
    user_id: user.id,
    owner_lead_id: leadId,
    phone: owner.owner_phone,
    message,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/property-leads");
  return { ok: true, message: "Added to WA blast queue." };
}

export async function removeOwnerWaBlast(leadId: string): Promise<{ ok: boolean }> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.from("wa_blast_queue").delete().eq("owner_lead_id", leadId).eq("status", "pending");
  revalidatePath("/property-leads");
  return { ok: true };
}

export async function bulkQueueOwnerWaBlast(leadIds: string[]): Promise<{ queued: number; skipped: number; noPhone: number }> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { queued: 0, skipped: 0, noPhone: 0 };

  const all = await getOwnerLeads();
  const agent = await getAgentProfile();
  const overrides = parseTemplateOverrides(agent.whatsapp_templates);

  // Fetch already-queued lead IDs to avoid duplicates
  const { data: existing } = await supabase
    .from("wa_blast_queue")
    .select("owner_lead_id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .in("owner_lead_id", leadIds);
  const alreadyQueued = new Set((existing ?? []).map((r: { owner_lead_id: string }) => r.owner_lead_id));

  const rows: { user_id: string; owner_lead_id: string; phone: string; message: string }[] = [];
  let skipped = 0, noPhone = 0;

  for (const leadId of leadIds) {
    if (alreadyQueued.has(leadId)) { skipped++; continue; }
    const owner = all.find((o) => o.id === leadId);
    if (!owner?.owner_phone) { noPhone++; continue; }

    const propertyLabel = owner.property_name
      ? owner.unit ? `${owner.property_name}, Unit ${owner.unit}` : owner.property_name
      : "your property";
    const message = resolveTemplate("owner_outreach_initial", overrides, {
      ownerName: owner.owner_name,
      agentName: agent.name ?? "Your agent",
      renNumber: agent.ren_number ?? "",
      agencyLine: agent.agency ? ` from ${agent.agency}` : "",
      propertyName: propertyLabel,
    });
    rows.push({ user_id: user.id, owner_lead_id: leadId, phone: owner.owner_phone, message });
  }

  if (rows.length > 0) {
    await supabase.from("wa_blast_queue").insert(rows);
  }

  revalidatePath("/property-leads");
  return { queued: rows.length, skipped, noPhone };
}

export async function saveWaBlastConfig(config: {
  interval_minutes: number;
  daily_cap: number;
  windows: { start: string; end: string }[];
  is_active: boolean;
}): Promise<{ ok: boolean }> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase.from("wa_blast_config").upsert(
    { user_id: user.id, ...config },
    { onConflict: "user_id" }
  );
  revalidatePath("/property-leads");
  return { ok: true };
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

export async function saveProfileDetails(p: { name?: string; phone?: string; whatsapp_username?: string | null; agency?: string; ren_number?: string | null; photo_url?: string | null; accent_color?: string | null; motivation_photo_url?: string | null }) {
  try {
    await updateAgentProfile(p);
    revalidatePath("/settings/account");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function saveWhatsAppTemplatesAction(overrides: TemplateOverrides): Promise<{ ok: boolean }> {
  await saveWhatsAppTemplates(overrides);
  revalidatePath("/settings/account");
  return { ok: true };
}

export async function saveNotifPrefs(prefs: Partial<{ notif_push: boolean; notif_email: boolean }>): Promise<{ ok: boolean }> {
  try {
    await updateAgentProfile(prefs);
    revalidatePath("/settings/account");
    // Re-enabling push from the top banner / bottom sheet needs the app
    // layout (which gates those prompts) to see the fresh notif_push value
    // on the very next navigation, not just the settings page.
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
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

// XLSX.read() is genuine CPU-bound work (unzipping + XML parsing), not I/O
// wait — an unbounded file size means an unbounded active-CPU cost on Vercel's
// Fluid Compute billing. 15MB comfortably covers any realistic owner list.
const MAX_IMPORT_FILE_BYTES = 15 * 1024 * 1024;
// Defense in depth in case a small file somehow unpacks into a huge row
// count. 10,000 comfortably covers the largest real imports seen so far
// (low thousands) with real headroom.
const MAX_IMPORT_ROWS = 10_000;

export async function importOwnerCsv(formData: FormData): Promise<ImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, imported: 0, skipped: 0, errors: [], total: 0, message: "No file uploaded." };
  }
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return { ok: false, imported: 0, skipped: 0, errors: [], total: 0, message: `File is too large (max ${MAX_IMPORT_FILE_BYTES / 1024 / 1024}MB). Split it into smaller files and import separately.` };
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
  if (rawRows.length > MAX_IMPORT_ROWS) {
    return { ok: false, imported: 0, skipped: 0, errors: [], total: rawRows.length, message: `File has ${rawRows.length.toLocaleString()} rows (max ${MAX_IMPORT_ROWS.toLocaleString()}). Split it into smaller files and import separately.` };
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
      owner_whatsapp_username: row.owner_whatsapp_username ?? null,
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
  revalidatePath("/property-leads"); revalidatePath("/my-listing");
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

  if (rows.length > MAX_IMPORT_ROWS) {
    return { ok: false, imported: 0, skipped: 0, errors: [], total: rows.length, message: `File has ${rows.length.toLocaleString()} rows (max ${MAX_IMPORT_ROWS.toLocaleString()}). Split it into smaller files and import separately.` };
  }

  const parsed: ImportRow[] = rows.map((r, i) => canonicaliseWithMapping(r, mapping, i + 2));
  const valid = parsed.filter((r) => r.errors.length === 0);
  const invalid = parsed.filter((r) => r.errors.length > 0);

  const batch = `batch_${Date.now()}`;
  await bulkCreateOwnerLeads(
    valid.map((row) => ({
      owner_name: row.owner_name,
      owner_phone: row.owner_phone,
      owner_whatsapp_username: row.owner_whatsapp_username ?? null,
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
  revalidatePath("/property-leads"); revalidatePath("/my-listing");
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
  const out = buildOutbound({ template: "owner_outreach", toPhone: owner.owner_phone, toUsername: owner.owner_whatsapp_username, body });
  await Promise.all([
    logWhatsApp({
      related_id: ownerLeadId,
      related_type: "owner_lead",
      template: "owner_outreach",
      recipient_phone: owner.owner_phone,
      recipient_name: owner.owner_name,
      body,
    }),
    updateOwnerLead(ownerLeadId, { wa_status: "pending" }),
  ]);
  await incrementOwnerOutreachCount(ownerLeadId);
  revalidatePath("/property-leads"); revalidatePath("/my-listing");
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

export async function getOrCreatePropertyPackLink(ownerLeadId: string): Promise<{
  ok: boolean; url: string; waUrl: string;
}> {
  const [token, lead, agent, siteUrl] = await Promise.all([
    getOrCreatePropertyShareToken(ownerLeadId),
    getOwnerLead(ownerLeadId),
    getAgentProfile(),
    getBaseUrl(),
  ]);
  const url = `${siteUrl}/p/${token}`;
  const propertyName = lead?.property_name ?? "the property";
  const unitLine = lead?.unit ? ` · Unit ${lead.unit}` : "";
  const rent = lead?.expected_rent != null ? `RM ${lead.expected_rent.toLocaleString()}/mo` : "";
  const beds = lead?.bedrooms != null ? `${lead.bedrooms} bed` : "";
  const baths = lead?.bathrooms != null ? `${lead.bathrooms} bath` : "";
  const stats = [rent, beds, baths].filter(Boolean).join(" · ");
  const agencyLine = agent.agency ? ` from ${agent.agency}` : "";
  const availableLine = lead?.available_from
    ? ` · Available ${new Date(lead.available_from).toLocaleDateString("en-MY", { month: "short", year: "numeric" })}`
    : "";

  const body = `Hi! I'm ${agent.name ?? "your agent"}${agencyLine}.

I have a unit that might be a great fit for you:

*${propertyName}*${unitLine}
${stats}${availableLine}

Take a look here:
${url}

If you're keen, tap the link to view the details and let me know 🏠`;

  const { buildOutbound } = await import("./whatsapp");
  const out = buildOutbound({ template: "property_pack", toPhone: "", body });
  return { ok: true, url, waUrl: out.url };
}

// ─── Manual lead / tenant creation ───────────────────────────────────────────

export async function addOwnerLeadAction(data: {
  owner_name: string;
  owner_phone: string;
  owner_whatsapp_username?: string | null;
  property_name: string | null;
  unit: string | null;
  expected_rent: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking?: string | null;
  notes?: string | null;
  available_from?: string | null;
  listing_purpose?: "rent" | "sell" | "both" | null;
  stage?: "imported" | "listed";
}): Promise<{ ok: boolean; id?: string; message?: string; reason?: string; current_plan?: string; current_count?: number; current_cap?: number; upgrade_to?: string; upgrade_cap?: number | null; remaining?: number; low_remaining?: boolean }> {
  const { createOwnerLead } = await import("@/lib/db");
  try {
    // Potential listing is unlimited — only gate when creating directly in "listed" (Add Listing on My Listing page)
    if (data.stage === "listed") {
      const capCheck = await checkLeadCap();
      if (!capCheck.allowed) {
        return {
          ok: false,
          reason: "plan_cap_reached",
          current_plan: capCheck.current_plan,
          current_count: capCheck.current_count,
          current_cap: capCheck.current_cap,
          upgrade_to: capCheck.upgrade_to ?? undefined,
          upgrade_cap: capCheck.upgrade_cap,
          remaining: 0,
        };
      }
    }
    const lead = await createOwnerLead({
      owner_name: data.owner_name,
      owner_phone: data.owner_phone,
      owner_whatsapp_username: data.owner_whatsapp_username ?? null,
      property_name: data.property_name,
      unit: data.unit,
      address: null,
      expected_rent: data.expected_rent,
      bedrooms: data.bedrooms ?? null,
      bathrooms: data.bathrooms ?? null,
      parking: data.parking ?? null,
      notes: data.notes ?? null,
      source: "manual",
      import_batch_id: null,
      stage: data.stage ?? "imported",
      intake_token: null,
      intake_sent_at: null,
      intake_completed_at: null,
      available_from: data.available_from ?? null,
      tenant_preferences: null,
      listing_purpose: data.listing_purpose ?? null,
    });
    invalidateCache();
    revalidatePath("/property-leads"); revalidatePath("/my-listing");
    if (data.stage === "listed") {
      const capCheck = await checkLeadCap();
      if (capCheck.allowed) {
        return { ok: true, id: lead.id, remaining: capCheck.remaining, low_remaining: capCheck.remaining <= CAP_WARN_THRESHOLD };
      }
    }
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
    revalidatePath("/directory");
    revalidatePath("/matching");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

// Updates name + phone on a tenancy record AND syncs the linked tenant_profiles row (by old phone)
export async function updateRentedTenantAction(
  tenancyId: string,
  oldPhone: string | null,
  name: string,
  phone: string,
  whatsappUsername?: string | null
): Promise<{ ok: boolean; message?: string }> {
  try {
    const { updateTenancy } = await import("@/lib/db");
    await updateTenancy(tenancyId, { tenant_name: name, tenant_phone: phone || null, tenant_whatsapp_username: whatsappUsername ?? null });

    // Sync the tenant_profiles row that matches the old phone
    if (oldPhone?.trim()) {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data: profile } = await supabase
        .from("tenant_profiles")
        .select("id")
        .eq("phone", oldPhone.trim())
        .maybeSingle();
      if (profile) {
        await supabase.from("tenant_profiles").update({ name, phone: phone || null, whatsapp_username: whatsappUsername ?? null }).eq("id", profile.id);
      }
    }

    revalidatePath("/directory");
    revalidatePath("/existing-listing");
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
  revalidatePath("/existing-listing");
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
    revalidatePath("/existing-listing");
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
    tenantName: tenancy.tenant_name ?? "",
    tenantPhone: tenancy.tenant_phone ?? "",
    propertyName: tenancy.property_name ?? tenancy.owner_lead_id ?? "",
    amount: tenancy.amount,
    month: format(new Date(), "MMMM yyyy"),
  });

  await updateTenancy(tenancyId, { lhdn_status: "generated" });
  invalidateCache();
  revalidatePath("/existing-listing");
  revalidatePath("/");

  return { ok: true, xml, message: "e-Invois generated." };
}

// ─── Commission collection ────────────────────────────────────────────────────

export async function markCommissionCollected(
  tenancyId: string
): Promise<{ ok: boolean; message?: string; cap_reached?: { current_plan: string; upgrade_to?: string; current_cap: number; upgrade_cap: number | null } }> {
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
          upgrade_to: capCheck.upgrade_to ?? undefined,
          current_cap: capCheck.current_cap,
          upgrade_cap: capCheck.upgrade_cap ?? null,
        },
      };
    }

    const tenancy = await getTenancy(tenancyId);
    if (tenancy?.owner_lead_id) {
      const lead = await getOwnerLead(tenancy.owner_lead_id);
      if (lead) {
        const amount = Math.round((lead.expected_rent ?? tenancy.amount) * 0.5);
        const today = new Date().toISOString().slice(0, 10);
        await recordCommissionEvent({
          tenancy_id: tenancyId,
          owner_lead_id: tenancy.owner_lead_id,
          type: "renewal",
          amount,
          earned_on: today,
        });
      }
    }
    await updateTenancy(tenancyId, { lifecycle_stage: "active" });
    invalidateCache();
    revalidatePath("/property-leads"); revalidatePath("/my-listing");
    revalidatePath("/existing-listing");
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
  contact_name?: string | null;
  phone: string;
  whatsapp_username?: string | null;
  type: SupportType;
  types?: SupportType[];
  area?: string | null;
  notes?: string | null;
  starred?: number;
}): Promise<{ ok: boolean }> {
  "use server";
  const effectiveTypes = data.types?.length ? data.types : [data.type];
  try {
    if (data.id) {
      await updatePropertySupport(data.id, {
        name: data.name, contact_name: data.contact_name ?? null,
        phone: data.phone, whatsapp_username: data.whatsapp_username ?? null, type: effectiveTypes[0], types: effectiveTypes,
        area: data.area ?? null, notes: data.notes ?? null,
        starred: data.starred,
      });
    } else {
      await createPropertySupport({
        name: data.name, contact_name: data.contact_name ?? null,
        phone: data.phone, whatsapp_username: data.whatsapp_username ?? null, type: effectiveTypes[0], types: effectiveTypes,
        area: data.area ?? null, notes: data.notes ?? null,
        starred: data.starred ?? 0,
      });
    }
    invalidateCache();
    revalidatePath("/directory");
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

export async function completeOnboardingTour(): Promise<{ ok: boolean }> {
  "use server";
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false };
  await supabase.from("agent_profiles").update({ onboarding_tour_completed_at: new Date().toISOString() }).eq("id", uid);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function adminResetMyAccount(): Promise<{ ok: boolean }> {
  const { createClient } = await import("@/lib/supabase/server");
  const { createServiceClient } = await import("@/lib/supabase/service");
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false };

  const { TRIAL_DURATION_DAYS } = await import("@/lib/beta-config");
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
    trial_ends_at: new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    survey_completed_at: new Date().toISOString(),
  }).eq("id", uid);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markCompetitorRentedAction(
  id: string,
  rentedOn: string,
  durationMonths: number,
  contractEndDate?: string
): Promise<{ ok: boolean; reason?: string; current_plan?: string; current_count?: number; current_cap?: number; upgrade_to?: string; upgrade_cap?: number | null }> {
  "use server";
  const capCheck = await checkTargetCap();
  if (!capCheck.allowed) {
    return {
      ok: false,
      reason: "plan_cap_reached",
      current_plan: capCheck.current_plan,
      current_count: capCheck.current_count,
      current_cap: capCheck.current_cap,
      upgrade_to: capCheck.upgrade_to ?? undefined,
      upgrade_cap: capCheck.upgrade_cap,
    };
  }
  let contractEnd = contractEndDate ?? "";
  if (!contractEnd) {
    const [y, m, day] = rentedOn.split("-").map(Number);
    const end = new Date(y, m - 1 + durationMonths, day);
    contractEnd = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  }
  await markCompetitorRented(id, rentedOn, durationMonths, contractEnd);
  invalidateCache();
  revalidatePath("/property-leads");
  revalidatePath("/my-listing");
  revalidatePath("/lost-listing");
  return { ok: true };
}

export async function checkTargetCapAction(): Promise<ReturnType<typeof checkTargetCap>> {
  "use server";
  return checkTargetCap();
}

export async function setCompetitorStageAction(
  id: string,
  stage: "watching" | "reach_out" | "renewing" | "in_talks" | "missed"
): Promise<{ ok: boolean }> {
  "use server";
  await setCompetitorStage(id, stage);
  invalidateCache();
  revalidatePath("/lost-listing");
  return { ok: true };
}

export async function winCompetitorUnitAction(id: string, availableFrom?: string | null): Promise<{ ok: boolean; reason?: string; current_plan?: string; current_count?: number; current_cap?: number; upgrade_to?: string; upgrade_cap?: number | null }> {
  "use server";
  const capCheck = await checkLeadCap();
  if (!capCheck.allowed) {
    return {
      ok: false,
      reason: "plan_cap_reached",
      current_plan: capCheck.current_plan,
      current_count: capCheck.current_count,
      current_cap: capCheck.current_cap,
      upgrade_to: capCheck.upgrade_to ?? undefined,
      upgrade_cap: capCheck.upgrade_cap,
    };
  }
  await winCompetitorUnit(id, availableFrom);
  invalidateCache();
  revalidatePath("/lost-listing");
  revalidatePath("/my-listing");
  return { ok: true };
}

export async function archiveCompetitorLeadAction(id: string): Promise<{ ok: boolean }> {
  "use server";
  await archiveCompetitorLead(id);
  invalidateCache();
  revalidatePath("/lost-listing");
  return { ok: true };
}

export async function updateCompetitorLeadAction(
  id: string,
  data: {
    owner_name?: string;
    owner_phone?: string;
    owner_whatsapp_username?: string | null;
    property_name?: string;
    unit?: string;
    expected_rent?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    parking?: string | null;
    competitor_contract_start?: string | null;
    competitor_contract_duration_months?: number | null;
    competitor_contract_end?: string | null;
    agreement_url?: string | null;
    cover_photo_index?: number;
  }
): Promise<{ ok: boolean }> {
  "use server";
  await updateOwnerLead(id, data);
  invalidateCache();
  revalidatePath("/lost-listing");
  return { ok: true };
}

export async function buildCompetitorOwnerPing(leadId: string): Promise<{ url: string; body: string } | null> {
  const lead = await getOwnerLead(leadId);
  if (!lead || !lead.owner_phone || !lead.competitor_contract_end) return null;
  const agent = await getAgentProfile();
  const days = daysUntil(lead.competitor_contract_end, new Date());
  const expiryWhen = days > 0
    ? `in ${days} day${days === 1 ? "" : "s"}`
    : days === 0 ? "today"
    : `${Math.abs(days)} day${days === -1 ? "" : "s"} ago`;
  const firstName = agent.name?.trim().split(/\s+/)[0] ?? undefined;
  const overrides = parseTemplateOverrides(agent.whatsapp_templates);
  const { getOrCreateOwnerIntakeToken } = await import("./db");
  const token = await getOrCreateOwnerIntakeToken(leadId);
  const siteUrl = await getBaseUrl();
  const intakeUrl = `${siteUrl}/o/${token}`;
  const body = resolveTemplate("expiry_check_owner", overrides, {
    ownerName: lead.owner_name ?? "",
    agentLine: firstName ? `I'm ${firstName}${agent.ren_number ? ` (${agent.ren_number})` : ""}${agent.agency ? ` from ${agent.agency}` : ""}. ` : "",
    propertyName: lead.property_name ? (lead.unit ? `${lead.property_name}, Unit ${lead.unit}` : lead.property_name) : "your property",
    tenantName: "your current tenant",
    expiryWhen,
    renewalForm: intakeUrl,
  });
  const out = buildOutbound({ template: "expiry_check_owner", toPhone: lead.owner_phone, toUsername: lead.owner_whatsapp_username, body });
  await logWhatsApp({
    related_id: leadId,
    related_type: "owner_lead",
    template: "expiry_check_owner",
    recipient_phone: lead.owner_phone,
    recipient_name: lead.owner_name ?? "",
    body,
  });
  return { url: out.url, body };
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

export async function saveTenantPropertyRanking(
  packToken: string,
  rankings: Array<{ owner_lead_id: string; rank: number; liked: number }>
): Promise<{ ok: boolean }> {
  try {
    const { savePropertyPackRanking } = await import("@/lib/db");
    const { agentUserId, tenantLabel, tenantProfileId } = await savePropertyPackRanking(packToken, rankings);

    if (agentUserId) {
      const { sendPushToUser } = await import("@/lib/push");
      const { sendAgentEmail, propertyPackRankedEmail } = await import("@/lib/email");
      const resultUrl = tenantProfileId
        ? `/property-pack/${tenantProfileId}/results`
        : "/directory?view=tenants";
      const fullUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://kakisewa.com"}${resultUrl}`;
      sendPushToUser(agentUserId, {
        title: "Tenant ranked your property pack",
        body: `${tenantLabel ?? "A tenant"} ranked their preferred properties`,
        url: resultUrl,
        tag: `proppackranked_${agentUserId}`,
      }).catch(() => {});
      sendAgentEmail(
        agentUserId,
        `${tenantLabel ?? "A tenant"} ranked your property pack`,
        propertyPackRankedEmail({ tenantName: tenantLabel ?? "A tenant", url: fullUrl })
      ).catch(() => {});
    }

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function lostContractAction(
  tenancyId: string,
  ownerLeadId: string | null,
  competitorContractEnd: string | null
): Promise<{ ok: boolean; message?: string }> {
  "use server";
  const { createServiceClient } = await import("@/lib/supabase/service");
  const svc = createServiceClient();
  const { error } = await svc
    .from("tenancies")
    .update({ lifecycle_stage: "closed", closed_reason: "lost_to_competitor" })
    .eq("id", tenancyId);
  if (error) return { ok: false, message: error.message };
  if (ownerLeadId && competitorContractEnd) {
    await markCompetitorRented(ownerLeadId, "", undefined, competitorContractEnd);
  }
  invalidateCache();
  revalidatePath("/existing-listing");
  revalidatePath("/lost-listing");
  return { ok: true };
}

// ─── Calendar events ──────────────────────────────────────────────────────────

export async function createCalendarEvent(input: {
  title: string;
  event_date: string;
  event_time: string | null;
  event_type?: "viewing" | "call" | "focus_time" | null;
  subtitle?: string | null;
  card_href?: string | null;
  tenancy_id?: string | null;
  owner_lead_id?: string | null;
  owner_name?: string | null;
  owner_phone?: string | null;
  tenant_name?: string | null;
  tenant_phone?: string | null;
}): Promise<{ ok: boolean; id?: string; message?: string }> {
  "use server";
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, message: "Not authenticated" };

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      user_id: session.user.id,
      title: input.title.trim(),
      event_date: input.event_date,
      event_time: input.event_time || null,
      event_type: input.event_type || null,
      subtitle: input.subtitle || null,
      card_href: input.card_href || null,
      tenancy_id: input.tenancy_id || null,
      owner_lead_id: input.owner_lead_id || null,
      owner_name: input.owner_name || null,
      owner_phone: input.owner_phone || null,
      tenant_name: input.tenant_name || null,
      tenant_phone: input.tenant_phone || null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };
  revalidatePath("/calendar");
  revalidatePath("/home");
  return { ok: true, id: (data as { id: string }).id };
}

export async function updateCalendarEvent(id: string, input: {
  title: string;
  event_date: string;
  event_time: string | null;
  event_type?: "viewing" | "call" | "focus_time" | null;
  owner_name?: string | null;
  owner_phone?: string | null;
  tenant_name?: string | null;
  tenant_phone?: string | null;
}): Promise<{ ok: boolean; message?: string }> {
  "use server";
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("calendar_events")
    .update({
      title: input.title.trim(),
      event_date: input.event_date,
      event_time: input.event_time || null,
      event_type: input.event_type ?? null,
      owner_name: input.owner_name || null,
      owner_phone: input.owner_phone || null,
      tenant_name: input.tenant_name || null,
      tenant_phone: input.tenant_phone || null,
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/calendar");
  revalidatePath("/home");
  return { ok: true };
}

export async function deleteCalendarEvent(id: string): Promise<{ ok: boolean }> {
  "use server";
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.from("calendar_events").delete().eq("id", id);
  revalidatePath("/calendar");
  return { ok: true };
}

export async function submitPricingSurvey(response: {
  role: string;
  tenancy_volume: string;
  tracking_before: string;
  beliefs: string[];
  willingness_to_pay: string;
  open_feedback?: string;
}): Promise<{ ok: boolean; error?: string }> {
  "use server";
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };
    const { error } = await supabase
      .from("agent_profiles")
      .update({
        survey_response: response,
        survey_completed_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/home");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// Returns ISO date strings ("YYYY-MM-DD") that have at least one calendar event
export async function getCalendarEventDatesForMonth(month: string): Promise<string[]> {
  "use server";
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return [];
  const [y, m] = month.split("-").map(Number);
  const monthStart = `${month}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("calendar_events")
    .select("event_date")
    .gte("event_date", monthStart)
    .lte("event_date", monthEnd);
  return [...new Set((data ?? []).map((r: { event_date: string }) => r.event_date))];
}

// ─── Board share (mypipeline) ─────────────────────────────────────────────────

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

export async function upsertBoardShare(passcode: string): Promise<{ slug: string } | { error: string }> {
  "use server";
  const { createClient } = await import("@/lib/supabase/server");
  const { createServiceClient } = await import("@/lib/supabase/service");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!/^\d{8}$/.test(passcode)) return { error: "Passcode must be exactly 8 digits" };

  const svc = createServiceClient();
  const { data: profile } = await svc
    .from("agent_profiles")
    .select("name, board_slug")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.name) return { error: "Please add your name in Settings before generating a share link" };

  let slug = (profile.board_slug as string | null) ?? null;
  if (!slug) {
    const base = nameToSlug(profile.name as string);
    if (!base) return { error: "Could not generate a link from your name. Please update your name in Settings." };
    slug = base;
    let attempt = 1;
    while (true) {
      const { data: existing } = await svc
        .from("agent_profiles")
        .select("id")
        .eq("board_slug", slug)
        .neq("id", user.id)
        .maybeSingle();
      if (!existing) break;
      attempt++;
      slug = `${base}-${attempt}`;
    }
  }

  await svc.from("agent_profiles").update({ board_slug: slug, board_passcode: passcode }).eq("id", user.id);
  return { slug };
}

export async function regenerateBoardLink(): Promise<{ slug: string } | { error: string }> {
  "use server";
  const { createClient } = await import("@/lib/supabase/server");
  const { createServiceClient } = await import("@/lib/supabase/service");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const svc = createServiceClient();
  const { data: profile } = await svc
    .from("agent_profiles")
    .select("name, board_slug")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.name) return { error: "Please add your name in Settings first" };

  const base = nameToSlug(profile.name as string);
  const suffix = Math.random().toString(36).slice(2, 6);
  const slug = `${base}-${suffix}`;

  await svc.from("agent_profiles").update({ board_slug: slug }).eq("id", user.id);
  return { slug };
}

