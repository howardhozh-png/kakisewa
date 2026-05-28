import { headers } from "next/headers";

// Returns the public origin for the current request — e.g.
// "http://localhost:3002" in dev, "https://kakisewa.com" in prod.
// Used to build wa.me upload links so they always point at the
// host the agent is actually running on.
export async function getBaseUrl(): Promise<string> {
  // Prefer the actual request host so dev/staging links never point at the
  // wrong origin. Env var only used as a fallback when no request context
  // is available (e.g. cron jobs).
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch { /* no request context — fall through */ }

  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return "http://localhost:3002";
}
