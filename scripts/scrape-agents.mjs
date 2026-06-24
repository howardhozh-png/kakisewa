/**
 * IQI Agent Email Scraper
 *
 * Phase 1: Crawl directory pages → collect agent profile slugs
 * Phase 2: Fetch each profile page → extract email, name, REN, phone
 *
 * Run:    node scripts/scrape-agents.mjs
 * Output: scripts/agents-output.csv  (Resend-ready, email contacts only)
 *
 * Ctrl+C at any time — partial results are already written to CSV.
 *
 * Config at the top: change LIMIT to control how many contacts to collect.
 */

import fs from "fs";
import https from "https";

// ─── Config ───────────────────────────────────────────────────────────────────

const LIMIT        = 3500;   // stop after this many contacts with emails
const DIR_CONCUR   = 4;      // parallel directory page fetches
const PROF_CONCUR  = 6;      // parallel profile page fetches
const DIR_DELAY    = 300;    // ms between directory batches
const PROF_DELAY   = 200;    // ms between profile batches
const OUT_FILE     = "scripts/agents-output.csv";

// IQI regions to crawl (biggest first so we hit KL/Selangor early)
const REGIONS = [
  "kuala-lumpur",      // 7,750
  "selangor",
  "penang",
  "johor",
  "johor-bahru",
  "petaling-jaya",
  "shah-alam",
  "klang",
  "subang-jaya",
  "cheras",
  "puchong",
  "ampang",
  "bukit-jalil",
  "mont-kiara",
  "bangsar",
  "damansara",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 15000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        get(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

function escCsv(val) {
  const s = String(val ?? "").replace(/"/g, '""');
  return /[,"\n]/.test(s) ? `"${s}"` : s;
}

function seniority(ren) {
  const n = parseInt((ren ?? "").replace(/\D/g, ""), 10);
  if (isNaN(n)) return "unknown";
  if (n < 10000) return "veteran";
  if (n < 20000) return "mid";
  return "newer";
}

function parseName(full) {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  return { first_name: parts[0] ?? "", last_name: parts.slice(1).join(" ") };
}

// Run tasks with bounded concurrency
async function pool(tasks, concurrency, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await fn(tasks[idx], idx).catch((e) => ({ error: e.message }));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ─── Phase 1: collect slugs from directory pages ──────────────────────────────

async function getSlugsFromPage(region, pageNum) {
  const url = `https://iqiglobal.com/my/agents/${region}?page=${pageNum}`;
  try {
    const { status, body } = await get(url);
    if (status !== 200) return { slugs: [], lastPage: pageNum };
    const slugs = [...new Set([...body.matchAll(/href="https:\/\/iqiglobal\.com\/my\/agent\/([^"]+)"/g)].map((m) => m[1]))];
    // Find max page number
    const pages = [...body.matchAll(/\?page=(\d+)/g)].map((m) => parseInt(m[1]));
    const lastPage = pages.length ? Math.max(...pages) : pageNum;
    return { slugs, lastPage };
  } catch {
    return { slugs: [], lastPage: pageNum };
  }
}

// ─── Phase 2: fetch profile page for email ────────────────────────────────────

async function getAgentProfile(slug) {
  const url = `https://iqiglobal.com/my/agent/${slug}`;
  try {
    const { status, body } = await get(url);
    if (status !== 200) return null;

    // Email — exclude IQI/tracking domains
    const emailMatches = body.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
    const email = emailMatches.find((e) => !/(iqiglobal|google|facebook|sentry|doubleclick|gstatic|w3|example|schema)/.test(e)) ?? "";

    // Name
    const name = body.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1]?.trim()
      ?? body.match(/class="[^"]*agent[^"]*name[^"]*"[^>]*>([^<]+)/)?.[1]?.trim()
      ?? slug.split("-").slice(0, 2).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

    // REN
    const ren = body.match(/REN\d{4,}/)?.[0] ?? "";

    // Phone (base64 encoded in x-data)
    const b64 = body.match(/phoneReveal\('([^']+)'\)/)?.[1] ?? "";
    const phone = b64 ? Buffer.from(b64, "base64").toString("utf8") : "";

    const { first_name, last_name } = parseName(name);

    return { email, first_name, last_name, name, ren_number: ren, phone, seniority_tier: seniority(ren), source: "iqi" };
  } catch {
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const KEYS = ["email", "first_name", "last_name", "agency", "ren_number", "phone", "seniority_tier", "source"];
const HEADER = KEYS.join(",");

// Set up CSV file
fs.writeFileSync(OUT_FILE, HEADER + "\n", "utf8");
const csvStream = fs.createWriteStream(OUT_FILE, { flags: "a" });

let totalWithEmail = 0;
let totalProcessed = 0;
const seenSlugs = new Set();
const seenEmails = new Set();

// Graceful shutdown
process.on("SIGINT", () => {
  console.log(`\n\nInterrupted. Saved ${totalWithEmail} contacts to ${OUT_FILE}`);
  csvStream.end();
  process.exit(0);
});

console.log("IQI Agent Email Scraper");
console.log("=======================");
console.log(`Target: ${LIMIT} email contacts`);
console.log(`Output: ${OUT_FILE}\n`);

outerLoop:
for (const region of REGIONS) {
  if (totalWithEmail >= LIMIT) break;

  // Get first page to find total page count
  process.stdout.write(`[${region}] Finding pages... `);
  const { slugs: firstSlugs, lastPage } = await getSlugsFromPage(region, 1);
  console.log(`${lastPage} pages`);

  // Collect slugs across all pages in this region
  const pageNums = Array.from({ length: lastPage }, (_, i) => i + 1);

  for (let batchStart = 0; batchStart < pageNums.length; batchStart += DIR_CONCUR) {
    if (totalWithEmail >= LIMIT) break outerLoop;

    const batch = pageNums.slice(batchStart, batchStart + DIR_CONCUR);
    const batchSlugs = (await pool(batch, DIR_CONCUR, (p) => getSlugsFromPage(region, p)))
      .flatMap((r) => r?.slugs ?? [])
      .filter((s) => !seenSlugs.has(s));

    batchSlugs.forEach((s) => seenSlugs.add(s));

    // Phase 2: fetch profiles for this batch of slugs
    for (let pi = 0; pi < batchSlugs.length; pi += PROF_CONCUR) {
      if (totalWithEmail >= LIMIT) break outerLoop;

      const profBatch = batchSlugs.slice(pi, pi + PROF_CONCUR);
      const profiles = await pool(profBatch, PROF_CONCUR, getAgentProfile);

      for (const agent of profiles) {
        if (!agent) continue;
        totalProcessed++;
        if (!agent.email || !agent.email.includes("@")) continue;
        if (seenEmails.has(agent.email.toLowerCase())) continue;
        seenEmails.add(agent.email.toLowerCase());
        totalWithEmail++;

        const row = {
          email: agent.email,
          first_name: agent.first_name,
          last_name: agent.last_name,
          agency: "IQI",
          ren_number: agent.ren_number,
          phone: agent.phone,
          seniority_tier: agent.seniority_tier,
          source: "iqi",
        };
        csvStream.write(KEYS.map((k) => escCsv(row[k])).join(",") + "\n");
      }

      process.stdout.write(
        `\r  Pages ${batchStart + 1}-${Math.min(batchStart + DIR_CONCUR, lastPage)}/${lastPage} | Profiles: ${totalProcessed} scanned | Emails: ${totalWithEmail}/${LIMIT}   `
      );

      await sleep(PROF_DELAY);
    }

    await sleep(DIR_DELAY);
  }

  console.log(); // newline after region
}

csvStream.end();
console.log(`\n\nDone!`);
console.log(`Email contacts saved: ${totalWithEmail}`);
console.log(`Total profiles scanned: ${totalProcessed}`);
console.log(`Output: ${OUT_FILE}`);
console.log(`\nNext: import ${OUT_FILE} into Resend Audience → Import contacts`);
