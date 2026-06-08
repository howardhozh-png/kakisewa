import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bulkImportTenancies, type BulkImportTenancyRow } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await req.json() as { rows: BulkImportTenancyRow[] };
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows must be a non-empty array" }, { status: 400 });
  }

  const result = await bulkImportTenancies(rows, session.user.id);
  return NextResponse.json(result);
}
