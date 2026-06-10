import { NextRequest, NextResponse } from "next/server";
import { purgeSoftDeletedLeads } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const purged = await purgeSoftDeletedLeads();
  return NextResponse.json({ purged });
}
