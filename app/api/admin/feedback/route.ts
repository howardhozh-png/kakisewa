import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { headers } from "next/headers";

export async function PATCH(req: NextRequest) {
  const hdrs = await headers();
  if (hdrs.get("x-is-admin") !== "true") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, resolved } = await req.json() as { id: string; resolved: boolean };
  const supabase = createServiceClient();
  const { error } = await supabase.from("feedback").update({ resolved }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
