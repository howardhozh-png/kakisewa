import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { publishAnnouncement, getReadCount } from "@/lib/announcements";

export const dynamic = "force-dynamic";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const hdrs = await headers();
  if (hdrs.get("x-is-admin") !== "true") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await publishAnnouncement(id);
  const readCount = await getReadCount(id);
  return NextResponse.json({ ok: true, read_count: readCount });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const hdrs = await headers();
  if (hdrs.get("x-is-admin") !== "true") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const readCount = await getReadCount(id);
  return NextResponse.json({ read_count: readCount });
}
