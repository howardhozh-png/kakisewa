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
const FROM_NAME       = "Jovanne";
const REPLY_TO        = "kkakisewa@gmail.com";
const DAILY_LIMIT     = 100;
const DELAY_MS        = 3000;  // 3s between sends — stays under Resend's 2 req/s limit
const SEQ2_AFTER_DAYS = 4;  // send seq2 4 days after seq1
const SEQ3_AFTER_DAYS = 4;  // send seq3 4 days after seq2

const MASTER   = "scripts/output-master.csv";
const SENT_LOG = "scripts/email-blast-sent.json";

// ── Message sequences ─────────────────────────────────────────────────────────

const SEQUENCES = {
  seq1: {
    subject: "You have 8 property contracts expiring in 2 months",
    body: `Most agents lose 2 to 3 renewals every year without knowing it.

The tenant calls the owner directly. Owner renews quietly. You find out 6 months later, or never. That's RM 3,000 to RM 8,000 gone per renewal.

kakisewa sends you a notification 90, 60, and 30 days before every contract expires, so you call the owner first.

One renewal pays for 4 years of kakisewa. Free for 2 months, no credit card needed.

https://kakisewa.com?utm_source=email&utm_medium=cold&utm_campaign=seq1

Sincerely from,
Jovanne
Chief Marketing Officer, kakisewa

If you'd like to stop receiving emails from us, just reply and we'll remove you.`,
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

No commitment, start today, https://kakisewa.com?utm_source=email&utm_medium=cold&utm_campaign=seq2

Sincerely from,
Jovanne
Chief Marketing Officer, kakisewa

If you'd like to stop receiving emails from us, just reply and we'll remove you.`,
  },

  seq3: {
    subject: "Last time I'll bother you, I promise.",
    body: `This is the last email from me. Jovanne here, from kakisewa.

I just want to leave you with one thought: the next time a tenant calls asking about their contract and you're digging through WhatsApp chats to find the answer, remember kakisewa exists.

No tricks, free for 2 months. Refer 12 friends, get 12 months free. One contract renewal pays for more than 1 year of kakisewa, we're just that cheap. (my CFO is strangling me now)

No commitment, start today, https://kakisewa.com?utm_source=email&utm_medium=cold&utm_campaign=seq3

Sincerely from,
Jovanne
Chief Marketing Officer, kakisewa

If you'd like to stop receiving emails from us, just reply and we'll remove you.`,
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
  const today = new Date().toISOString().split("T")[0];

  // Build today's queue — seq1 first, then seq2 due, then seq3 due
  const queue = [];
  for (const c of withEmail) {
    if (queue.length >= DAILY_LIMIT) break;
    const e = c.email;
    if (!sent.seq1[e]) {
      queue.push({ email: e, seq: "seq1" });
    } else if (!sent.seq2[e] && daysDiff(sent.seq1[e]) >= SEQ2_AFTER_DAYS) {
      queue.push({ email: e, seq: "seq2" });
    } else if (sent.seq2[e] && !sent.seq3[e] && daysDiff(sent.seq2[e]) >= SEQ3_AFTER_DAYS) {
      queue.push({ email: e, seq: "seq3" });
    }
  }

  const counts = { seq1: 0, seq2: 0, seq3: 0 };
  queue.forEach(q => counts[q.seq]++);

  log(`=== Daily run ${today} ===`);
  log(`Contacts with email: ${withEmail.length}`);
  log(`Seq1 sent all-time: ${Object.keys(sent.seq1).length}`);
  log(`Seq2 sent all-time: ${Object.keys(sent.seq2).length}`);
  log(`Seq3 sent all-time: ${Object.keys(sent.seq3).length}`);
  log(`Today's queue: ${queue.length} (seq1: ${counts.seq1}, seq2: ${counts.seq2}, seq3: ${counts.seq3})`);

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
