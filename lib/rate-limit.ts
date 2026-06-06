// In-process sliding-window rate limiter.
// Not shared across serverless instances — adequate as a first line of defence.
// Upgrade to @upstash/ratelimit if cross-instance enforcement is needed.

interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>();

export function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export function rateLimitKey(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
