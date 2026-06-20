import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerLeadByIntakeToken, completeOwnerIntake } from "@/lib/db";
import { classifyOwnerIntake } from "@/lib/ai-classify";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { sendPushToUser } from "@/lib/push";
import { sendAgentEmail, ownerIntakeEmail } from "@/lib/email";
import { CAP_WARN_THRESHOLD } from "@/lib/plan-caps";

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
    const { capHit, remaining } = await completeOwnerIntake(token, { ...classified, photoUrls: photoUrls ?? [] });

    if (lead.user_id) {
      const propParts = [lead.property_name, lead.unit ? `Unit ${lead.unit}` : null].filter(Boolean);
      const propLabel = propParts.join(" · ") || lead.owner_name;
      const deepLink = capHit ? `/subscription` : `/my-listing?highlight=${lead.id}`;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://kakisewa.com";

      if (capHit) {
        // Cap hit — notify agent, card stays in Potential Listing
        sendPushToUser(lead.user_id, {
          title: "Property details received — My Listing is full",
          body: `${lead.owner_name} submitted details but your My Listing is full. Upgrade to move them to Listed.`,
          url: deepLink,
          tag: `intake_cap_${lead.id}`,
        }).catch(() => {});
        sendAgentEmail(
          lead.user_id,
          `${lead.owner_name} submitted details — My Listing full`,
          ownerIntakeEmail({ ownerName: lead.owner_name, propLabel, url: `${appUrl}${deepLink}` })
        ).catch(() => {});
      } else {
        const lowRemaining = remaining !== undefined && remaining <= CAP_WARN_THRESHOLD;
        const pushBody = lowRemaining
          ? `${propLabel} moved to Listed. Only ${remaining} My Listing slot${remaining === 1 ? "" : "s"} remaining.`
          : propParts.length ? `${propLabel} · ${lead.owner_name} — view in My listing` : `${lead.owner_name} — view in My listing`;
        sendPushToUser(lead.user_id, {
          title: lowRemaining ? "Property details received — almost full" : "Property details received",
          body: pushBody,
          url: deepLink,
          tag: `intake_${lead.id}`,
        }).catch(() => {});
        sendAgentEmail(
          lead.user_id,
          `${lead.owner_name} filled in property details`,
          ownerIntakeEmail({ ownerName: lead.owner_name, propLabel, url: `${appUrl}${deepLink}` })
        ).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true, message: "Submitted successfully" });
  } catch (err) {
    console.error("[intake/owner]", err);
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}
