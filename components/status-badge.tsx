import { TenancyStatus } from "@/lib/types";

const map: Record<TenancyStatus, { label: string; cls: string }> = {
  "Pending":                     { label: "Pending",        cls: "kk-status-pending"  },
  "Reminder Sent":               { label: "Reminded",       cls: "kk-status-reminder" },
  "Paid - Pending Verification": { label: "Pending verify", cls: "kk-status-upload"   },
  "Verified":                    { label: "Verified",       cls: "kk-status-verified" },
};

export function StatusBadge({ status }: { status: TenancyStatus }) {
  const { label, cls } = map[status] ?? { label: status, cls: "kk-status-pending" };
  return <span className={`kk-status ${cls}`}>{label}</span>;
}
