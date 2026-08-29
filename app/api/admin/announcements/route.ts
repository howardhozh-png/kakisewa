import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { listAnnouncements, createAnnouncement } from "@/lib/announcements";

export const dynamic = "force-dynamic";

function isAdmin(hdrs: Awaited<ReturnType<typeof headers>>) {
  return hdrs.get("x-is-admin") === "true";
}

export async function GET() {
  const hdrs = await headers();
  if (!isAdmin(hdrs)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await listAnnouncements();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const hdrs = await headers();
  if (!isAdmin(hdrs)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { title, body: text, cta_label, cta_url, target_status, target_plan, send_push } = body;
  if (!title?.trim() || !text?.trim()) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }
  const ann = await createAnnouncement({ title: title.trim(), body: text.trim(), cta_label, cta_url, target_status, target_plan, send_push });
  return NextResponse.json(ann, { status: 201 });
}
