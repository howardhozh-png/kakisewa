import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const DAILY_LIMIT = 10;

const SYSTEM_PROMPT = `You map spreadsheet column headers to these fields: owner_name, owner_phone, address, property_name, unit, expected_rent, bedrooms, bathrooms, notes, contract_start, contract_end, contract_duration_months, amount, tenant_name, tenant_phone, due_day.
Given headers and sample rows, return ONLY JSON: {"mapping": {"0": "owner_name", "1": "owner_phone", ...}, "confidence": "high"|"medium"|"low"}.
Map only columns you're reasonably sure about. Omit columns that don't match any field. No prose, no markdown, JSON only.`;

interface MapColumnsBody {
  headers: string[];
  sampleRows: string[][];
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { headers, sampleRows } = (await req.json()) as MapColumnsBody;
  if (!Array.isArray(headers) || headers.length === 0) {
    return NextResponse.json({ error: "headers must be a non-empty array" }, { status: 400 });
  }

  const svc = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: usage } = await svc
    .from("ai_mapping_usage")
    .select("count")
    .eq("user_id", session.user.id)
    .eq("usage_date", today)
    .maybeSingle();

  if ((usage?.count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: "unavailable" });
  }

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify({ headers, sampleRows }) }],
    });

    const raw = res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
    const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(text) as { mapping: Record<string, string>; confidence: "high" | "medium" | "low" };

    await svc.from("ai_mapping_usage").upsert(
      { user_id: session.user.id, usage_date: today, count: (usage?.count ?? 0) + 1 },
      { onConflict: "user_id,usage_date" }
    );

    return NextResponse.json({ ok: true, mapping: parsed.mapping, confidence: parsed.confidence });
  } catch {
    return NextResponse.json({ ok: false, reason: "ai_error" });
  }
}
