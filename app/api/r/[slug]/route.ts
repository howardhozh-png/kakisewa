import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  // Look up the link
  const { data: link } = await supabase
    .from("ref_links")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (link) {
    // Record the click (fire-and-forget — don't block the redirect)
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const ua = request.headers.get("user-agent") ?? null;
    supabase.from("ref_clicks").insert({ link_id: link.id, ip, user_agent: ua }).then(() => {});
  }

  // Redirect to sign-up with the ref slug so we can attribute sign-ups
  const url = new URL("/sign-up", request.url);
  url.searchParams.set("ref", slug);
  return NextResponse.redirect(url, { status: 302 });
}
