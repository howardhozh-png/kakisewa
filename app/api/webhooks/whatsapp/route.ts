import { NextRequest, NextResponse } from "next/server";
import { upsertTenancyByPhone } from "@/lib/db";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "kakisewa_webhook_token";

// ─── GET — Meta webhook verification handshake ────────────────────────────────

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (
    p.get("hub.mode") === "subscribe" &&
    p.get("hub.verify_token") === VERIFY_TOKEN
  ) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// ─── POST — Incoming message handler ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  // Support both Meta Cloud API shape and Twilio shape
  const messages = extractMessages(payload);

  for (const msg of messages) {
    await handleMessage(msg);
  }

  return NextResponse.json({ ok: true });
}

// ─── Message extraction ───────────────────────────────────────────────────────

interface IncomingMessage {
  from: string;        // E.164 phone number e.g. "601234567890"
  text: string;        // message body
  messageId: string;
}

function extractMessages(payload: Record<string, unknown>): IncomingMessage[] {
  const out: IncomingMessage[] = [];

  // Meta Cloud API shape
  try {
    const entry = (payload.entry as Array<Record<string, unknown>>)?.[0];
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = changes?.value as Record<string, unknown> | undefined;
    const msgs = value?.messages as Array<Record<string, unknown>> | undefined;
    if (msgs) {
      for (const m of msgs) {
        const text = (m.text as Record<string, unknown>)?.body as string | undefined;
        if (m.from && text) {
          out.push({ from: String(m.from), text, messageId: String(m.id ?? "") });
        }
      }
      return out;
    }
  } catch { /* fall through */ }

  // Twilio shape
  try {
    if (payload.From && payload.Body) {
      out.push({
        from: String(payload.From).replace(/^whatsapp:/, ""),
        text: String(payload.Body),
        messageId: String(payload.MessageSid ?? ""),
      });
    }
  } catch { /* fall through */ }

  return out;
}

// ─── Message handler ──────────────────────────────────────────────────────────

const CMD_NEW   = /^NEW\s+(.+)/i;
//  NEW <name> <phone> <amount> <due_day> <property_id>
//  e.g. NEW Ahmad 60187654321 1800 1 prop_1

async function handleMessage(msg: IncomingMessage) {
  const text = msg.text.trim();

  const newMatch = CMD_NEW.exec(text);
  if (newMatch) {
    await handleNewTenancy(msg.from, newMatch[1]);
    return;
  }

  // Unknown command — silently ignore (don't send noise back)
}

async function handleNewTenancy(senderPhone: string, args: string) {
  const parts = args.trim().split(/\s+/);
  // Expect: <name> <phone> <amount> <due_day> [property_id]
  if (parts.length < 4) return;

  const [name, phone, amountStr, dueDayStr, propertyId] = parts;
  const amount = parseFloat(amountStr);
  const due_day = parseInt(dueDayStr, 10);

  if (!name || !phone || isNaN(amount) || isNaN(due_day)) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  const tenancy = await upsertTenancyByPhone(phone, {
    tenant_name: name,
    tenant_phone: phone,
    amount,
    due_day,
    property_id: propertyId ?? "prop_1",
    status: "Pending",
    current_month_paid: false,
    lhdn_status: "none",
  });

  const uploadUrl = `${baseUrl}/upload/${tenancy.id}`;

  // Send PROOF_REQUEST via WhatsApp (log only — actual send requires API credentials)
  const proofRequest = buildProofRequest(name, uploadUrl);
  logOutboundMessage(phone, proofRequest);
}

// ─── Message templates ────────────────────────────────────────────────────────

export function buildReminderMessage(
  tenantName: string,
  propertyName: string,
  amount: number,
): string {
  return (
    `Hi ${tenantName}, your rent for ${propertyName} is due soon (RM${amount.toLocaleString()}). ` +
    `Please transfer and upload your receipt as soon as possible. Thank you!`
  );
}

export function buildProofRequest(tenantName: string, uploadUrl: string): string {
  return (
    `Hi ${tenantName}, please upload your transfer screenshot here: ${uploadUrl}\n\n` +
    `This link is unique to your account. Reply NEW to register a new tenancy.`
  );
}

function logOutboundMessage(to: string, body: string) {
  // In production: call Meta Cloud API or Twilio to send message
  // For now, structured log for observability
  console.log(JSON.stringify({ type: "whatsapp_outbound", to, body, ts: new Date().toISOString() }));
}
