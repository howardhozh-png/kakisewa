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
    if (tenancy.tenant_renewal_completed_at) {
      return NextResponse.json({ ok: false, message: "Already submitted" }, { status: 409 });
    }

    await completeTenantRenewalIntake(token, staying, newEndDate);
    revalidatePath("/existing-contracts");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[intake/renewal/tenant]", err);
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}
