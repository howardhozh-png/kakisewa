/**
 * One-time script: registers the kakisewa WhatsApp webhook with Meta.
 *
 * Run AFTER the webhook endpoint is publicly reachable (production deploy or ngrok):
 *   npx tsx scripts/register-whatsapp-webhook.ts
 *
 * For local testing via ngrok:
 *   ngrok http 3000
 *   WHATSAPP_CALLBACK_URL=https://<your-ngrok-id>.ngrok-free.app npx tsx scripts/register-whatsapp-webhook.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const APP_ID        = process.env.WHATSAPP_APP_ID;
const SYSTEM_TOKEN  = process.env.WHATSAPP_SYSTEM_TOKEN;
const VERIFY_TOKEN  = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
const CALLBACK_URL  = process.env.WHATSAPP_CALLBACK_URL ?? "https://www.kakisewa.com/api/webhooks/whatsapp";

if (!APP_ID || !SYSTEM_TOKEN || !VERIFY_TOKEN) {
  console.error("Missing required env vars: WHATSAPP_APP_ID, WHATSAPP_SYSTEM_TOKEN, WHATSAPP_WEBHOOK_VERIFY_TOKEN");
  process.exit(1);
}

async function register() {
  console.log(`Registering webhook: ${CALLBACK_URL}`);
  console.log(`App ID: ${APP_ID}`);

  const body = new URLSearchParams({
    object:       "whatsapp_business_account",
    callback_url: CALLBACK_URL,
    verify_token: VERIFY_TOKEN!,
    fields:       "messages",
    access_token: SYSTEM_TOKEN!,
  });

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${APP_ID}/subscriptions`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    body.toString(),
    }
  );

  const data = await res.json() as Record<string, unknown>;

  if (res.ok && data.success) {
    console.log("Webhook registered successfully.");
    console.log("Meta will now send incoming messages to:", CALLBACK_URL);
  } else {
    console.error("Registration failed:", JSON.stringify(data, null, 2));
    process.exit(1);
  }
}

register().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
