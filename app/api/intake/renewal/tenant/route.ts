import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getTenancyByTenantRenewalToken, completeTenantRenewalIntake } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { token, staying, newEndDate } = (await request.json()) as {
      token: string;
      staying: boolean;
      newEndDate?: string;
    };

    if (!token || typeof staying !== "boolean") {
      return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
    }

    const tenancy = await getTenancyByTenantRenewalToken(token);
    if (!tenancy) {
      return NextResponse.json({ ok: false, message: "Invalid or expired link" }, { status: 404 });
    }
    const row = (await import("@/lib/db-client")).default
      .prepare("SELECT tenant_renewal_completed_at FROM tenancies WHERE tenant_renewal_token=?")
      .get(token) as { tenant_renewal_completed_at: string | null } | undefined;
    if (row?.tenant_renewal_completed_at) {
      return NextResponse.json({ ok: false, message: "Already submitted" }, { status: 409 });
    }

    await completeTenantRenewalIntake(token, staying, newEndDate);
    revalidatePath("/tenancies");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[intake/renewal/tenant]", err);
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}
