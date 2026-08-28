import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

// Serves blaster.mjs so agents can download it without cloning the repo.
// The file contains only the public Supabase anon key — no secrets.
export async function GET() {
  try {
    const content = readFileSync(join(process.cwd(), "scripts/blaster.mjs"), "utf-8");
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/javascript; charset=utf-8",
        "Content-Disposition": 'attachment; filename="blaster.mjs"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "blaster not found" }, { status: 404 });
  }
}
