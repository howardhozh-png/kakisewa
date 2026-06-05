import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const SILVER_CARD_CAP = 5;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Find all agents whose trial has expired but haven't been downgraded yet
  const { data: expired } = await supabase
    .from("agent_profiles")
    .select("id")
    .eq("subscription_status", "trial")
    .lt("trial_ends_at", new Date().toISOString());

  if (!expired || expired.length === 0) {
    return NextResponse.json({ downgraded: 0 });
  }

  let downgraded = 0;

  for (const agent of expired) {
    const userId = agent.id as string;

    // 1. Fetch active renewal cards ordered oldest first
    const { data: cards } = await supabase
      .from("tenancies")
      .select("id")
      .eq("user_id", userId)
      .not("contract_end", "is", null)
      .eq("outcome", "pending")
      .or("lifecycle_stage.is.null,lifecycle_stage.neq.closed")
      .order("created_at", { ascending: true });

    const cardIds = (cards ?? []).map((c: { id: string }) => c.id);
    const toKeep = cardIds.slice(0, SILVER_CARD_CAP);
    const toArchive = cardIds.slice(SILVER_CARD_CAP);

    // 2. Archive overflow cards
    if (toArchive.length > 0) {
      await supabase
        .from("tenancies")
        .update({ lifecycle_stage: "closed" })
        .in("id", toArchive);
    }

    // 3. Pause all tenant pack links for this agent
    await supabase
      .from("match_packs")
      .update({ is_paused: true })
      .eq("agent_id", userId);

    // 4. Downgrade plan + set notice flag
    await supabase
      .from("agent_profiles")
      .update({
        subscription_status: "active",
        subscription_plan: "silver",
        trial_downgrade_archived_count: toArchive.length,
      })
      .eq("id", userId);

    downgraded++;
  }

  return NextResponse.json({ downgraded });
}
