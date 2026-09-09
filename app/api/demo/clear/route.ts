import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function DELETE() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [leadsRes, tenanciesRes] = await Promise.all([
    supabase
      .from("owner_leads")
      .delete()
      .eq("user_id", user.id)
      .eq("is_demo", true),
    supabase
      .from("tenancies")
      .delete()
      .eq("user_id", user.id)
      .eq("is_demo", true),
  ]);

  if (leadsRes.error || tenanciesRes.error) {
    const msg = leadsRes.error?.message ?? tenanciesRes.error?.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
