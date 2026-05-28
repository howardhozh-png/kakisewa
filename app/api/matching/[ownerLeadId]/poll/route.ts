import { NextRequest, NextResponse } from "next/server";
import { getPendingIntakesForLead, getOrCreateMatchPack, getPackTenants } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ownerLeadId: string }> }
) {
  const { ownerLeadId } = await params;
  const [pending, pack] = await Promise.all([
    getPendingIntakesForLead(ownerLeadId),
    getOrCreateMatchPack(ownerLeadId),
  ]);
  const tenants = await getPackTenants(pack.id);
  return NextResponse.json({ pending, tenants });
}
