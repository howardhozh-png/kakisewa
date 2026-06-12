import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { PropertyPackLead } from "@/lib/db";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    tenantId?: string;
    tenantName?: string;
    tenantPhone?: string;
    leads?: PropertyPackLead[];
  };
  const { tenantId, tenantName, tenantPhone, leads } = body;

  if (!leads?.length) return NextResponse.json({ error: "No properties selected" }, { status: 400 });

  const id = `ppk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const token = `${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const svc = createServiceClient();

  const { error: packErr } = await svc.from("property_packs").insert({
    id,
    user_id: user.id,
    tenant_profile_id: tenantId ?? null,
    share_token: token,
    tenant_label: tenantName ?? null,
    tenant_phone: tenantPhone ?? null,
    expires_at: expiresAt,
  });
  if (packErr) return NextResponse.json({ error: packErr.message }, { status: 500 });

  const { error: leadsErr } = await svc.from("property_pack_leads").insert(
    leads.map((l, i) => ({
      pack_id:           id,
      owner_lead_id:     l.id,
      position:          i,
      property_name:     l.property_name ?? null,
      unit:              l.unit ?? null,
      bedrooms:          l.bedrooms ?? null,
      bathrooms:         l.bathrooms ?? null,
      expected_rent:     l.expected_rent ?? null,
      photo_urls:        JSON.stringify(l.photo_urls ?? []),
      cover_photo_index: l.cover_photo_index ?? 0,
    }))
  );
  if (leadsErr) return NextResponse.json({ error: leadsErr.message }, { status: 500 });

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const url = `${proto}://${host}/share/property-pack/${token}`;
  return NextResponse.json({ token, url });
}
