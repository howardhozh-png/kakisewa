import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ error: "No Resend key" }, { status: 500 });

  const action = req.nextUrl.searchParams.get("action") ?? "list";

  if (action === "list") {
    const r = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    return NextResponse.json(await r.json());
  }

  if (action === "disable-tracking") {
    const domainId = req.nextUrl.searchParams.get("domainId");
    if (!domainId) return NextResponse.json({ error: "domainId required" }, { status: 400 });
    const r = await fetch(`https://api.resend.com/domains/${domainId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ click_tracking: false, open_tracking: false }),
    });
    return NextResponse.json(await r.json());
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
