/**
 * Pre-send email verification via AbstractAPI Email Reputation.
 * Checks the next N unsent Gmail contacts and adds bad ones to the suppression list.
 * Run: node scripts/verify-emails.mjs
 */

import fs from "fs";
import https from "https";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(PROJECT_ROOT);

const API_KEY   = "92c2897bd871423dab9f93eed1f370a8";
const LIMIT     = 100;  // free tier cap
const SENT_LOG  = "scripts/email-blast-sent.json";
const SUPPRESSED = "scripts/email-blast-suppressed.json";
const MASTER    = "scripts/output-master.csv";

const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadSent() {
  if (!fs.existsSync(SENT_LOG)) return { seq1: {}, seq2: {}, seq3: {} };
  return JSON.parse(fs.readFileSync(SENT_LOG, "utf8"));
}

function loadSuppressed() {
  if (!fs.existsSync(SUPPRESSED)) return { bounced: [], blocked_domains: [], deferred_domains: [] };
  return JSON.parse(fs.readFileSync(SUPPRESSED, "utf8"));
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

function verify(email) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "emailreputation.abstractapi.com",
      path: `/v1/?api_key=${API_KEY}&email=${encodeURIComponent(email)}`,
      method: "GET",
    }, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        let parsed;
        try { parsed = JSON.parse(d); }
        catch { reject(new Error("Bad JSON: " + d.slice(0, 100))); return; }
        // AbstractAPI returns HTTP 200 with an {error:{...}} body on quota
        // exhaustion / bad key, not a non-2xx status — treating that as a
        // successful "clean" result was the actual bug (2026-07-07): every
        // request silently resolved as "verified fine" once the free quota
        // ran out, giving false confidence that 100 addresses were checked.
        if (parsed?.error) { reject(new Error(parsed.error.message || parsed.error.code || "API error")); return; }
        resolve(parsed);
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function isBad(r) {
  const deliverability = r?.email_deliverability?.status;
  const score = r?.email_quality?.score ?? 1;
  const riskAddr = r?.email_risk?.address_risk_status;
  // Only suppress confirmed dead accounts — "suspicious" username flag is unreliable
  // for Malaysian property agents (same .iqi@gmail.com pattern flagged or not randomly)
  if (deliverability === "undeliverable") return true;
  if (riskAddr === "high" && score === 0) return true;
  return false;
}

async function main() {
  const sent = loadSent();
  const suppressed = loadSuppressed();
  const bouncedSet = new Set((suppressed.bounced ?? []).map(e => e.toLowerCase()));
  const deferredSet = new Set((suppressed.deferred_domains ?? []).map(d => d.toLowerCase()));
  const blockedSet = new Set((suppressed.blocked_domains ?? []).map(d => d.toLowerCase()));

  const contacts = parseCSV(MASTER);
  const gmailUnsent = [];
  for (const c of contacts) {
    const e = (c.email || "").toLowerCase();
    if (!e.endsWith("@gmail.com")) continue;
    if (sent.seq1?.[e]) continue;
    if (bouncedSet.has(e)) continue;
    const domain = e.split("@")[1];
    if (deferredSet.has(domain) || blockedSet.has(domain)) continue;
    gmailUnsent.push(e);
  }

  const toCheck = gmailUnsent.slice(0, LIMIT);
  console.log(`Verifying ${toCheck.length} Gmail contacts via AbstractAPI...`);

  const bad = [];
  const good = [];
  let apiErrors = 0;

  for (let i = 0; i < toCheck.length; i++) {
    const email = toCheck[i];
    try {
      const result = await verify(email);
      const bad_ = isBad(result);
      const status = result?.email_deliverability?.status ?? "unknown";
      const score = (result?.email_quality?.score ?? "?");
      const risk = result?.email_risk?.address_risk_status ?? "?";
      const suspicious = result?.email_quality?.is_username_suspicious ? "SUSPICIOUS" : "";
      process.stdout.write(`\r[${i+1}/${toCheck.length}] ${bad_ ? "BAD " : "ok  "} ${email.padEnd(45)} ${status} score=${score} risk=${risk} ${suspicious}`);
      if (bad_) {
        bad.push(email);
        console.log(""); // newline so bad ones are visible in scroll
      }
      await sleep(1100); // stay under rate limit (1 req/s)
    } catch (err) {
      apiErrors++;
      console.log(`\n  ERROR ${email}: ${err.message}`);
    }
  }

  console.log(`\n\nDone. Verified: ${toCheck.length}, Bad: ${bad.length}, Good: ${toCheck.length - bad.length - apiErrors}, Errors: ${apiErrors}`);

  if (apiErrors > 0 && apiErrors >= toCheck.length * 0.5) {
    console.log(`\n⚠️  ${apiErrors}/${toCheck.length} requests errored — this run verified almost nothing. Check the AbstractAPI key/quota before trusting "no bad emails found".`);
  }

  // last_synced means "we actually checked", not "we found something bad" —
  // previously this only got written inside the bad.length>0 branch, so a
  // fully clean (or fully failed) run silently left the date stale.
  const actuallyChecked = apiErrors < toCheck.length;
  if (actuallyChecked) suppressed.last_synced = new Date().toISOString().split("T")[0];

  if (bad.length > 0) {
    console.log("\nBad emails to suppress:");
    bad.forEach(e => console.log("  " + e));

    const existingBounced = new Set((suppressed.bounced ?? []).map(e => e.toLowerCase()));
    const newBad = bad.filter(e => !existingBounced.has(e.toLowerCase()));
    suppressed.bounced = [...(suppressed.bounced ?? []), ...newBad].sort();
    console.log(`\nAdded ${newBad.length} new addresses to suppression list.`);
  } else if (apiErrors >= toCheck.length * 0.5) {
    console.log("\nNot enough successful checks to say anything — do NOT read this as \"all clean\". Fix the API issue and re-run.");
  } else {
    console.log("\nAll emails look clean — no additions to suppression list.");
  }

  if (actuallyChecked) fs.writeFileSync(SUPPRESSED, JSON.stringify(suppressed, null, 2), "utf8");
}

main().catch(err => { console.error("FATAL:", err.message); process.exit(1); });
