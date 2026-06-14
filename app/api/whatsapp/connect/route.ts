import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const APP_ID     = process.env.WHATSAPP_APP_ID!;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET!;

// ─── POST — Exchange Meta code, save WA credentials ───────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let code: string;
  try {
    ({ code } = await req.json() as { code: string });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  if (!code) return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });

  // 1. Exchange code for access token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token` +
    `?client_id=${APP_ID}&client_secret=${APP_SECRET}&code=${encodeURIComponent(code)}`
  );
  const tokenData = await tokenRes.json() as Record<string, unknown>;
  if (!tokenRes.ok || !tokenData.access_token) {
    const metaMsg = (tokenData?.error as Record<string,unknown>)?.message as string | undefined;
    console.error("[whatsapp/connect] token exchange failed", tokenData);
    return NextResponse.json({ ok: false, error: metaMsg ?? "Could not verify your Meta account. Please try again." }, { status: 502 });
  }
  const accessToken = tokenData.access_token as string;

  // 2. Get the agent's WABA
  const wabaRes = await fetch(
    "https://graph.facebook.com/v19.0/me/whatsapp_business_accounts",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const wabaData = await wabaRes.json() as { data?: Array<{ id: string }> };
  const wabaId = wabaData.data?.[0]?.id;
  if (!wabaId) {
    return NextResponse.json({ ok: false, error: "No WhatsApp Business Account was found. Make sure you selected your Business account during setup, not a personal account." }, { status: 502 });
  }

  // 3. Get phone numbers for the WABA
  const phoneRes = await fetch(
    `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?fields=id,display_phone_number`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const phoneData = await phoneRes.json() as { data?: Array<{ id: string; display_phone_number: string }> };
  const phoneEntry = phoneData.data?.[0];
  if (!phoneEntry) {
    return NextResponse.json({ ok: false, error: "Your WhatsApp Business Account has no registered phone numbers. Add a number in Meta Business Manager first." }, { status: 502 });
  }

  const phoneNumberId    = phoneEntry.id;
  const displayPhone     = phoneEntry.display_phone_number.replace(/^\+/, "");

  // 4. Subscribe the WABA to this app's webhook so messages are forwarded
  const subRes = await fetch(
    `https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps`,
    { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const subData = await subRes.json() as Record<string, unknown>;
  if (!subRes.ok || !subData.success) {
    console.error("[whatsapp/connect] waba subscription failed", subData);
    return NextResponse.json({ ok: false, error: "Connected to your account but could not enable auto-tracking. Contact support@kakisewa.com." }, { status: 502 });
  }

  // 5. Save to agent_profiles
  const svc = createServiceClient();
  const { error: updateErr } = await svc
    .from("agent_profiles")
    .update({
      whatsapp_phone_number_id:     phoneNumberId,
      whatsapp_business_account_id: wabaId,
      whatsapp_access_token:        accessToken,
      whatsapp_connected_at:        new Date().toISOString(),
      whatsapp_number:              displayPhone,
    })
    .eq("id", user.id);

  if (updateErr) {
    console.error("[whatsapp/connect] db update error", updateErr);
    return NextResponse.json({ ok: false, error: "Failed to save credentials" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, phoneNumber: displayPhone });
}

// ─── DELETE — Disconnect WA ───────────────────────────────────────────────────

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();
  await svc
    .from("agent_profiles")
    .update({
      whatsapp_phone_number_id:     null,
      whatsapp_business_account_id: null,
      whatsapp_access_token:        null,
      whatsapp_connected_at:        null,
      whatsapp_number:              null,
    })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
