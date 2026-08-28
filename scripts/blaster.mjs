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
import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL  = "https://binqdtfvyhipgwpiarkb.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbnFkdGZ2eWhpcGd3cGlhcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTgxODQsImV4cCI6MjA5NTU3NDE4NH0.yxf1i4d-rI2G4MHq6bv4zVc89MBjJDQezoJ8QhVGBqQ";
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KAKI_TOKEN    = process.env.KAKI_TOKEN;    // user access token
const KAKI_REFRESH  = process.env.KAKI_REFRESH;  // user refresh token
const AUTH_FOLDER   = join(dirname(fileURLToPath(import.meta.url)), "blaster-auth");
const MYT_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8

if (!SERVICE_KEY && !KAKI_TOKEN) {
  console.error("✗ No auth credentials found.");
  console.error("  Get your personal command from kakisewa.com → Property Leads → WA Blast → Link WhatsApp.");
  process.exit(1);
}

// ── Supabase client ───────────────────────────────────────────────────────────

let db;
let USER_ID;

if (SERVICE_KEY) {
  // Developer / admin mode — full access, USER_ID from arg/env/default
  db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  USER_ID = (() => {
    const idx = process.argv.indexOf("--user-id");
    if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
    if (process.env.BLASTER_USER_ID) return process.env.BLASTER_USER_ID;
    return "ccf39c9b-fe61-4d63-b008-bdc0ce952187";
  })();
} else {
  // User mode — authenticate with personal token
  db = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
  const { data, error } = await db.auth.setSession({
    access_token: KAKI_TOKEN,
    refresh_token: KAKI_REFRESH || KAKI_TOKEN,
  });
  if (error || !data.user) {
    console.error("✗ Token invalid or expired. Get a fresh command from kakisewa.com → Link WhatsApp.");
    process.exit(1);
  }
  USER_ID = data.user.id;
  console.log(`✓ Authenticated as ${data.user.email}\n`);
}

const DEFAULT_CONFIG = {
  interval_minutes: 10,
  daily_cap: 1,
  windows: [{ start: "10:00", end: "19:00" }],
  is_active: true,
};


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

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.clear();
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("  kakisewa WA Blaster — scan to connect");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      qrcode.generate(qr, { small: true });
      console.log("\n  Open kakisewa → WA Blast → Link WhatsApp to scan\n");
      // Write QR to Supabase so the web UI can display it
      try {
        const dataUrl = await QRCode.toDataURL(qr, { width: 256, margin: 2 });
        await db.from("wa_sessions").upsert(
          { user_id: USER_ID, qr_data_url: dataUrl, is_authenticated: false, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      } catch (e) { console.error("QR upload error:", e.message); }
    }

    if (connection === "open") {
      isConnected = true;
      console.log(`\n✓ WhatsApp connected  [user: ${USER_ID.slice(0, 8)}...]\n`);
      try {
        await db.from("wa_sessions").upsert(
          { user_id: USER_ID, qr_data_url: null, is_authenticated: true, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      } catch { /* ignore */ }
    }

    if (connection === "close") {
      isConnected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log("\nLogged out — clearing saved session so next run shows a fresh QR.\n");
        // Delete stale auth files so next run generates a new QR instead of
        // trying to restore an invalid session
        try {
          const { readdir, unlink } = await import("fs/promises");
          const files = await readdir(AUTH_FOLDER);
          await Promise.all(files.map(f => unlink(join(AUTH_FOLDER, f))));
          console.log("  Session cleared. Run the command again to get a new QR.\n");
        } catch { /* ignore */ }
        try {
          await db.from("wa_sessions").upsert(
            { user_id: USER_ID, qr_data_url: null, is_authenticated: false, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
        } catch { /* ignore */ }
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

async function checkRelink() {
  try {
    const { data } = await db
      .from("wa_sessions")
      .select("relink_requested")
      .eq("user_id", USER_ID)
      .maybeSingle();
    if (data?.relink_requested) {
      console.log("\n↩ Relink requested from app — logging out old session...\n");
      await db.from("wa_sessions").upsert(
        { user_id: USER_ID, relink_requested: false, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      if (sock) await sock.logout();
      // loggedOut event will clear auth files and exit
    }
  } catch { /* ignore */ }
}

async function poll() {
  await checkRelink();
  // Heartbeat — web UI uses updated_at to detect offline blaster
  if (isConnected) {
    try {
      await db.from("wa_sessions").upsert(
        { user_id: USER_ID, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    } catch { /* ignore */ }
  }
  const config = await fetchConfig();
  lastKnownIsActive = config.is_active; // keep fast-check in sync

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

// Stored so fastCheck can cancel it when activation is detected
let pendingPollTimer = null;

function schedule(intervalMinutes) {
  const ms = intervalMinutes * 60 * 1000;
  console.log(`  Next poll in ${intervalMinutes} min.\n`);
  pendingPollTimer = setTimeout(poll, ms);
  // Keep the fast-check loop running between polls
  scheduleFastCheck();
}

// ── Fast-check: detects Activate click within ~30s ────────────────────────────

let lastKnownIsActive = null; // null = not yet established
let fastCheckTimer = null;

function scheduleFastCheck() {
  if (fastCheckTimer) clearTimeout(fastCheckTimer);
  fastCheckTimer = setTimeout(fastCheck, 30 * 1000);
}

async function fastCheck() {
  fastCheckTimer = null;
  try {
    const { data } = await db
      .from("wa_blast_config")
      .select("is_active")
      .eq("user_id", USER_ID)
      .maybeSingle();
    const isActive = data?.is_active ?? false;

    if (lastKnownIsActive === false && isActive === true) {
      // User just clicked Activate — fire immediately
      console.log(`[${nowMYT()} MYT] Activation detected — firing immediately.`);
      if (pendingPollTimer) { clearTimeout(pendingPollTimer); pendingPollTimer = null; }
      lastKnownIsActive = true;
      poll(); // poll() calls schedule() which restarts fast-check
      return;
    }
    lastKnownIsActive = isActive;
  } catch { /* ignore */ }
  scheduleFastCheck();
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  kakisewa WA Blaster");
console.log(`  User: ${USER_ID}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

await connect();

// Give WA socket 2s to restore session, then poll + start fast-check loop
setTimeout(async () => {
  // Establish baseline is_active state before starting fast-check
  try {
    const { data } = await db.from("wa_blast_config").select("is_active").eq("user_id", USER_ID).maybeSingle();
    lastKnownIsActive = data?.is_active ?? false;
  } catch { lastKnownIsActive = false; }
  poll();
  scheduleFastCheck();
}, 2000);
