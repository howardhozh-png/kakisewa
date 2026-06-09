import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerLeadByIntakeToken, completeOwnerIntake } from "@/lib/db";
import { classifyOwnerIntake } from "@/lib/ai-classify";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { sendPushToUser } from "@/lib/push";

const schema = z.object({
  token: z.string().min(1).max(200),
  answers: z.array(z.string().max(5000)).min(1).max(50),
  photoUrls: z.array(z.string().url()).max(20).optional(),
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
    const { token, answers, photoUrls } = parsed.data;

    const lead = await getOwnerLeadByIntakeToken(token);
    if (!lead) {
      return NextResponse.json({ ok: false, message: "Invalid or expired link" }, { status: 404 });
    }
    if (lead.intake_completed_at) {
      return NextResponse.json({ ok: false, message: "This form has already been submitted" }, { status: 409 });
    }

    const classified = await classifyOwnerIntake(answers);
    await completeOwnerIntake(token, { ...classified, photoUrls: photoUrls ?? [] });

    if (lead.user_id) {
      const propParts = [lead.property_name, lead.unit ? `Unit ${lead.unit}` : null].filter(Boolean);
      const propLabel = propParts.length ? ` · ${propParts.join(" · ")}` : "";
      sendPushToUser(lead.user_id, {
        title: "Owner filled in details",
        body: `${lead.owner_name}${propLabel}`,
        url: `/my-listing&highlight=${lead.id}`,
        tag: `intake_${lead.id}`,
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, message: "Submitted successfully" });
  } catch (err) {
    console.error("[intake/owner]", err);
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}
