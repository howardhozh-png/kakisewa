/**
 * POST /api/upload
 * Accepts multipart/form-data: file (File), tenancy_id (string)
 *
 * When BLOB_READ_WRITE_TOKEN is set: uploads to Vercel Blob (public, CDN-cached).
 * Otherwise: saves to public/uploads/ for local development.
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const tenancyId = form.get("tenancy_id") as string | null;

    if (!file || !tenancyId) {
      return NextResponse.json({ error: "Missing file or tenancy_id" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/gif"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Only image files are accepted." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10 MB)." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filename = `receipts/${tenancyId}-${Date.now()}.${ext}`;
    let url: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // ── Vercel Blob (production) ───────────────────────────────────────────
      const { put } = await import("@vercel/blob");
      const blob = await put(filename, file, { access: "public" });
      url = blob.url;
    } else {
      // ── Local filesystem (development fallback) ────────────────────────────
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const localName = filename.replace("receipts/", "");
      const bytes = await file.arrayBuffer();
      fs.writeFileSync(path.join(uploadsDir, localName), Buffer.from(bytes));
      url = `/uploads/${localName}`;
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
