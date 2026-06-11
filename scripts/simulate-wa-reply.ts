#!/usr/bin/env tsx
/**
 * Simulates an inbound WhatsApp reply from Meta's webhook.
 * Usage:
 *   npx tsx scripts/simulate-wa-reply.ts [message]
 *
 * Defaults: from=60107609699, message="Ok boleh renew"
 */

import { createHmac } from "crypto";
import * as fs from "fs";
import * as path from "path";

// Load .env.local
const envPath = path.join(process.cwd(), ".env.local");
const envVars: Record<string, string> = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim();
  }
}

const WEBHOOK_URL = "http://localhost:3000/api/webhooks/whatsapp";
const APP_SECRET = envVars.WHATSAPP_APP_SECRET ?? "";
const PHONE_NUMBER_ID = "test-phone-id-123"; // must match agent_profiles.whatsapp_phone_number_id
const DISPLAY_NUMBER = "60123456789";

const fromNumber = process.argv[2]?.match(/^\d/) ? process.argv[2] : "60107609699";
const messageText = process.argv.slice(fromNumber !== process.argv[2] ? 2 : 3).join(" ") || "Ok boleh renew";

const waMessageId = `wamid.test.${Date.now()}`;
const timestamp = Math.floor(Date.now() / 1000).toString();

const payload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "test-waba-id",
      changes: [
        {
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: DISPLAY_NUMBER,
              phone_number_id: PHONE_NUMBER_ID,
            },
            messages: [
              {
                from: fromNumber,
                id: waMessageId,
                timestamp,
                type: "text",
                text: { body: messageText },
              },
            ],
          },
          field: "messages",
        },
      ],
    },
  ],
};

const body = JSON.stringify(payload);

// Compute HMAC signature (same as Meta sends)
const sig = APP_SECRET
  ? "sha256=" + createHmac("sha256", APP_SECRET).update(body).digest("hex")
  : "";

console.log(`\nSimulating inbound WA reply:`);
console.log(`  From:    +${fromNumber}`);
console.log(`  Message: "${messageText}"`);
console.log(`  WA ID:   ${waMessageId}`);
console.log(`  HMAC:    ${sig ? "computed" : "skipped (no secret)"}\n`);

async function run() {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sig ? { "x-hub-signature-256": sig } : {}),
    },
    body,
  });

  console.log(`Webhook responded: ${res.status} ${res.statusText}`);
  if (res.status === 200) {
    console.log(`\nProcessing is async — check the lifecycle board in 1-2 seconds.`);
    console.log(`Expected: wa_status → "replied", replied_tenant → "yes"/"no"/"unclear"`);
  } else {
    const text = await res.text();
    console.log(`Body: ${text}`);
  }
}

run().catch(console.error);
