import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

const ALLOWED = [
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/gif",
  "application/pdf",
];

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "Only images and PDFs are accepted." }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 20 MB)." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const filename = `documents/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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
