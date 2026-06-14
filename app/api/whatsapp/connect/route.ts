import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const APP_ID     = process.env.WHATSAPP_APP_ID!;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET!;

// ─── POST — Connect via direct credentials (Phone Number ID + Access Token) ───

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { phone_number_id?: string; access_token?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  // ── Manual credential entry (new) ──────────────────────────────────────────
  if (body.phone_number_id && body.access_token) {
    const phoneNumberId = body.phone_number_id.trim();
    const accessToken   = body.access_token.trim();

    // 1. Validate credentials — fetch phone number details from Meta
    const phoneRes = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=id,display_phone_number`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const phoneData = await phoneRes.json() as Record<string, unknown>;
    if (!phoneRes.ok || !phoneData.display_phone_number) {
      const metaMsg = (phoneData?.error as Record<string,unknown>)?.message as string | undefined;
      return NextResponse.json({
        ok: false,
        error: metaMsg ?? "Invalid Phone Number ID or Access Token. Double-check and try again.",
      }, { status: 422 });
    }
    const displayPhone = (phoneData.display_phone_number as string).replace(/^\+/, "");

    // 2. Get the WABA ID so we can subscribe to webhook (best effort)
    let wabaId: string | null = null;
    try {
      const wabaRes = await fetch(
        "https://graph.facebook.com/v19.0/me/whatsapp_business_accounts",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const wabaData = await wabaRes.json() as { data?: Array<{ id: string }> };
      wabaId = wabaData.data?.[0]?.id ?? null;
    } catch { /* not fatal */ }

    // 3. Subscribe WABA to kakisewa's webhook (best effort — requires app access)
    if (wabaId) {
      try {
        // Get kakisewa's App Access Token for the subscription call
        const appTokenRes = await fetch(
          `https://graph.facebook.com/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&grant_type=client_credentials`
        );
        const appTokenData = await appTokenRes.json() as { access_token?: string };
        const appToken = appTokenData.access_token;

        if (appToken) {
          await fetch(`https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps`, {
            method: "POST",
            headers: { Authorization: `Bearer ${appToken}` },
          });
        }
      } catch { /* not fatal — credentials saved even if subscription fails */ }
    }

    // 4. Save to agent_profiles
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

  // ── Legacy OAuth code exchange (kept for future BSP use) ───────────────────
  if (body.code) {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token` +
      `?client_id=${APP_ID}&client_secret=${APP_SECRET}&code=${encodeURIComponent(body.code)}`
    );
    const tokenData = await tokenRes.json() as Record<string, unknown>;
    if (!tokenRes.ok || !tokenData.access_token) {
      const metaMsg = (tokenData?.error as Record<string,unknown>)?.message as string | undefined;
      return NextResponse.json({ ok: false, error: metaMsg ?? "Could not verify your Meta account." }, { status: 502 });
    }
    const accessToken = tokenData.access_token as string;

    const wabaRes = await fetch(
      "https://graph.facebook.com/v19.0/me/whatsapp_business_accounts",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const wabaData = await wabaRes.json() as { data?: Array<{ id: string }> };
    const wabaId = wabaData.data?.[0]?.id;
    if (!wabaId) return NextResponse.json({ ok: false, error: "No WhatsApp Business Account found." }, { status: 502 });

    const phoneRes = await fetch(
      `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?fields=id,display_phone_number`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const phoneData = await phoneRes.json() as { data?: Array<{ id: string; display_phone_number: string }> };
    const phoneEntry = phoneData.data?.[0];
    if (!phoneEntry) return NextResponse.json({ ok: false, error: "No phone numbers found in your WhatsApp Business Account." }, { status: 502 });

    const subRes = await fetch(
      `https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps`,
      { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const subData = await subRes.json() as Record<string, unknown>;
    if (!subRes.ok || !subData.success) {
      return NextResponse.json({ ok: false, error: "Connected but could not enable auto-tracking. Contact support@kakisewa.com." }, { status: 502 });
    }

    const svc = createServiceClient();
    await svc.from("agent_profiles").update({
      whatsapp_phone_number_id:     phoneEntry.id,
      whatsapp_business_account_id: wabaId,
      whatsapp_access_token:        accessToken,
      whatsapp_connected_at:        new Date().toISOString(),
      whatsapp_number:              phoneEntry.display_phone_number.replace(/^\+/, ""),
    }).eq("id", user.id);

    return NextResponse.json({ ok: true, phoneNumber: phoneEntry.display_phone_number.replace(/^\+/, "") });
  }

  return NextResponse.json({ ok: false, error: "Missing credentials" }, { status: 400 });
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
