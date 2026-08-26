import { NextResponse } from "next/server";
import { getWaSession } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getWaSession();
  return NextResponse.json(
    session ?? { qr_data_url: null, is_authenticated: false }
  );
}
