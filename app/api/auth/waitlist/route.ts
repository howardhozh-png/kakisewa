import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

const VALID_SPEND = ["<50", "50-100", "100-200", "200-300", "300-500", ">500"] as const;

const schema = z.object({
  name:          z.string().max(200).optional(),
  email:         z.string().email().max(500),
  ren_number:    z.string().max(50).optional(),
  expected_spend: z.enum(VALID_SPEND).optional(),
});

export async function POST(req: NextRequest) {
  if (!checkRateLimit(rateLimitKey(req), 5, 60_000)) {
    return NextResponse.json({ ok: false, message: "Too many requests" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  const supabase = createServiceClient();
  await supabase.from("waitlist").insert({
    name:           parsed.data.name ?? null,
    email:          parsed.data.email.toLowerCase().trim(),
    ren_number:     parsed.data.ren_number ?? null,
    expected_spend: parsed.data.expected_spend ?? null,
  });

  return NextResponse.json({ ok: true });
}
