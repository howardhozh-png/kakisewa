import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToSubscription } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await req.json() as PushSubscription;
  const { endpoint } = sub;
  const keys = (sub as unknown as { keys: { p256dh: string; auth: string } }).keys;
  // Background subscription refresh (e.g. forced resubscribe) — no welcome push,
  // this isn't a first-time opt-in the user should see anything for.
  const silent = new URL(req.url).searchParams.get("silent") === "1";

  // Remove this endpoint from any other user so one device = one active account.
  const svc = (await import("@/lib/supabase/service")).createServiceClient();
  await svc.from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .neq("user_id", session.user.id);

  await supabase.from("push_subscriptions").upsert({
    user_id: session.user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  }, { onConflict: "user_id,endpoint" });

  if (!silent) {
    // Send welcome push directly using the sub we just received — avoids an extra DB round-trip
    sendPushToSubscription(endpoint, keys.p256dh, keys.auth, {
      title: "Notifications are on",
      body: "You'll get updates on your listings, tenants, and contracts",
      url: "/home",
      tag: "push_welcome",
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = await req.json() as { endpoint: string };
  await supabase.from("push_subscriptions")
    .delete()
    .eq("user_id", session.user.id)
    .eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}
