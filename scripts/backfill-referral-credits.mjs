#!/usr/bin/env node
/**
 * Backfill referral credits for referred users who paid but whose credit
 * was never recorded. Safe to run multiple times -- skips anyone already
 * in referral_credits. Applies credit equal to first invoice with amount > 0.
 *
 * Usage: STRIPE_SECRET_KEY=rk_live_... node scripts/backfill-referral-credits.mjs
 *   --dry-run   Print what would happen without writing anything
 */

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const DRY_RUN = process.argv.includes("--dry-run");

const SUPABASE_URL = "https://binqdtfvyhipgwpiarkb.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_KEY env var");
  process.exit(1);
}
if (!STRIPE_KEY) {
  console.error("Missing STRIPE_SECRET_KEY env var");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2026-05-27.dahlia" });

async function run() {
  // 1. All referred users who have a Stripe account
  const { data: referred, error } = await db
    .from("agent_profiles")
    .select("id, name, stripe_customer_id, referred_by_slug")
    .not("referred_by_slug", "is", null)
    .not("stripe_customer_id", "is", null);

  if (error) throw error;
  console.log(`Found ${referred.length} referred user(s) with a Stripe account`);

  for (const user of referred) {
    console.log(`\n--- ${user.name ?? user.id} (referred by ${user.referred_by_slug}) ---`);

    // 2. Skip if already credited
    const { data: existing } = await db
      .from("referral_credits")
      .select("id")
      .eq("referred_user_id", user.id)
      .maybeSingle();

    if (existing) {
      console.log(`  Already credited — skipping`);
      continue;
    }

    // 3. Find first invoice with amount_paid > 0
    const invoices = await stripe.invoices.list({
      customer: user.stripe_customer_id,
      limit: 20,
    });

    const invoicesByDate = invoices.data.sort((a, b) => a.created - b.created);
    const firstPaid = invoicesByDate.find((inv) => (inv.amount_paid ?? 0) > 0);

    if (!firstPaid) {
      console.log(`  No paid invoices found — nothing to credit yet`);
      continue;
    }

    const amountMyr = firstPaid.amount_paid;
    console.log(`  First paid invoice: ${firstPaid.id} — amount ${amountMyr} sen (RM${(amountMyr / 100).toFixed(2)}), billing_reason: ${firstPaid.billing_reason}`);

    // 4. Find the referrer
    const { data: referrer } = await db
      .from("agent_profiles")
      .select("id, name, stripe_customer_id")
      .eq("referral_slug", user.referred_by_slug)
      .maybeSingle();

    if (!referrer) {
      console.log(`  Referrer slug ${user.referred_by_slug} not found — skipping`);
      continue;
    }
    console.log(`  Referrer: ${referrer.name ?? referrer.id}`);

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would apply RM${(amountMyr / 100).toFixed(2)} credit to ${referrer.name}`);
      continue;
    }

    // 5. Apply credit
    if (referrer.stripe_customer_id) {
      const txn = await stripe.customers.createBalanceTransaction(
        referrer.stripe_customer_id,
        {
          amount: -amountMyr,
          currency: "myr",
          description: `Referral credit: ${user.name ?? user.id} subscribed`,
          metadata: {
            referred_user_id: user.id,
            invoice_id: firstPaid.id,
            backfilled: "true",
          },
        }
      );
      await db.from("referral_credits").insert({
        referrer_user_id: referrer.id,
        referred_user_id: user.id,
        referred_invoice_id: firstPaid.id,
        amount_myr: amountMyr,
        stripe_balance_transaction_id: txn.id,
      });
      console.log(`  Applied RM${(amountMyr / 100).toFixed(2)} credit — txn ${txn.id}`);
    } else {
      await db.from("referral_credits").insert({
        referrer_user_id: referrer.id,
        referred_user_id: user.id,
        referred_invoice_id: firstPaid.id,
        amount_myr: amountMyr,
        stripe_balance_transaction_id: null,
      });
      console.log(`  Referrer has no Stripe account — saved as pending credit`);
    }
  }

  console.log("\nDone.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
