import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-revalidate-secret");
  if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-8)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  (revalidateTag as unknown as (tag: string) => void)("kk-tenancies");
  (revalidateTag as unknown as (tag: string) => void)("kk-owner-leads");
  (revalidateTag as unknown as (tag: string) => void)("kk-properties");
  return NextResponse.json({ ok: true, revalidated: ["kk-tenancies", "kk-owner-leads", "kk-properties"] });
}
