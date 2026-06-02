import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "howardhozh@gmail.com";

async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === ADMIN_EMAIL;
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { slug, label } = body as { slug?: string; label?: string };

  if (!slug || !label || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug or label" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("ref_links")
    .insert({ slug, label })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { id, sends_count } = body as { id?: string; sends_count?: number };

  if (!id || typeof sends_count !== "number" || sends_count < 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("ref_links")
    .update({ sends_count })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
