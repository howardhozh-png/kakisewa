import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ hasDemo: false });

  const [leads, tenancies] = await Promise.all([
    supabase.from("owner_leads").select("id").eq("user_id", user.id).eq("is_demo", true).limit(1),
    supabase.from("tenancies").select("id").eq("user_id", user.id).eq("is_demo", true).limit(1),
  ]);

  const hasDemo = (leads.data?.length ?? 0) > 0 || (tenancies.data?.length ?? 0) > 0;
  return NextResponse.json({ hasDemo });
}
