import { NextRequest, NextResponse } from "next/server";
import { getAgentByBoardSlug } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { slug, passcode } = await req.json();
  if (!slug || !passcode) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const agent = await getAgentByBoardSlug(slug);
  if (!agent || !agent.board_passcode) return NextResponse.json({ error: "Link not found" }, { status: 404 });

  if (passcode !== agent.board_passcode) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(`kk_board_${slug}`, passcode, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: `/mypipeline/${slug}`,
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return res;
}
