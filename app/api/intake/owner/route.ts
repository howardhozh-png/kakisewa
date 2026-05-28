import { NextRequest, NextResponse } from "next/server";
import { getOwnerLeadByIntakeToken, completeOwnerIntake, updateOwnerLead } from "@/lib/db";
import { classifyOwnerIntake } from "@/lib/ai-classify";

export async function POST(request: NextRequest) {
  try {
    const { token, answers, photoUrls } = (await request.json()) as {
      token: string;
      answers: string[];
      photoUrls?: string[];
    };

    if (!token || !Array.isArray(answers)) {
      return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
    }

    const lead = await getOwnerLeadByIntakeToken(token);
    if (!lead) {
      return NextResponse.json({ ok: false, message: "Invalid or expired link" }, { status: 404 });
    }
    if (lead.intake_completed_at) {
      return NextResponse.json({ ok: false, message: "This form has already been submitted" }, { status: 409 });
    }

    const classified = await classifyOwnerIntake(answers);
    await completeOwnerIntake(token, classified);

    if (photoUrls && photoUrls.length > 0) {
      await updateOwnerLead(lead.id, { photo_urls: photoUrls });
    }

    return NextResponse.json({ ok: true, message: "Submitted successfully" });
  } catch (err) {
    console.error("[intake/owner]", err);
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}
