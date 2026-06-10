import { NextRequest, NextResponse } from "next/server";
import { purgeSoftDeletedLeads, purgeSoftDeletedTenancies } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [leads, tenancies] = await Promise.all([
    purgeSoftDeletedLeads(),
    purgeSoftDeletedTenancies(),
  ]);
  return NextResponse.json({ purged: { leads, tenancies } });
}
