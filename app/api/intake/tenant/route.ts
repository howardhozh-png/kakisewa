import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantIntakeSession, completeTenantIntake } from "@/lib/db";
import { extractTenantIntake } from "@/lib/ai-classify";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { sendPushToUser } from "@/lib/push";
import { sendAgentEmail, tenantProfileEmail } from "@/lib/email";

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

    const tenantName = extracted.name ?? session.name ?? "New tenant";
    const deepLink = "/existing-listing";
    sendPushToUser(session.agent_id, {
      title: `${tenantName} submitted their profile`,
      body: "View and assess in Existing listing",
      url: deepLink,
      tag: `tenant_intake_${token}`,
    }).catch(() => {});
    sendAgentEmail(
      session.agent_id,
      `${tenantName} submitted their profile`,
      tenantProfileEmail({ tenantName, url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://kakisewa.com"}${deepLink}` })
    ).catch(() => {});

    return NextResponse.json({ ok: true, message: "Profile created successfully" });
  } catch (err) {
    console.error("[intake/tenant]", err);
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}
