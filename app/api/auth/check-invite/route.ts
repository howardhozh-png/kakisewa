import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!checkRateLimit(rateLimitKey(req), 20, 60_000)) {
    return NextResponse.json({ invited: false }, { status: 429 });
  }
  const { email } = await req.json().catch(() => ({})) as { email?: string };
  if (!email) return NextResponse.json({ invited: false }, { status: 400 });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("invites")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  return NextResponse.json({ invited: !!data });
}
