import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/db";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const to = req.nextUrl.searchParams.get("to") ?? session.user.email!;
  const name = req.nextUrl.searchParams.get("name") ?? "Howard";
  const isBeta = req.nextUrl.searchParams.get("beta") === "true";
  const passcode = req.nextUrl.searchParams.get("passcode") ?? undefined;

  await sendWelcomeEmail(to, name, isBeta, passcode);
  return NextResponse.json({ ok: true, sent_to: to });
}
