import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Mint an independent session so the blaster's token rotation doesn't invalidate the browser session
  const admin = createServiceClient();
  const { data, error } = await admin.auth.admin.createSession({ userId: session.user.id });
  if (!error && data?.session) {
    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user_id: session.user.id,
    });
  }

  // Fallback to browser tokens if admin session creation fails
  return NextResponse.json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user_id: session.user.id,
  });
}
