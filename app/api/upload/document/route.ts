import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 20 MB)." }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 80);
    const filename = `documents/${Date.now()}-${safeName}`;
    let url: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const blob = await put(filename, file, { access: "public" });
      url = blob.url;
    } else {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "documents");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const localName = filename.replace("documents/", "");
      const bytes = await file.arrayBuffer();
      fs.writeFileSync(path.join(uploadsDir, localName), Buffer.from(bytes));
      url = `/uploads/documents/${localName}`;
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[upload/document]", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
