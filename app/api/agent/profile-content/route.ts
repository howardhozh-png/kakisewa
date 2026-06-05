import { NextRequest, NextResponse } from "next/server";
import { saveProfileContent } from "@/lib/db";
import type { ProfileStrengthItem, ProfileVerbatimItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    profile_strengths?: ProfileStrengthItem[];
    profile_verbatim?: ProfileVerbatimItem[];
  };

  // Validate strengths: max 3, rating 0.5-5.0
  const strengths = body.profile_strengths?.slice(0, 3).map(s => ({
    label: String(s.label).slice(0, 40),
    rating: Math.round(Math.min(5, Math.max(0.5, Number(s.rating))) * 2) / 2,
  }));

  // Validate verbatim: max 3, quote max 200 chars
  const verbatim = body.profile_verbatim?.slice(0, 3).map(v => ({
    quote:     String(v.quote).slice(0, 200).trim(),
    ownerName: String(v.ownerName).slice(0, 60).trim(),
    ownerRole: String(v.ownerRole).slice(0, 60).trim(),
  })).filter(v => v.quote.length > 0);

  await saveProfileContent({ profile_strengths: strengths, profile_verbatim: verbatim });
  return NextResponse.json({ ok: true });
}
