import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

// Days before expiry/availability to queue a reminder
const REMINDER_WINDOWS = [60, 30, 7];

// Template keys logged to whatsapp_log so we don't double-send
function reminderKey(days: number, type: "renewal" | "availability"): string {
  return `auto_reminder_${type}_${days}d`;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Only run for platinum and elite agents (active subscriptions)
  const { data: agents } = await supabase
    .from("agent_profiles")
    .select("id, name, agency, ren_number")
    .or("subscription_plan.eq.platinum,subscription_plan.eq.elite")
    .eq("subscription_status", "active");

  if (!agents || agents.length === 0) {
    return NextResponse.json({ queued: 0 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let totalQueued = 0;

  for (const agent of agents) {
    const userId = agent.id as string;
    const agentName = (agent.name as string | null) ?? undefined;
    const agentAgency = (agent.agency as string | null) ?? undefined;
    const renNumber = (agent.ren_number as string | null) ?? undefined;
    const agentLabel = [agentName, renNumber].filter(Boolean).join(" · ");

    for (const daysBefore of REMINDER_WINDOWS) {
      const targetDate = new Date(today.getTime() + daysBefore * 86400000);
      const targetStr = targetDate.toISOString().slice(0, 10);

      // ── Renewal reminders (contract expiry) ──────────────────────────────

      const { data: expiringContracts } = await supabase
        .from("tenancies")
        .select("id, tenant_name, tenant_phone, amount, contract_end, property_name")
        .eq("user_id", userId)
        .eq("contract_end", targetStr)
        .neq("lifecycle_stage", "closed");

      for (const contract of expiringContracts ?? []) {
        const tId = contract.id as string;
        const template = reminderKey(daysBefore, "renewal");

        // Skip if already queued in last 3 days (idempotency window)
        const since = new Date(today.getTime() - 3 * 86400000).toISOString();
        const { count } = await supabase
          .from("whatsapp_log")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("related_id", tId)
          .eq("template", template)
          .gte("sent_at", since);

        if ((count ?? 0) > 0) continue;

        const tenantName = contract.tenant_name as string;
        const tenantPhone = contract.tenant_phone as string;
        const propertyName = (contract.property_name as string | null) ?? "your property";
        const amount = (contract.amount as number) ?? 0;
        const contractEnd = contract.contract_end as string;

        const body = buildRenewalReminderMessage({
          tenantName,
          propertyName,
          amount,
          contractEnd,
          daysBefore,
          agentLabel,
          agentAgency,
        });

        const waUrl = `https://wa.me/${normalisePhone(tenantPhone)}?text=${encodeURIComponent(body)}`;

        await supabase.from("whatsapp_log").insert({
          id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          user_id: userId,
          related_id: tId,
          related_type: "tenancy",
          template,
          recipient_phone: tenantPhone,
          recipient_name: tenantName,
          body: waUrl,
          channel: "auto_queued",
        });

        totalQueued++;
      }

      // ── Availability reminders (owner leads) ──────────────────────────────

      const { data: availableLeads } = await supabase
        .from("owner_leads")
        .select("id, owner_name, owner_phone, expected_rent, property_name, unit, available_from")
        .eq("user_id", userId)
        .eq("available_from", targetStr)
        .in("stage", ["wants_rent", "listed", "replied"]);

      for (const lead of availableLeads ?? []) {
        const lId = lead.id as string;
        const template = reminderKey(daysBefore, "availability");

        const since = new Date(today.getTime() - 3 * 86400000).toISOString();
        const { count } = await supabase
          .from("whatsapp_log")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("related_id", lId)
          .eq("template", template)
          .gte("sent_at", since);

        if ((count ?? 0) > 0) continue;

        const ownerName = (lead.owner_name as string | null) ?? "Owner";
        const ownerPhone = (lead.owner_phone as string | null) ?? "";
        if (!ownerPhone) continue;

        const propertyName = [lead.property_name, lead.unit].filter(Boolean).join(" · ") || "your property";
        const availableFrom = lead.available_from as string;
        const expectedRent = (lead.expected_rent as number | null) ?? 0;

        const body = buildAvailabilityReminderMessage({
          ownerName,
          propertyName,
          availableFrom,
          expectedRent,
          daysBefore,
          agentLabel,
          agentAgency,
        });

        const waUrl = `https://wa.me/${normalisePhone(ownerPhone)}?text=${encodeURIComponent(body)}`;

        await supabase.from("whatsapp_log").insert({
          id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          user_id: userId,
          related_id: lId,
          related_type: "owner_lead",
          template,
          recipient_phone: ownerPhone,
          recipient_name: ownerName,
          body: waUrl,
          channel: "auto_queued",
        });

        totalQueued++;
      }
    }
  }

  return NextResponse.json({ queued: totalQueued });
}

function normalisePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

function buildRenewalReminderMessage(p: {
  tenantName: string; propertyName: string; amount: number; contractEnd: string;
  daysBefore: number; agentLabel: string; agentAgency?: string;
}): string {
  const agentLine = p.agentLabel ? `I'm ${p.agentLabel}${p.agentAgency ? ` from ${p.agentAgency}` : ""}. ` : "";
  const when = p.daysBefore === 60 ? "in 2 months" : p.daysBefore === 30 ? "in 1 month" : "in 7 days";
  return `Hi ${p.tenantName}! ${agentLine}Your tenancy at *${p.propertyName}* expires ${when} (${p.contractEnd}). Are you planning to renew? Please reply YES to continue or NO if you're moving out. Thank you!`;
}

function buildAvailabilityReminderMessage(p: {
  ownerName: string; propertyName: string; availableFrom: string; expectedRent: number;
  daysBefore: number; agentLabel: string; agentAgency?: string;
}): string {
  const agentLine = p.agentLabel ? `I'm ${p.agentLabel}${p.agentAgency ? ` from ${p.agentAgency}` : ""}. ` : "";
  const when = p.daysBefore === 60 ? "in 2 months" : p.daysBefore === 30 ? "in 1 month" : "in 7 days";
  const rentLine = p.expectedRent > 0 ? ` at RM ${p.expectedRent.toLocaleString()}/month` : "";
  return `Hi ${p.ownerName}! ${agentLine}Your unit *${p.propertyName}* becomes available ${when} (${p.availableFrom})${rentLine}. I'm actively looking for good tenants — shall I start the search? Please reply YES and I'll get started right away!`;
}
