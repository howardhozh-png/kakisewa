import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";

let vapidInitialised = false;
function ensureVapid() {
  if (vapidInitialised) return;
  const mailto = process.env.VAPID_MAILTO;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!mailto || !pub || !priv) return;
  webpush.setVapidDetails(mailto, pub, priv);
  vapidInitialised = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

interface Subscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Send to a specific subscription directly — no DB round-trip needed
export async function sendPushToSubscription(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: PushPayload
): Promise<void> {
  ensureVapid();
  await webpush.sendNotification(
    { endpoint, keys: { p256dh, auth } },
    JSON.stringify(payload)
  );
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  ensureVapid();
  const supabase = createServiceClient();

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  await Promise.all(
    (subs as Subscription[]).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          // Subscription expired — remove it
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
        failed++;
      }
    })
  );

  return { sent, failed };
}
