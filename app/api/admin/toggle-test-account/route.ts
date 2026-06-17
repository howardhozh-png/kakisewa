import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(req: NextRequest) {
  const hdrs = await headers();
  if (hdrs.get("x-is-admin") !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, is_test_account } = await req.json();
  if (!id || typeof is_test_account !== "boolean") {
    return NextResponse.json({ error: "Missing id or is_test_account" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("agent_profiles")
    .update({ is_test_account })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
