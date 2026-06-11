import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTenancyByTenantRenewalToken, completeTenantRenewalIntake } from "@/lib/db";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { sendPushToUser } from "@/lib/push";

const schema = z.object({
  token: z.string().min(1).max(200),
  staying: z.boolean(),
  newEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
    const { token, staying, newEndDate } = parsed.data;

    const tenancy = await getTenancyByTenantRenewalToken(token);
    if (!tenancy) {
      return NextResponse.json({ ok: false, message: "Invalid or expired link" }, { status: 404 });
    }
    if (tenancy.tenant_renewal_completed_at) {
      return NextResponse.json({ ok: false, message: "Already submitted" }, { status: 409 });
    }

    await completeTenantRenewalIntake(token, staying, newEndDate);
    revalidatePath("/existing-listing");

    if (tenancy.user_id) {
      const propLabel = tenancy.property_name ? ` · ${tenancy.property_name}` : "";
      sendPushToUser(tenancy.user_id, {
        title: staying ? "Tenant is renewing!" : "Tenant not renewing",
        body: `${tenancy.tenant_name ?? "Tenant"}${propLabel}`,
        url: `/existing-listing?highlight=${tenancy.id}`,
        tag: `tenant_renewal_${tenancy.id}`,
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[intake/renewal/tenant]", err);
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}
