import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dismissAnnouncement } from "@/lib/announcements";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const hdrs = await headers();
  const userId = hdrs.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await dismissAnnouncement(userId, id);
  return NextResponse.json({ ok: true });
}
