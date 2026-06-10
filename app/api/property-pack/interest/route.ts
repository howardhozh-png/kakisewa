import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerLeadByPropertyShareToken, createTenantIntakeSession } from "@/lib/db";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { getBaseUrl } from "@/lib/origin";

const schema = z.object({
  propertyToken: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  if (!checkRateLimit(rateLimitKey(request), 10, 60_000)) {
    return NextResponse.json({ ok: false, message: "Too many requests" }, { status: 429 });
  }

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
    }

    const lead = await getOwnerLeadByPropertyShareToken(parsed.data.propertyToken);
    if (!lead || !lead.user_id) {
      return NextResponse.json({ ok: false, message: "Property not found" }, { status: 404 });
    }

    // Create an intake session linked to this property (public route — no auth session, pass userId explicitly)
    const intakeToken = await createTenantIntakeSession(lead.user_id, {
      ownerLeadId: lead.id,
      userId: lead.user_id,
    });

    const siteUrl = await getBaseUrl();
    const intakeUrl = `${siteUrl}/t/${intakeToken}`;

    return NextResponse.json({ ok: true, intakeUrl });
  } catch (err) {
    console.error("[property-pack/interest]", err);
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}
