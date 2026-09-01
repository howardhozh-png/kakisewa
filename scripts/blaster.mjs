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
import { createRequire } from "module";
import { join } from "path";
import os from "os";

// Node.js < 22 has no stable native WebSocket — load ws as transport for Supabase.
// Auto-installs ws if missing so this works even with an old setup.
const _require = createRequire(import.meta.url);
let wsTransport = null;
if (parseInt(process.versions.node) < 22) {
  try {
    wsTransport = _require("ws");
  } catch {
    const { execSync } = _require("child_process");
    console.log("Installing ws package for WebSocket support...");
    execSync("npm install ws --silent", {
      cwd: join(os.homedir(), ".kakisewa"),
      stdio: ["pipe", "pipe", "inherit"],
    });
    wsTransport = _require("ws");
  }
}
const supabaseRealtime = wsTransport ? { realtime: { transport: wsTransport } } : {};

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL  = "https://binqdtfvyhipgwpiarkb.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbnFkdGZ2eWhpcGd3cGlhcmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTgxODQsImV4cCI6MjA5NTU3NDE4NH0.yxf1i4d-rI2G4MHq6bv4zVc89MBjJDQezoJ8QhVGBqQ";
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KAKI_TOKEN    = process.env.KAKI_TOKEN;    // user access token
const KAKI_REFRESH  = process.env.KAKI_REFRESH;  // user refresh token
const AUTH_FOLDER   = join(os.homedir(), ".kakisewa", "blaster-auth");
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
  db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false }, ...supabaseRealtime });
  USER_ID = (() => {
    const idx = process.argv.indexOf("--user-id");
    if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
    if (process.env.BLASTER_USER_ID) return process.env.BLASTER_USER_ID;
    return "ccf39c9b-fe61-4d63-b008-bdc0ce952187";
  })();
} else {
  // User mode — authenticate with personal token
  db = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false }, ...supabaseRealtime });
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

const SITE_URL = "https://kakisewa.com";

// Default body for owner_intake_form — mirrors lib/whatsapp-templates.ts
const DEFAULT_INTAKE_BODY =
`{{ownerGreeting}}I'm {{firstName}} ({{renNumber}}) from {{company}}. If you're looking to rent out {{propertyName}}, I have quality tenants ready.

Please reply *YES* if you're interested and I'll get started right away, or *NO* if not.

Alternatively, for a much faster response you can use our protected kakisewa link:
{{listingForm}}

Here's a sample tenant package I put together for you:
{{tenantSamplePack}}`;

// Inline template resolver — mirrors resolveTemplate() in lib/whatsapp-templates.ts
function resolveMsg(body, vars) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

// Fetch agent profile (name, REN, agency, custom templates) — called once per poll
async function fetchAgentProfile() {
  const { data } = await db
    .from("agent_profiles")
    .select("name, ren_number, agency, whatsapp_templates")
    .eq("id", USER_ID)
    .maybeSingle();
  if (!data) return null;
  let overrides = {};
  try { if (data.whatsapp_templates) overrides = JSON.parse(data.whatsapp_templates); } catch {}
  return {
    name: data.name ?? "",
    renNumber: data.ren_number ?? "",
    agency: data.agency ?? "",
    templateBody: overrides.owner_intake_form ?? DEFAULT_INTAKE_BODY,
  };
}

// Fetch lead data needed to resolve the template
async function fetchLeadData(ownerLeadId) {
  const { data } = await db
    .from("owner_leads")
    .select("owner_name, property_name, unit, intake_token")
    .eq("id", ownerLeadId)
    .maybeSingle();
  return data ?? null;
}

// Build the send-time message from the agent's live template
function buildLiveMessage(agentProfile, lead) {
  const { name, renNumber, agency, templateBody } = agentProfile;
  const firstName = name.trim().split(/\s+/)[0] ?? name;
  const propertyLabel = lead.property_name
    ? (lead.unit ? `${lead.property_name}, Unit ${lead.unit}` : lead.property_name)
    : "your property";
  const listingForm = lead.intake_token ? `${SITE_URL}/o/${lead.intake_token}` : SITE_URL;
  const ownerFirst = lead.owner_name ? lead.owner_name.trim().split(/\s+/)[0] : null;
  return resolveMsg(templateBody, {
    ownerGreeting: ownerFirst ? `Hi ${ownerFirst},\n\n` : "",
    firstName,
    ownerName: lead.owner_name ?? "",
    renNumber,
    company: agency,
    propertyName: propertyLabel,
    listingForm,
    tenantSamplePack: `${SITE_URL}/sample-pack`,
    // Legacy fallback vars for any old custom text using owner_outreach_initial tokens
    agentName: name,
    agencyLine: agency ? ` from ${agency}` : "",
  });
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

async function markSent(queueId, ownerLeadId, phone, recipientName, body) {
  const now = new Date().toISOString();
  const { error: qErr } = await db.from("wa_blast_queue").update({ status: "sent", sent_at: now }).eq("id", queueId);
  if (qErr) console.error("  ✗ Queue update failed:", qErr.message);
  // Log to whatsapp_log
  const logId = `wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const { error: logErr } = await db.from("whatsapp_log").insert({
    id: logId,
    user_id: USER_ID,
    related_id: ownerLeadId,
    related_type: "owner_lead",
    template: "owner_intake_form",
    recipient_phone: phone,
    recipient_name: recipientName ?? null,
    body: body ?? null,
    channel: "wa_blaster",
  });
  if (logErr) console.error("  ✗ Log insert failed:", logErr.message);
  // Increment outreach_count and stamp last_outreach_at (drives "Last Sent" column)
  const { data: lead, error: leadFetchErr } = await db
    .from("owner_leads")
    .select("outreach_count")
    .eq("id", ownerLeadId)
    .maybeSingle();
  if (leadFetchErr) { console.error("  ✗ Lead fetch failed:", leadFetchErr.message); return; }
  const cur = lead?.outreach_count ?? 0;
  const { error: leadUpdateErr } = await db.from("owner_leads")
    .update({ outreach_count: cur + 1, last_outreach_at: now })
    .eq("id", ownerLeadId);
  if (leadUpdateErr) console.error("  ✗ Lead update failed:", leadUpdateErr.message);
}

async function markFailed(queueId, reason) {
  await db.from("wa_blast_queue").update({ status: "failed", error: reason }).eq("id", queueId);
  console.error(`  ✗ Failed (${reason}) — row marked as failed.`);
}

// ── WA socket ─────────────────────────────────────────────────────────────────

let sock = null;
let isConnected = false;
let reconnectTimer = null;
let plannedDisconnect = false; // set before sock.end() so close handler doesn't auto-reconnect

async function safeConnect(delayMs = 5_000) {
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try {
      await connect();
    } catch (e) {
      console.error("  Reconnect attempt failed:", e.message, "— retrying in 15s...");
      safeConnect(15_000);
    }
  }, delayMs);
}

async function connect() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: { level: "silent", trace(){}, debug(){}, info(){}, warn(){}, error(){}, fatal(){}, child(){ return this; } },
    markOnlineOnConnect: false, // prevents WA from suppressing phone notifications
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
      // Tell WA this linked device is offline so incoming reply notifications
      // route to the phone, not the blaster session
      try { await sock.sendPresenceUpdate("unavailable"); } catch { /* ignore */ }
      try {
        await db.from("wa_sessions").upsert(
          { user_id: USER_ID, qr_data_url: null, is_authenticated: true, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      } catch { /* ignore */ }
      // Fire first poll immediately on initial connect; on reconnect cancel the
      // scheduled poll and fire right away so messages go out without waiting
      if (!firstPollFired) {
        startFirstPoll();
      } else {
        if (pendingPollTimer) { clearTimeout(pendingPollTimer); pendingPollTimer = null; }
        poll();
      }
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
          console.log("  Session cleared — restarting for QR scan...\n");
        } catch { /* ignore */ }
        try {
          await db.from("wa_sessions").upsert(
            { user_id: USER_ID, qr_data_url: null, is_authenticated: false, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
        } catch { /* ignore */ }
        process.exit(2); // exit code 2 = relink requested; shell wrapper restarts automatically
      }
      if (plannedDisconnect) {
        plannedDisconnect = false;
        console.log("  Disconnected after sends — will reconnect at next poll.\n");
        // Do NOT reconnect now; the next poll timer will call connect()
      } else {
        console.log("  Connection dropped — reconnecting in 5s...");
        safeConnect(5_000);
      }
    }
  });
}

async function sendWA(phone, message) {
  if (!isConnected || !sock) throw new Error("Not connected");
  const jid = `${phone}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text: message });
  // Re-assert unavailable so WA routes incoming notifications to the phone
  try { await sock.sendPresenceUpdate("unavailable"); } catch { /* ignore */ }
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
  if (pollRunning) {
    console.log(`[${nowMYT()} MYT] Poll already in progress — skipping.`);
    return;
  }
  pollRunning = true;
  try {
    await _poll();
  } finally {
    pollRunning = false;
  }
}

async function _poll() {
  stopBar();
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
    console.log(`[${nowMYT()} MYT] WA not connected. Connecting...`);
    connect().catch(e => {
      console.error("Connect error:", e.message, "— retrying in 30s...");
      schedule(0.5);
    });
    return; // poll will be re-triggered by the "open" handler on connect
  }

  const rows = await fetchPending(config.daily_cap);
  if (rows.length === 0) {
    console.log(`[${nowMYT()} MYT] Queue empty. Sleeping.`);
    return schedule(config.interval_minutes);
  }

  // Fetch live template once per poll — always uses the agent's latest saved version
  const agentProfile = await fetchAgentProfile().catch(() => null);

  console.log(`[${nowMYT()} MYT] Sending ${rows.length} message(s)...`);

  for (const row of rows) {
    try {
      // Resolve message from live template at send time so changes take effect immediately
      let message = row.message; // fallback: baked message stored at queue time
      let lead = null;
      if (agentProfile) {
        lead = await fetchLeadData(row.owner_lead_id).catch(() => null);
        if (lead) message = buildLiveMessage(agentProfile, lead);
      }
      await sendWA(row.phone, message);
      await markSent(row.id, row.owner_lead_id, row.phone, lead?.owner_name ?? null, message);
      console.log(`  ✓ Sent to ${row.phone}  (lead: ${row.owner_lead_id})`);
      // Brief gap between messages to avoid WA rate limits
      if (rows.length > 1) await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      await markFailed(row.id, err.message);
    }
  }

  // Disconnect after sends so WA routes incoming notifications to the phone.
  // The session reconnects fresh at the next poll cycle.
  plannedDisconnect = true;
  isConnected = false;
  if (sock) sock.end(undefined);

  schedule(config.interval_minutes);
}

// Stored so fastCheck can cancel it when activation is detected
let pendingPollTimer = null;

// Guard against concurrent poll() calls (e.g. WA reconnect fires poll() while one is already running)
let pollRunning = false;

function schedule(intervalMinutes) {
  const ms = intervalMinutes * 60 * 1000;
  console.log(`  Next poll in ${intervalMinutes} min.\n`);
  pendingPollTimer = setTimeout(poll, ms);
  // Keep the fast-check loop running between polls
  scheduleFastCheck();
}

// ── Fast-check: detects Activate click within ~10s ────────────────────────────

let lastKnownIsActive = null; // null = not yet established
let fastCheckTimer = null;

function scheduleFastCheck() {
  if (fastCheckTimer) clearTimeout(fastCheckTimer);
  fastCheckTimer = setTimeout(fastCheck, 10 * 1000);
  startBar(10_000, 'until next check');
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
      stopBar();
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

// ── Terminal countdown bar ────────────────────────────────────────────────────
// Renders a live progress bar on one line using \r rewrites.
// Accurate: tracks real wall-clock start time and computes remaining ms directly.

let barTimer = null;
let barStartMs = null;
let barTotalMs = null;
let barLabel = '';
const BAR_W = 20;

function renderBar() {
  if (barStartMs === null) return;
  const elapsed = Date.now() - barStartMs;
  const remaining = Math.max(0, barTotalMs - elapsed);
  const frac = Math.min(1, elapsed / barTotalMs);
  const filled = Math.round(frac * BAR_W);
  const arrow = filled < BAR_W ? '>' : '';
  const bar = '='.repeat(filled) + arrow + ' '.repeat(Math.max(0, BAR_W - filled - arrow.length));
  const s = Math.ceil(remaining / 1000);
  const timeStr = s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
  process.stdout.write(`\r  [${bar}] ${timeStr} ${barLabel}  `);
}

function clearBarLine() {
  if (barStartMs !== null) process.stdout.write('\r' + ' '.repeat(60) + '\r');
}

function startBar(ms, label) {
  stopBar();
  barStartMs = Date.now();
  barTotalMs = ms;
  barLabel = label;
  renderBar();
  barTimer = setInterval(renderBar, 1000);
}

function stopBar() {
  if (barTimer) { clearInterval(barTimer); barTimer = null; }
  clearBarLine();
  barStartMs = null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

// Route all console output through clearBarLine so log lines always appear
// above the countdown bar without overwriting it.
const _log = console.log.bind(console);
const _err = console.error.bind(console);
console.log = (...a) => { clearBarLine(); _log(...a); };
console.error = (...a) => { clearBarLine(); _err(...a); };

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  kakisewa WA Blaster");
console.log(`  User: ${USER_ID}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Fired once when WA is first connected (either by QR scan or session restore).
// connection.open triggers this immediately; the 30s fallback catches the slow-scan case.
let firstPollFired = false;
async function startFirstPoll() {
  if (firstPollFired) return;
  firstPollFired = true;
  try {
    const { data } = await db.from("wa_blast_config").select("is_active").eq("user_id", USER_ID).maybeSingle();
    lastKnownIsActive = data?.is_active ?? false;
  } catch { lastKnownIsActive = false; }
  poll();
  scheduleFastCheck();
}

await connect();

// 30s fallback: if WA hasn't connected yet (user scanning QR), start polling anyway
// so the fast-check loop is alive. connection.open fires startFirstPoll() sooner
// when session restores automatically (typically 3-10s).
setTimeout(startFirstPoll, 30_000);
