import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // Beta users whose beta period has ended → freeze their account
  const { data: expiredBeta } = await supabase
    .from("agent_profiles")
    .select("id")
    .eq("subscription_status", "beta")
    .lt("trial_ends_at", now);

  // Legacy trial users whose trial has ended → expire their account
  const { data: expiredTrial } = await supabase
    .from("agent_profiles")
    .select("id")
    .eq("subscription_status", "trial")
    .lt("trial_ends_at", now);

  let frozen = 0;
  let expired = 0;

  for (const agent of expiredBeta ?? []) {
    await supabase
      .from("agent_profiles")
      .update({ subscription_status: "beta_frozen" })
      .eq("id", agent.id);
    frozen++;
  }

  for (const agent of expiredTrial ?? []) {
    await supabase
      .from("agent_profiles")
      .update({ subscription_status: "expired" })
      .eq("id", agent.id);
    expired++;
  }

  return NextResponse.json({ frozen, expired });
}
