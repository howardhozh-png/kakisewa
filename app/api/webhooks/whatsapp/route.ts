import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendPushToUser } from "@/lib/push";
import { classifyWaReply } from "@/lib/ai-classify";
import { sendAgentEmail, waReplyTenantEmail, waReplyOwnerEmail } from "@/lib/email";

// ─── GET — Meta webhook verification handshake ────────────────────────────────

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (
    p.get("hub.mode") === "subscribe" &&
    p.get("hub.verify_token") === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// ─── POST — Incoming message handler ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify the request is genuinely from Meta
  const sig = req.headers.get("x-hub-signature-256") ?? "";
  const secret = process.env.WHATSAPP_APP_SECRET ?? "";
  if (secret) {
    const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
    if (sig !== expected) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  // Return 200 immediately — Meta retries if it doesn't get a response within 5s
  // Process asynchronously after responding
  processWebhook(rawBody).catch((err) =>
    console.error("[whatsapp/webhook] processing error", err)
  );

  return new Response("OK", { status: 200 });
}

// ─── Async processing ─────────────────────────────────────────────────────────

interface WaMeta {
  phone_number_id: string;
  display_phone_number: string;
}

interface WaMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

async function processWebhook(rawBody: string) {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return;
  }

  if (payload.object !== "whatsapp_business_account") return;

  const entries = (payload.entry as Array<Record<string, unknown>>) ?? [];

  for (const entry of entries) {
    const changes = (entry.changes as Array<Record<string, unknown>>) ?? [];
    for (const change of changes) {
      const value = change.value as Record<string, unknown> | undefined;
      if (!value) continue;

      const meta = value.metadata as WaMeta | undefined;
      const messages = (value.messages as WaMessage[]) ?? [];

      for (const msg of messages) {
        if (msg.type !== "text" || !msg.text?.body) continue;
        await processMessage(msg, meta);
      }
    }
  }
}

async function processMessage(msg: WaMessage, meta: WaMeta | undefined) {
  const svc = createServiceClient();
  const messageText = msg.text!.body;
  const fromNumber = normalizePhone(msg.from);
  const phoneNumberId = meta?.phone_number_id ?? "";
  const toNumber = normalizePhone(meta?.display_phone_number ?? "");
  const receivedAt = new Date(parseInt(msg.timestamp, 10) * 1000).toISOString();

  // Deduplication — skip if we've already processed this Meta message ID
  const { data: existing } = await svc
    .from("whatsapp_messages")
    .select("id")
    .eq("wa_message_id", msg.id)
    .maybeSingle();
  if (existing) return;

  // Find the agent whose phone number ID matches
  const { data: agentRow } = await svc
    .from("agent_profiles")
    .select("id")
    .eq("whatsapp_phone_number_id", phoneNumberId)
    .maybeSingle();

  if (!agentRow) {
    // No agent configured for this phone number — log and bail
    console.warn("[whatsapp/webhook] no agent for phone_number_id", phoneNumberId);
    await svc.from("whatsapp_messages").insert({
      user_id: null,
      card_id: null,
      card_type: null,
      direction: "inbound",
      from_number: fromNumber,
      to_number: toNumber,
      message_text: messageText,
      wa_message_id: msg.id,
      received_at: receivedAt,
    });
    return;
  }

  const agentId = agentRow.id as string;

  // Try matching to an owner_lead by owner_phone
  const { data: ownerLead } = await svc
    .from("owner_leads")
    .select("id, owner_name")
    .eq("user_id", agentId)
    .eq("owner_phone", fromNumber)
    .is("deleted_at", null)
    .maybeSingle();

  // Try matching to a tenancy by tenant_phone (only if not an owner_lead match)
  const { data: tenancy } = !ownerLead
    ? await svc
        .from("tenancies")
        .select("id, tenant_name")
        .eq("user_id", agentId)
        .eq("tenant_phone", fromNumber)
        .is("deleted_at", null)
        .maybeSingle()
    : { data: null };

  // If the reply is from a property owner, find ALL linked tenancies so we can
  // set replied_owner on every renewal card (one owner can have multiple tenancies)
  const { data: ownerTenancies } = ownerLead
    ? await svc
        .from("tenancies")
        .select("id")
        .eq("user_id", agentId)
        .eq("owner_lead_id", ownerLead.id)
        .is("deleted_at", null)
    : { data: null };

  const cardId: string | null = ownerLead?.id ?? tenancy?.id ?? null;
  const cardType: string | null = ownerLead ? "owner_lead" : tenancy ? "tenancy" : null;
  const cardName: string | null = ownerLead?.owner_name ?? tenancy?.tenant_name ?? null;

  // Insert the inbound message log
  await svc.from("whatsapp_messages").insert({
    user_id: agentId,
    card_id: cardId,
    card_type: cardType,
    direction: "inbound",
    from_number: fromNumber,
    to_number: toNumber,
    message_text: messageText,
    wa_message_id: msg.id,
    received_at: receivedAt,
  });

  if (cardId && cardType) {
    const table = cardType === "owner_lead" ? "owner_leads" : "tenancies";
    await svc
      .from(table)
      .update({
        last_wa_reply_at: receivedAt,
        last_wa_reply_text: messageText,
        wa_status: "replied",
      })
      .eq("id", cardId);

    // Classify intent and update the relevant card — only push when intent is clear
    const snippet = messageText.length > 100 ? messageText.slice(0, 97) + "..." : messageText;

    if (cardType === "tenancy") {
      const intent = await classifyWaReply(messageText, "tenant");
      if (intent !== "unclear") {
        await svc.from("tenancies").update({ replied_tenant: intent }).eq("id", cardId);

        // Fetch property/unit for this tenancy via owner_lead join
        const { data: tRow } = await svc.from("tenancies").select("property_name, owner_lead_id").eq("id", cardId).maybeSingle();
        const ownerLeadIdForUnit = tRow?.owner_lead_id ?? null;
        const { data: olRow } = ownerLeadIdForUnit
          ? await svc.from("owner_leads").select("unit").eq("id", ownerLeadIdForUnit).maybeSingle()
          : { data: null };
        const tUnit = olRow?.unit ?? null;
        const tPropParts = [tRow?.property_name, tUnit ? `Unit ${tUnit}` : null].filter(Boolean);
        const tPropLabel = tPropParts.length ? tPropParts.join(" · ") : null;
        const tBody = tPropLabel ? `${tPropLabel} — view in Existing listing` : "View in Existing listing";

        const tDeepLink = `/existing-listing?highlight=${cardId}`;
        const tTitle = intent === "yes" ? "Renewal confirmed" : "Tenant not renewing";
        const tBodyFull = tPropLabel ? `${tPropLabel} · ${cardName ?? "Tenant"} — view in Existing listing` : `${cardName ?? "Tenant"} — view in Existing listing`;
        await sendPushToUser(agentId, {
          title: tTitle,
          body: tBodyFull,
          url: tDeepLink,
          tag: `wa-reply-${cardId}`,
        });
        sendAgentEmail(
          agentId,
          tTitle,
          waReplyTenantEmail({ tenantName: cardName ?? "Tenant", intent, propLabel: tPropLabel, url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://kakisewa.com"}${tDeepLink}` })
        ).catch(() => {});
      }
    } else if (cardType === "owner_lead") {
      const intent = await classifyWaReply(messageText, "owner");
      if (ownerTenancies && ownerTenancies.length > 0) {
        const tenancyIds = ownerTenancies.map((t: { id: string }) => t.id);
        await svc
          .from("tenancies")
          .update({
            ...(intent !== "unclear" ? { replied_owner: intent } : {}),
            last_wa_reply_at: receivedAt,
            last_wa_reply_text: messageText,
            wa_status: "replied",
          })
          .in("id", tenancyIds);
      }
      if (intent !== "unclear") {
        // Fetch property/unit for this owner lead
        const { data: olRow } = await svc.from("owner_leads").select("property_name, unit").eq("id", cardId).maybeSingle();
        const oPropParts = [olRow?.property_name, olRow?.unit ? `Unit ${olRow.unit}` : null].filter(Boolean);
        const oPropLabel = oPropParts.length ? oPropParts.join(" · ") : null;
        const oBody = oPropLabel ? `${oPropLabel} — view in Potential listing` : "View in Potential listing";

        const oDeepLink = `/potential-listing?highlight=${cardId}`;
        const oTitle = intent === "yes" ? "Owner wants to list" : "Owner not interested";
        const oBodyFull = oPropLabel ? `${oPropLabel} · ${cardName ?? "Owner"} — view in Potential listing` : `${cardName ?? "Owner"} — view in Potential listing`;
        await sendPushToUser(agentId, {
          title: oTitle,
          body: oBodyFull,
          url: oDeepLink,
          tag: `wa-reply-${cardId}`,
        });
        sendAgentEmail(
          agentId,
          oTitle,
          waReplyOwnerEmail({ ownerName: cardName ?? "Owner", intent, propLabel: oPropLabel, url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://kakisewa.com"}${oDeepLink}` })
        ).catch(() => {});
      }
    }
  } else {
    console.warn("[whatsapp/webhook] unmatched number", fromNumber, "for agent", agentId);
  }
}

// Strip leading + to normalise to E.164 without prefix (e.g. 60198765432)
function normalizePhone(phone: string): string {
  return phone.replace(/^\+/, "").trim();
}
