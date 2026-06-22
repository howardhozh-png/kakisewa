// Run: STRIPE_SECRET_KEY=sk_live_... node scripts/add-invoice-upcoming-webhook.mjs
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) { console.error("Set STRIPE_SECRET_KEY env var"); process.exit(1); }

const stripe = new Stripe(key, { apiVersion: "2026-05-27.dahlia" });

const { data: endpoints } = await stripe.webhookEndpoints.list({ limit: 10 });
if (!endpoints.length) { console.error("No webhook endpoints found"); process.exit(1); }

// Pick the first production endpoint (kakisewa.com or vercel URL)
const endpoint = endpoints.find(e => e.url.includes("kakisewa")) ?? endpoints[0];
console.log("Updating endpoint:", endpoint.url);

const currentEvents = endpoint.enabled_events ?? [];
if (currentEvents.includes("invoice.upcoming")) {
  console.log("invoice.upcoming already registered. Done.");
  process.exit(0);
}

const updated = await stripe.webhookEndpoints.update(endpoint.id, {
  enabled_events: [...currentEvents, "invoice.upcoming"],
});

console.log("Done. Enabled events:", updated.enabled_events.join(", "));
