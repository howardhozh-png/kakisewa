import { NextRequest, NextResponse } from "next/server";
import { getTenantIntakeSession, completeTenantIntake } from "@/lib/db";
import { extractTenantIntake } from "@/lib/ai-classify";

export async function POST(request: NextRequest) {
  try {
    const { token, answers } = (await request.json()) as {
      token: string;
      answers: string[];
    };

    if (!token || !Array.isArray(answers)) {
      return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
    }

    const session = await getTenantIntakeSession(token);
    if (!session) {
      return NextResponse.json({ ok: false, message: "Invalid or expired link" }, { status: 404 });
    }
    if (session.completed_at) {
      return NextResponse.json({ ok: false, message: "This form has already been submitted" }, { status: 409 });
    }

    const extracted = await extractTenantIntake(answers);
    await completeTenantIntake(token, extracted, session.agent_id);

    return NextResponse.json({ ok: true, message: "Profile created successfully" });
  } catch (err) {
    console.error("[intake/tenant]", err);
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}
