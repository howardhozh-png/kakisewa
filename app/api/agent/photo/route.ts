import { NextRequest, NextResponse } from "next/server";
import { getOwnerLead } from "@/lib/db";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const leadId = form.get("leadId") as string | null;
    const file = form.get("file") as File | null;

    if (!leadId || !file) {
      return NextResponse.json({ error: "Missing leadId or file" }, { status: 400 });
    }

    const lead = await getOwnerLead(leadId);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
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
      const { put } = await import("@vercel/blob");
      const blob = await put(`owner-photos/${lead.id}/${Date.now()}.${ext}`, file, { access: "public" });
      url = blob.url;
    } else {
      const dir = path.join(process.cwd(), "public", "uploads", "owner-photos", lead.id);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filename = `${Date.now()}.${ext}`;
      const bytes = await file.arrayBuffer();
      fs.writeFileSync(path.join(dir, filename), Buffer.from(bytes));
      url = `/uploads/owner-photos/${lead.id}/${filename}`;
    }

    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("[agent/photo]", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
