import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTenancyByOwnerRenewalToken, completeOwnerRenewalIntake } from "@/lib/db";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { sendPushToUser } from "@/lib/push";
import { sendAgentEmail, ownerRenewalEmail } from "@/lib/email";

const schema = z.object({
  token: z.string().min(1).max(200),
  continuing: z.boolean(),
  newRent: z.number().positive().max(100_000).optional(),
  newContractStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  durationYears: z.number().int().min(1).max(10).optional(),
  tenantIntent: z.enum(["yes", "no", "unsure"]).optional(),
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
    const { token, continuing, newRent, newContractStart, durationYears, tenantIntent } = parsed.data;

    const tenancy = await getTenancyByOwnerRenewalToken(token);
    if (!tenancy) {
      return NextResponse.json({ ok: false, message: "Invalid or expired link" }, { status: 404 });
    }

    await completeOwnerRenewalIntake(token, continuing, newRent, tenantIntent, newContractStart, durationYears);
    revalidatePath("/existing-listing");

    if (tenancy.user_id) {
      const propParts = [tenancy.property_name].filter(Boolean);
      const propLabel = propParts.length ? propParts.join(" · ") : "your property";
      const ownerBody = `${propLabel} · ${tenancy.tenant_name} — view in Existing listing`;
      const renewalUrl = `/existing-listing?highlight=${tenancy.id}`;
      sendPushToUser(tenancy.user_id, {
        title: continuing ? "Owner wants to renew" : "Owner not renewing",
        body: ownerBody,
        url: renewalUrl,
        tag: `ownerrenewal_${tenancy.id}`,
      }).catch(() => {});
      sendAgentEmail(
        tenancy.user_id,
        continuing ? `${tenancy.property_name ?? "Property"} — owner wants to renew` : `${tenancy.property_name ?? "Property"} — owner not renewing`,
        ownerRenewalEmail({
          ownerName: tenancy.tenant_name ?? "Owner",
          tenantName: tenancy.tenant_name ?? "",
          propLabel: propLabel,
          continuing,
          url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://kakisewa.com"}${renewalUrl}`,
        })
      ).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[intake/renewal/owner]", err);
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}
