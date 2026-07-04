"use client";

import { useState, useTransition } from "react";
import { usePostHog } from "posthog-js/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PlanCapDialog } from "@/components/plan-cap-dialog";
import { Tenancy } from "@/lib/types";
import { moveTenantLeaving } from "@/lib/actions";
import { RefreshCw, Loader2, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { DateInput } from "@/components/ui/date-input";
import { track } from "@/lib/analytics";
import { CAP_WARN_THRESHOLD } from "@/lib/cap-constants";

type CapBlock = { currentPlan: string; currentCount: number; currentCap: number; upgradeToId: string; upgradeCap: number | null };

interface Props {
  t: Tenancy;
  open: boolean;
  onClose: () => void;
}

export function TenantLeavingDialog({ t, open, onClose }: Props) {
  const [pending, startTransition] = useTransition();
  const ph = usePostHog();
  const [rent, setRent] = useState(String(t.renewal_proposed_rent ?? t.amount));
  const [availableFrom, setAvailableFrom] = useState(t.renewal_proposed_start ?? t.contract_end ?? "");
  const [capBlock, setCapBlock] = useState<CapBlock | null>(null);

  function confirm() {
    const expectedRent = parseFloat(rent) || t.amount;
    startTransition(async () => {
      const res = await moveTenantLeaving(t.id, {
        expectedRent,
        availableFrom: availableFrom || null,
      });
      if (res.ok) {
        track(ph, "renewal_actioned", { action: "leaving", party: "tenant", tenancy_id: t.id });
        if (res.low_remaining) {
          toast.warning(`Only ${res.remaining} My Listing slot${res.remaining === 1 ? "" : "s"} remaining.`);
        } else {
          toast.success("New listing created in My Listing.");
        }
        onClose();
      } else if (res.reason === "plan_cap_reached") {
        setCapBlock({
          currentPlan: res.current_plan!,
          currentCount: res.current_count!,
          currentCap: res.current_cap!,
          upgradeToId: res.upgrade_to!,
          upgradeCap: res.upgrade_cap ?? null,
        });
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <>
    {capBlock && (
      <PlanCapDialog
        open={!!capBlock}
        pipeline="my_listing"
        currentPlan={capBlock.currentPlan}
        currentCount={capBlock.currentCount}
        currentCap={capBlock.currentCap}
        upgradeToId={capBlock.upgradeToId}
        upgradeCap={capBlock.upgradeCap}
        onClose={() => setCapBlock(null)}
      />
    )}
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent showCloseButton={false} className="bg-card border-border max-w-sm p-6">
        <div className="flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--kk-purple-soft)", color: "var(--kk-purple-ink)" }}>
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[15px] font-semibold" style={{ color: "var(--kk-ink)" }}>Tenant Leaving</p>
                <p className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>{t.tenant_name} · {t.property_name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70" style={{ color: "var(--kk-ink-faint)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* What happens */}
          <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "var(--kk-surface-2)" }}>
            <p className="text-[12px] font-semibold" style={{ color: "var(--kk-ink)" }}>What happens next</p>
            <div className="flex items-start gap-2 text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--kk-green)" }} />
              <span>A new <strong>Listed</strong> property is created in Make New Money for {t.property?.owner_name ?? "the owner"}</span>
            </div>
            <div className="flex items-start gap-2 text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--kk-green)" }} />
              <span>This tenancy is archived</span>
            </div>
          </div>

          {/* Listing details */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium" style={{ color: "var(--kk-ink-mute)" }}>Expected rent (RM/mo)</label>
              <input type="number" value={rent} onChange={(e) => setRent(e.target.value)} className="kk-input" style={{ fontSize: 14 }} min={0} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium" style={{ color: "var(--kk-ink-mute)" }}>Available from</label>
              <DateInput value={availableFrom} onChange={setAvailableFrom} className="kk-input" style={{ fontSize: 14 }} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 kk-pill kk-pill-ghost text-[13px] py-2" disabled={pending}>Cancel</button>
            <button
              onClick={confirm}
              disabled={pending}
              className="flex-1 kk-scale-hover flex items-center justify-center gap-1.5 text-[13px] font-semibold py-2 rounded-full"
              style={{ background: "var(--kk-purple-ink)", color: "#fff" }}
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Create listing
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
