import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getTenancyByOwnerRenewalToken, completeOwnerRenewalIntake } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { token, continuing, newRent, newContractStart, durationYears, tenantIntent } = (await request.json()) as {
      token: string;
      continuing: boolean;
      newRent?: number;
      newContractStart?: string;
      durationYears?: number;
      tenantIntent?: "yes" | "no" | "unsure";
    };

    if (!token || typeof continuing !== "boolean") {
      return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
    }

    const tenancy = await getTenancyByOwnerRenewalToken(token);
    if (!tenancy) {
      return NextResponse.json({ ok: false, message: "Invalid or expired link" }, { status: 404 });
    }

    await completeOwnerRenewalIntake(token, continuing, newRent, tenantIntent, newContractStart, durationYears);
    revalidatePath("/tenancies");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[intake/renewal/owner]", err);
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}
