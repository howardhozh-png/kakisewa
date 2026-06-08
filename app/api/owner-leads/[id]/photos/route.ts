import { NextRequest, NextResponse } from "next/server";
import { updateOwnerLeadPhotos } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { urls } = (await req.json()) as { urls: string[] };
  if (!Array.isArray(urls)) {
    return NextResponse.json({ error: "urls must be an array" }, { status: 400 });
  }
  await updateOwnerLeadPhotos(id, urls.slice(0, 10));
  return NextResponse.json({ ok: true });
}
