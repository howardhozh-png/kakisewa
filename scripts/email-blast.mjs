/**
 * Kakisewa email blast — sends via Resend API
 * Handles all 3 message sequences automatically.
 * Scheduled at 1pm MYT weekdays via cron — do not run manually.
 *
 * Manual run:  node scripts/email-blast.mjs
 * Logs:        scripts/email-blast.log
 */

import fs from "fs";
import https from "https";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Always resolve paths relative to project root (needed for cron, which has no cwd)
const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(PROJECT_ROOT);

// ── Config ────────────────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? (() => {
  try {
    const env = fs.readFileSync(".env.local", "utf8");
    return env.match(/RESEND_API_KEY=([^\n]+)/)?.[1]?.trim() ?? "";
  } catch { return ""; }
})();

const FROM_EMAIL      = "jovanne@kakisewaofficial.com";
const FROM_NAME       = "Jovanne Ng";
const REPLY_TO        = "kkakisewa@gmail.com";
const DAILY_LIMIT     = 100;
const DELAY_MS        = 3000;  // 3s between sends — stays under Resend's 2 req/s limit
const SEQ2_AFTER_DAYS = 4;  // send seq2 4 days after seq1
const SEQ3_AFTER_DAYS = 4;  // send seq3 4 days after seq2

const MASTER      = "scripts/output-master.csv";
const SENT_LOG    = "scripts/email-blast-sent.json";
const SUPPRESSED  = "scripts/email-blast-suppressed.json";

// ── Message sequences ─────────────────────────────────────────────────────────

const SEQUENCES = {
  seq1: {
    subject: "You have 8 property contracts expiring in 2 months",
    body: `Most agents lose over RM100,000 in renewal commissions every year without knowing it.

The tenant calls the owner directly. Owner renews quietly. You find out 6 months later, or never. Thirty renewals at RM3,000 each, all gone.

kakisewa sends you a notification 90, 60, and 30 days before every contract expires, so you call the owner first.

One more thing worth knowing: WhatsApp just introduced usernames. Agents who rely on blasting messages to cold numbers may soon find that channel harder to use. Your existing tenants and owners are now your income. Protecting your renewals is not optional anymore.

Sign up is free, works on your phone like an app. kakisewa.com

Sincerely from,
Jovanne Ng
Chief Marketing Officer, kakisewa`,
  },

  seq2: {
    subject: "4 units in Sunway Geo Residences expiring next month",
    body: `It's Jovanne from kakisewa again! We got 279 users signed up for free last 5 days! What's holding you back?

kakisewa will become your personal property diary forever.
Need to find property details and photos to post on iProperty? Use kakisewa.
Need to find and contact owner? Use kakisewa.
Need to share property options to tenant? Use kakisewa.
Need to keep track of calendar schedule for house viewing? Use kakisewa.

No tricks, free for 2 months. Refer 12 friends, get 12 months free. One contract renewal pays for more than 1 year of kakisewa, we're just that cheap. (my CFO is shouting at me right now)

Sign up is free, works on your phone like an app. kakisewa.com

Sincerely from,
Jovanne Ng
Chief Marketing Officer, kakisewa`,
  },

  seq3: {
    subject: "Last time I'll bother you, I promise.",
    body: `This is the last email from me. Jovanne here, from kakisewa.

I just want to leave you with one thought: the next time a tenant calls asking about their contract and you're digging through WhatsApp chats to find the answer, remember kakisewa exists.

No tricks, free for 2 months. Refer 12 friends, get 12 months free. One contract renewal pays for more than 1 year of kakisewa, we're just that cheap. (my CFO is strangling me now)

Sign up is free, works on your phone like an app. kakisewa.com

Sincerely from,
Jovanne Ng
Chief Marketing Officer, kakisewa`,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(...args) {
  const msg = `[email-blast] ${new Date().toISOString()} ${args.join(" ")}`;
  console.log(msg);
  try { fs.appendFileSync(SENT_LOG.replace("sent.json", "log"), msg + "\n"); } catch {}
}

function daysDiff(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function loadSent() {
  if (!fs.existsSync(SENT_LOG)) return { seq1: {}, seq2: {}, seq3: {} };
  const raw = JSON.parse(fs.readFileSync(SENT_LOG, "utf8"));
  // Migrate old array format (before multi-sequence support)
  if (Array.isArray(raw)) {
    const migrated = { seq1: {}, seq2: {}, seq3: {} };
    for (const email of raw) migrated.seq1[email] = "2026-01-01";
    return migrated;
  }
  return { seq1: {}, seq2: {}, seq3: {}, ...raw };
}

function saveSent(sent) {
  fs.writeFileSync(SENT_LOG, JSON.stringify(sent, null, 2), "utf8");
}

// Domain tiers for prioritisation (lower = safer, sent first)
const DOMAIN_TIER = {
  "gmail.com": 1,
  "icloud.com": 1, "me.com": 1, "mac.com": 1,
};
function domainTier(email) {
  const d = (email.split("@")[1] ?? "").toLowerCase();
  return DOMAIN_TIER[d] ?? 2; // tier 2 = business/unknown (fine, just lower priority)
}

function loadSuppressed() {
  if (!fs.existsSync(SUPPRESSED)) return { bounced: new Set(), blocked_domains: new Set(), deferred_domains: new Set() };
  const s = JSON.parse(fs.readFileSync(SUPPRESSED, "utf8"));
  return {
    bounced:           new Set((s.bounced           ?? []).map(e => e.toLowerCase())),
    blocked_domains:   new Set((s.blocked_domains   ?? []).map(d => d.toLowerCase())),
    deferred_domains:  new Set((s.deferred_domains  ?? []).map(d => d.toLowerCase())),
  };
}

function skipReason(email, suppressed) {
  const e = email.toLowerCase();
  const domain = e.split("@")[1] ?? "";
  if (suppressed.bounced.has(e))          return "bounced";
  if (suppressed.blocked_domains.has(domain))  return "domain_blocked";
  if (suppressed.deferred_domains.has(domain)) return "deferred";
  return null;
}

function isSuppressed(email, suppressed) {
  return skipReason(email, suppressed) !== null;
}

function parseCSV(path) {
  const lines = fs.readFileSync(path, "utf8").split("\n").filter(Boolean);
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  return lines.slice(1).map(line => {
    const vals = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { vals.push(cur); cur = ""; continue; }
      cur += ch;
    }
    vals.push(cur);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] ?? "").trim(); });
    return obj;
  });
}

function sendEmail(to, seq) {
  const { subject, body } = SEQUENCES[seq];
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      reply_to: REPLY_TO,
      subject,
      text: body,
    });
    const req = https.request({
      hostname: "api.resend.com",
      path: "/emails",
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    }, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        if (res.statusCode === 200 || res.statusCode === 201) resolve(true);
        else reject(new Error(`${res.statusCode}: ${data.slice(0, 200)}`));
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!RESEND_API_KEY) {
    log("ERROR: RESEND_API_KEY not found in .env.local");
    process.exit(1);
  }

  const contacts = parseCSV(MASTER);
  const withEmail = contacts.filter(c => c.email && c.email.includes("@"));
  const sent = loadSent();
  const suppressed = loadSuppressed();
  const today = new Date().toISOString().split("T")[0];

  // Build candidate list — skip suppressed/deferred, tag with domain tier
  const candidates = [];
  let skippedBounce = 0, skippedDeferred = 0;
  for (const c of withEmail) {
    const e = c.email;
    const reason = skipReason(e, suppressed);
    if (reason === "bounced" || reason === "domain_blocked") { skippedBounce++; continue; }
    if (reason === "deferred") { skippedDeferred++; continue; }

    let seq = null;
    if (!sent.seq1[e]) seq = "seq1";
    else if (!sent.seq2[e] && daysDiff(sent.seq1[e]) >= SEQ2_AFTER_DAYS) seq = "seq2";
    else if (sent.seq2[e] && !sent.seq3[e] && daysDiff(sent.seq2[e]) >= SEQ3_AFTER_DAYS) seq = "seq3";
    if (seq) candidates.push({ email: e, seq, tier: domainTier(e) });
  }

  // Sort: safer domains first (tier 1 = gmail/icloud before tier 2 = business/other)
  candidates.sort((a, b) => a.tier - b.tier);

  const queue = candidates.slice(0, DAILY_LIMIT);

  const counts = { seq1: 0, seq2: 0, seq3: 0 };
  queue.forEach(q => counts[q.seq]++);

  const tier1Count = queue.filter(q => q.tier === 1).length;
  const tier2Count = queue.filter(q => q.tier === 2).length;

  log(`=== Daily run ${today} ===`);
  log(`Contacts with email: ${withEmail.length}`);
  log(`Skipped bounced/blocked: ${skippedBounce} | Deferred (Yahoo/Hotmail): ${skippedDeferred}`);
  log(`Seq1 sent all-time: ${Object.keys(sent.seq1).length}`);
  log(`Seq2 sent all-time: ${Object.keys(sent.seq2).length}`);
  log(`Seq3 sent all-time: ${Object.keys(sent.seq3).length}`);
  log(`Today's queue: ${queue.length} (seq1: ${counts.seq1}, seq2: ${counts.seq2}, seq3: ${counts.seq3}) | tier1(gmail/icloud): ${tier1Count} tier2(business): ${tier2Count}`);

  if (queue.length === 0) {
    log("Nothing to send today.");
    return;
  }

  let success = 0, failed = 0;

  for (const item of queue) {
    try {
      await sendEmail(item.email, item.seq);
      sent[item.seq][item.email] = today;
      success++;
      process.stdout.write(`\r  Sent ${success}/${queue.length} [${item.seq}] — ${item.email.slice(0, 40)}`);
      saveSent(sent);
      await sleep(DELAY_MS);
    } catch (err) {
      failed++;
      log(`\nFAILED [${item.seq}] ${item.email}: ${err.message}`);
    }
  }

  log(`\nDone. Sent: ${success}, Failed: ${failed}`);
}

main().catch(err => { log("FATAL: " + err.message); process.exit(1); });
