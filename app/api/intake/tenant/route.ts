import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantIntakeSession, completeTenantIntake } from "@/lib/db";
import { extractTenantIntake } from "@/lib/ai-classify";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { sendPushToUser } from "@/lib/push";

const schema = z.object({
  token: z.string().min(1).max(200),
  answers: z.array(z.string().max(5000)).min(1).max(50),
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
    const { token, answers } = parsed.data;

    const session = await getTenantIntakeSession(token);
    if (!session) {
      return NextResponse.json({ ok: false, message: "Invalid or expired link" }, { status: 404 });
    }
    if (session.completed_at) {
      return NextResponse.json({ ok: false, message: "This form has already been submitted" }, { status: 409 });
    }

    const extracted = await extractTenantIntake(answers);
    await completeTenantIntake(token, extracted, session.agent_id);

    sendPushToUser(session.agent_id, {
      title: `${extracted.name ?? session.name ?? "New tenant"} submitted their profile`,
      body: "View and assess in Existing listing",
      url: "/existing-listing",
      tag: `tenant_intake_${token}`,
    }).catch(() => {});

    return NextResponse.json({ ok: true, message: "Profile created successfully" });
  } catch (err) {
    console.error("[intake/tenant]", err);
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}
