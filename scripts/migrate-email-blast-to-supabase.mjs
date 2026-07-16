/**
 * One-off migration: import scripts/output-master.csv +
 * scripts/email-blast-sent.json + scripts/email-blast-suppressed.json
 * into Supabase (email_blast_contacts / email_blast_suppressed), preserving
 * exact send history so nobody gets double-emailed once the Vercel cron
 * route takes over from the local script.
 *
 * Run once: node scripts/migrate-email-blast-to-supabase.mjs
 */

import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(PROJECT_ROOT);

function readEnvLocal(key) {
  const env = fs.readFileSync(".env.local", "utf8");
  return env.match(new RegExp(`${key}=([^\\n]+)`))?.[1]?.trim() ?? "";
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? readEnvLocal("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? readEnvLocal("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

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

async function main() {
  const contacts = parseCSV("scripts/output-master.csv");
  const sent = JSON.parse(fs.readFileSync("scripts/email-blast-sent.json", "utf8"));
  const suppressed = JSON.parse(fs.readFileSync("scripts/email-blast-suppressed.json", "utf8"));

  console.log(`Parsed ${contacts.length} contacts from CSV.`);
  console.log(`seq1 sent: ${Object.keys(sent.seq1 ?? {}).length}, seq2 sent: ${Object.keys(sent.seq2 ?? {}).length}, seq3 sent: ${Object.keys(sent.seq3 ?? {}).length}`);

  const rows = [];
  const seen = new Set();
  for (const c of contacts) {
    const email = (c.email ?? "").trim().toLowerCase();
    if (!email || seen.has(email)) continue; // dedupe — CSV has occasional repeats
    seen.add(email);
    rows.push({
      name: c.name || null,
      email,
      phone: c.phone || null,
      ren: c.ren || null,
      agency: c.agency || null,
      seniority: c.seniority || null,
      listing_type: c.listing_type || null,
      seq1_sent_at: sent.seq1?.[c.email] ?? sent.seq1?.[email] ?? null,
      seq2_sent_at: sent.seq2?.[c.email] ?? sent.seq2?.[email] ?? null,
      seq3_sent_at: sent.seq3?.[c.email] ?? sent.seq3?.[email] ?? null,
    });
  }
  console.log(`${rows.length} unique contacts after dedupe. Upserting in batches of 500...`);

  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("email_blast_contacts").upsert(batch, { onConflict: "email" });
    if (error) {
      console.error(`Batch ${i / BATCH + 1} failed:`, error.message);
      process.exit(1);
    }
    inserted += batch.length;
    process.stdout.write(`\r  Upserted ${inserted}/${rows.length}`);
  }
  console.log("\nContacts migration done.");

  const suppRows = [
    ...(suppressed.bounced ?? []).map(v => ({ type: "bounced", value: v.toLowerCase() })),
    ...(suppressed.blocked_domains ?? []).map(v => ({ type: "blocked_domain", value: v.toLowerCase() })),
    ...(suppressed.deferred_domains ?? []).map(v => ({ type: "deferred_domain", value: v.toLowerCase() })),
  ];
  const { error: suppErr } = await supabase.from("email_blast_suppressed").upsert(suppRows, { onConflict: "type,value" });
  if (suppErr) {
    console.error("Suppressed migration failed:", suppErr.message);
    process.exit(1);
  }
  console.log(`Suppressed migration done: ${suppRows.length} rows.`);

  // Sanity check counts back from the DB
  const { count: contactCount } = await supabase.from("email_blast_contacts").select("*", { count: "exact", head: true });
  const { count: seq1Count } = await supabase.from("email_blast_contacts").select("*", { count: "exact", head: true }).not("seq1_sent_at", "is", null);
  const { count: seq2Count } = await supabase.from("email_blast_contacts").select("*", { count: "exact", head: true }).not("seq2_sent_at", "is", null);
  const { count: suppCount } = await supabase.from("email_blast_suppressed").select("*", { count: "exact", head: true });
  console.log(`\nVerified in DB: ${contactCount} contacts, ${seq1Count} with seq1_sent_at, ${seq2Count} with seq2_sent_at, ${suppCount} suppressed rows.`);
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
