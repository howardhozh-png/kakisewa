import { NextRequest, NextResponse } from "next/server";
import { getOwnerLeadByIntakeToken } from "@/lib/db";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const token = form.get("token") as string | null;
    const file = form.get("file") as File | null;

    if (!token || !file) {
      return NextResponse.json({ error: "Missing token or file" }, { status: 400 });
    }

    const lead = await getOwnerLeadByIntakeToken(token);
    if (!lead) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
      return NextResponse.json({ error: "Only image files are accepted." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10 MB)." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    let url: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Vercel Blob (swap for R2 when ready)
      const { put } = await import("@vercel/blob");
      const blob = await put(`owner-photos/${lead.id}/${Date.now()}.${ext}`, file, { access: "public" });
      url = blob.url;
    } else {
      // Local disk — fine for dev / small single-server deployments
      const dir = path.join(process.cwd(), "public", "uploads", "owner-photos", lead.id);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filename = `${Date.now()}.${ext}`;
      const bytes = await file.arrayBuffer();
      fs.writeFileSync(path.join(dir, filename), Buffer.from(bytes));
      url = `/uploads/owner-photos/${lead.id}/${filename}`;
    }

    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("[intake/photo]", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
