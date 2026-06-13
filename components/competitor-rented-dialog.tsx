"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DateInput } from "@/components/ui/date-input";
import { markCompetitorRentedAction } from "@/lib/actions";
import { PlanCapDialog } from "@/components/plan-cap-dialog";
import { OwnerLead } from "@/lib/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  lead: OwnerLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompetitorRentedDialog({ lead, open, onOpenChange }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rentedOn, setRentedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState("12");
  const [capBlock, setCapBlock] = useState<{ currentPlan: string; currentCount: number; currentCap: number; upgradeToId: string; upgradeCap: number | null } | null>(null);

  const contractEnd = (() => {
    if (!rentedOn || !duration) return "";
    const [y, m, day] = rentedOn.split("-").map(Number);
    const months = parseInt(duration, 10);
    if (!months) return "";
    const end = new Date(y, m - 1 + months, day);
    return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  })();

  function handleSubmit() {
    if (!lead || !rentedOn || !duration) return;
    startTransition(async () => {
      const res = await markCompetitorRentedAction(lead.id, rentedOn, parseInt(duration, 10));
      if (res.ok) {
        toast.success("Moved to Target Units — watching for renewal");
        onOpenChange(false);
        router.refresh();
      } else if (res.reason === "plan_cap_reached") {
        onOpenChange(false);
        setCapBlock({ currentPlan: res.current_plan ?? "silver", currentCount: res.current_count ?? 0, currentCap: res.current_cap ?? 10, upgradeToId: res.upgrade_to ?? "gold", upgradeCap: res.upgrade_cap ?? null });
      } else {
        toast.error("Could not save");
      }
    });
  }

  if (!lead) return null;

  const field = "w-full text-[14px] px-3 py-2 rounded-xl outline-none";
  const fieldStyle = { background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" };

  return (
    <>
      <PlanCapDialog
        open={!!capBlock}
        pipeline="target"
        currentPlan={capBlock?.currentPlan ?? "silver"}
        currentCount={capBlock?.currentCount ?? 0}
        currentCap={capBlock?.currentCap ?? 10}
        upgradeToId={capBlock?.upgradeToId ?? "gold"}
        upgradeCap={capBlock?.upgradeCap ?? null}
        nearestExpiryDays={null}
        onClose={() => setCapBlock(null)}
      />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="bg-card border-border max-w-sm p-0 overflow-hidden">
        <div className="p-6 space-y-5">
          <div>
            <p className="kk-overline mb-1">Competitor rented</p>
            <h2 className="text-[18px] font-semibold leading-tight" style={{ color: "var(--kk-ink)" }}>
              {lead.property_name ?? "This unit"}{lead.unit ? ` · ${lead.unit}` : ""}
            </h2>
            <p className="text-[13px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>
              Card moves to Target Units. We'll remind you 60 days before their tenancy ends.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Rented on</label>
              <DateInput value={rentedOn} onChange={setRentedOn} className={field} style={fieldStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Duration (months)</label>
              <input
                type="number"
                value={duration}
                min="1"
                max="36"
                onChange={e => setDuration(e.target.value)}
                className={field}
                style={fieldStyle}
              />
            </div>
          </div>

          {contractEnd && (
            <p className="text-[13px] px-3 py-2 rounded-xl" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>
              Their tenancy ends <span className="font-semibold" style={{ color: "var(--kk-ink)" }}>
                {new Date(contractEnd).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
              </span> — you'll be reminded 60 days before.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="kk-pill kk-pill-ghost flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending || !rentedOn || !duration}
              className="kk-pill flex-1 font-semibold"
              style={{ background: "var(--kk-ink)", color: "#fff", opacity: pending || !rentedOn || !duration ? 0.5 : 1 }}
            >
              {pending ? "Saving…" : "Move to Target Units"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
