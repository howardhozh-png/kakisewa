import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

async function requireAdmin() {
  const hdrs = await headers();
  return hdrs.get("x-is-admin") === "true";
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { emails } = await req.json().catch(() => ({})) as { emails?: string[] };
  if (!Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ error: "emails array required" }, { status: 400 });
  }

  const rows = emails
    .map(e => e.toLowerCase().trim())
    .filter(e => e.includes("@"))
    .map(email => ({ email }));

  if (rows.length === 0) return NextResponse.json({ error: "No valid emails" }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase.from("invites").upsert(rows, { onConflict: "email", ignoreDuplicates: true }).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ added: data?.length ?? 0 }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email } = await req.json().catch(() => ({})) as { email?: string };
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const supabase = createServiceClient();
  await supabase.from("invites").delete().eq("email", email.toLowerCase().trim());
  return NextResponse.json({ ok: true });
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createServiceClient();
  const { data } = await supabase.from("invites").select("*").order("invited_at", { ascending: false });
  return NextResponse.json(data ?? []);
}
