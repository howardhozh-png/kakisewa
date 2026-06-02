import { NextRequest, NextResponse } from "next/server";

const INERTIA_VERSION = "cf1f9346f3708228d49e83f580927313";

export async function GET(req: NextRequest) {
  const ren = req.nextUrl.searchParams.get("ren")?.trim() ?? "";
  if (!ren) return NextResponse.json({ valid: false, error: "Missing REN" }, { status: 400 });

  // Accept "REN12345", "REN 12345", "12345" — strip prefix and spaces
  const numeric = ren.replace(/^REN\s*/i, "").trim();
  if (!numeric || !/^\d+$/.test(numeric)) {
    return NextResponse.json({ valid: false, error: "REN must be numeric (e.g. REN07128)" });
  }

  try {
    const url = `https://bis.lpeph.gov.my/search?category=negotiator&registration_no=${encodeURIComponent(numeric)}`;
    const res = await fetch(url, {
      headers: {
        "X-Inertia": "true",
        "X-Inertia-Version": INERTIA_VERSION,
        Accept: "application/json",
      },
    });

    if (!res.ok) throw new Error(`LPPEH returned ${res.status}`);

    const data = await res.json();
    const items = data?.props?.items;
    const results: Record<string, unknown>[] = items?.data ?? [];

    if (results.length === 0) {
      return NextResponse.json({ valid: false });
    }

    const hit = results[0];
    const statusHtml = (hit.validity_status_html as string) ?? "";
    const active = /active/i.test(statusHtml) && !/not\s+active/i.test(statusHtml);

    return NextResponse.json({
      valid: true,
      active,
      name: (hit.full_name as string) ?? null,
      ren: (hit.negotiator_reg_no_license as string) ?? null,
      firm: (hit as { firm?: { firm_name?: string } }).firm?.firm_name ?? null,
    });
  } catch (err) {
    console.error("REN validation error:", err);
    // Fail open — if LPPEH is down, don't block signups
    return NextResponse.json({ valid: true, warning: "Registry unavailable" });
  }
}
