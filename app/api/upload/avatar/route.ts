import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, WebP or GIF accepted." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5 MB)." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    let url: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const blob = await put(`avatars/agent-${Date.now()}.${ext}`, file, { access: "public" });
      url = blob.url;
    } else {
      const dir = path.join(process.cwd(), "public", "uploads", "avatars");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filename = `agent-${Date.now()}.${ext}`;
      const bytes = await file.arrayBuffer();
      fs.writeFileSync(path.join(dir, filename), Buffer.from(bytes));
      url = `/uploads/avatars/${filename}`;
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[upload/avatar]", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
