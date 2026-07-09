import { sendPushToUser } from "./push";

interface ExpiringTenancy {
  id: string;
  user_id: string;
  tenant_name: string | null;
  contract_end: string;
}

function expiryBucket(contractEnd: string): { bucket: string; label: string } | null {
  const daysLeft = Math.ceil((new Date(contractEnd).getTime() - Date.now()) / 86400000);
  if (daysLeft > 60 || daysLeft < 0) return null;
  if (daysLeft <= 7) return { bucket: "7d", label: "7 days" };
  if (daysLeft <= 30) return { bucket: "30d", label: "1 month" };
  return { bucket: "60d", label: "2 months" };
}

/**
 * Sends (and logs) the "contract expiring" push for one tenancy, unless already sent
 * for this milestone bucket. Shared by the daily cron sweep (push-notifications) and
 * the real-time trigger (updateTenancyContract) — previously duplicated independently
 * in both places, drifting apart over time.
 */
export async function notifyTenancyExpiryPush(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tenancy: ExpiringTenancy,
  propLabel: string
): Promise<"sent" | "already_sent" | "no_subscription" | "out_of_window" | "send_failed"> {
  const info = expiryBucket(tenancy.contract_end);
  if (!info) return "out_of_window";

  const notifKey = `exp_${tenancy.id}_${info.bucket}`;

  const { data: existing } = await supabase
    .from("push_sent_log")
    .select("id")
    .eq("user_id", tenancy.user_id)
    .eq("notification_key", notifKey)
    .maybeSingle();
  if (existing) return "already_sent";

  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", tenancy.user_id);
  if (!count || count === 0) return "no_subscription";

  const result = await sendPushToUser(tenancy.user_id, {
    title: `Contract expiring in ${info.label}`,
    body: `${propLabel} · ${tenancy.tenant_name ?? "Tenant"}. Send renewal message now.`,
    url: `/existing-listing?highlight=${tenancy.id}`,
    tag: notifKey,
  });

  if (result.sent > 0) {
    await supabase.from("push_sent_log").insert({ user_id: tenancy.user_id, notification_key: notifKey });
    return "sent";
  }
  return "send_failed";
}
