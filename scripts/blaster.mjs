/**
 * kakisewa WA Blaster — production poller
 *
 * Runs on the agent's laptop. Reads `wa_blast_queue` from Supabase, sends via
 * Baileys (WhatsApp Web protocol), then logs to `whatsapp_log` and increments
 * `owner_leads.outreach_count`.
 *
 * Usage:
 *   node scripts/blaster.mjs [--user-id <uuid>]
 *
 * On first run: scan the QR code in the terminal with WhatsApp > Linked Devices > +
 * Session is saved to scripts/blaster-auth/ — no re-scan on next run.
 *
 * Config (wa_blast_config table, per user):
 *   poll_interval_minutes  — how often to check the queue (default: 10)
 *   max_per_run            — max messages per poll cycle (default: 1)
 *   time_windows           — array of {start:"HH:MM", end:"HH:MM"} in MYT (default: 08:00–22:00)
 *   is_active              — false = pause blasting without stopping the script
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import { createClient } from "@supabase/supabase-js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL  = "https://binqdtfvyhipgwpiarkb.supabase.co";
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AUTH_FOLDER   = join(dirname(fileURLToPath(import.meta.url)), "blaster-auth");
const MYT_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8

// Derive user_id from CLI arg or env, with fallback to Howard's id for testing
const USER_ID = (() => {
  const idx = process.argv.indexOf("--user-id");
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  if (process.env.BLASTER_USER_ID) return process.env.BLASTER_USER_ID;
  return "ccf39c9b-fe61-4d63-b008-bdc0ce952187"; // Howard (test default)
})();

const DEFAULT_CONFIG = {
  interval_minutes: 10,
  daily_cap: 1,
  windows: [{ start: "08:00", end: "22:00" }],
  is_active: true,
};

// ── Supabase ──────────────────────────────────────────────────────────────────

if (!SERVICE_KEY) {
  console.error("✗ SUPABASE_SERVICE_ROLE_KEY not set. Pass it as an env var.");
  console.error("  Example: SUPABASE_SERVICE_ROLE_KEY=... node scripts/blaster.mjs");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── Time window check ─────────────────────────────────────────────────────────

function nowMYT() {
  const utcMs = Date.now();
  const mytMs = utcMs + MYT_OFFSET_MS;
  const d = new Date(mytMs);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isInWindow(windows) {
  const now = nowMYT();
  for (const w of windows) {
    if (now >= w.start && now <= w.end) return true;
  }
  return false;
}

// ── Queue operations ───────────────────────────────────────────────────────────

async function fetchConfig() {
  const { data } = await db
    .from("wa_blast_config")
    .select("interval_minutes, daily_cap, windows, is_active")
    .eq("user_id", USER_ID)
    .maybeSingle();
  if (!data) return DEFAULT_CONFIG;
  return {
    interval_minutes: data.interval_minutes ?? DEFAULT_CONFIG.interval_minutes,
    daily_cap: data.daily_cap ?? DEFAULT_CONFIG.daily_cap,
    windows: data.windows ?? DEFAULT_CONFIG.windows,
    is_active: data.is_active ?? DEFAULT_CONFIG.is_active,
  };
}

async function fetchPending(limit) {
  const { data, error } = await db
    .from("wa_blast_queue")
    .select("id, owner_lead_id, phone, message")
    .eq("user_id", USER_ID)
    .eq("status", "pending")
    .order("position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) { console.error("Queue fetch error:", error.message); return []; }
  return data ?? [];
}

async function markSent(queueId, ownerLeadId, phone) {
  const now = new Date().toISOString();
  await db.from("wa_blast_queue").update({ status: "sent", sent_at: now }).eq("id", queueId);
  // Log to whatsapp_log
  const logId = `wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.from("whatsapp_log").insert({
    id: logId,
    user_id: USER_ID,
    related_id: ownerLeadId,
    related_type: "owner_lead",
    template: "owner_outreach_initial",
    recipient_phone: phone,
    channel: "wa_blaster",
  });
  // Increment outreach_count (fetch + update)
  const { data: lead } = await db
    .from("owner_leads")
    .select("outreach_count")
    .eq("id", ownerLeadId)
    .maybeSingle();
  const cur = lead?.outreach_count ?? 0;
  await db.from("owner_leads").update({ outreach_count: cur + 1 }).eq("id", ownerLeadId);
}

async function markFailed(queueId, reason) {
  await db.from("wa_blast_queue").update({ status: "failed", error: reason }).eq("id", queueId);
  console.error(`  ✗ Failed (${reason}) — row marked as failed.`);
}

// ── WA socket ─────────────────────────────────────────────────────────────────

let sock = null;
let isConnected = false;
let reconnectTimer = null;

async function connect() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: { level: "silent", trace(){}, debug(){}, info(){}, warn(){}, error(){}, fatal(){}, child(){ return this; } },
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.clear();
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("  kakisewa WA Blaster — scan to connect");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      qrcode.generate(qr, { small: true });
      console.log("\n  Open WhatsApp → Linked Devices → +\n");
    }

    if (connection === "open") {
      isConnected = true;
      console.log(`\n✓ WhatsApp connected  [user: ${USER_ID.slice(0, 8)}...]\n`);
    }

    if (connection === "close") {
      isConnected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log("\nLogged out. Delete scripts/blaster-auth/ and re-run.\n");
        process.exit(1);
      }
      console.log("  Connection dropped — reconnecting in 5s...");
      reconnectTimer = setTimeout(connect, 5000);
    }
  });
}

async function sendWA(phone, message) {
  if (!isConnected || !sock) throw new Error("Not connected");
  const jid = `${phone}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text: message });
}

// ── Poll loop ─────────────────────────────────────────────────────────────────

async function poll() {
  const config = await fetchConfig();

  if (!config.is_active) {
    console.log(`[${nowMYT()} MYT] Blaster paused (is_active=false). Sleeping.`);
    return schedule(config.interval_minutes);
  }

  if (!isInWindow(config.windows)) {
    const label = config.windows.map(w => `${w.start}-${w.end}`).join(", ");
    console.log(`[${nowMYT()} MYT] Outside send window (${label}). Sleeping.`);
    return schedule(config.interval_minutes);
  }

  if (!isConnected) {
    console.log(`[${nowMYT()} MYT] WA not connected. Waiting for connection.`);
    return schedule(config.interval_minutes);
  }

  const rows = await fetchPending(config.daily_cap);
  if (rows.length === 0) {
    console.log(`[${nowMYT()} MYT] Queue empty. Sleeping.`);
    return schedule(config.interval_minutes);
  }

  console.log(`[${nowMYT()} MYT] Sending ${rows.length} message(s)...`);

  for (const row of rows) {
    try {
      await sendWA(row.phone, row.message);
      await markSent(row.id, row.owner_lead_id, row.phone);
      console.log(`  ✓ Sent to ${row.phone}  (lead: ${row.owner_lead_id})`);
      // Brief gap between messages to avoid WA rate limits
      if (rows.length > 1) await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      await markFailed(row.id, err.message);
    }
  }

  schedule(config.interval_minutes);
}

function schedule(intervalMinutes) {
  const ms = intervalMinutes * 60 * 1000;
  console.log(`  Next poll in ${intervalMinutes} min.\n`);
  setTimeout(poll, ms);
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  kakisewa WA Blaster");
console.log(`  User: ${USER_ID}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

await connect();

// Give WA socket 2s to restore session before first poll
setTimeout(poll, 2000);
