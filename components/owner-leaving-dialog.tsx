"use client";

import { useTransition } from "react";
import { usePostHog } from "posthog-js/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tenancy } from "@/lib/types";
import { moveOwnerLeaving } from "@/lib/actions";
import { ArrowDownLeft, Loader2, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

interface Props {
  t: Tenancy;
  open: boolean;
  onClose: () => void;
}

export function OwnerLeavingDialog({ t, open, onClose }: Props) {
  const [pending, startTransition] = useTransition();
  const ph = usePostHog();

  function confirm() {
    startTransition(async () => {
      const res = await moveOwnerLeaving(t.id);
      if (res.ok) {
        track(ph, "renewal_actioned", { action: "leaving", party: "owner", tenancy_id: t.id });
        toast.success("Owner lead created and tenant marked as seeking.");
        onClose(); // board-level onClose handles router.refresh()
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent showCloseButton={false} className="bg-card border-border max-w-sm p-6">
        <div className="flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>
                <ArrowDownLeft className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[15px] font-semibold" style={{ color: "var(--kk-ink)" }}>Owner Leaving</p>
                <p className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>{t.property?.owner_name ?? "Owner"} · {t.property_name}</p>
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
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--kk-ink-faint)" }} />
              <span><strong>{t.property?.owner_name ?? "Owner"}</strong> is added to Make New Money as <strong>Own Stay</strong></span>
            </div>
            <div className="flex items-start gap-2 text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--kk-green)" }} />
              <span><strong>{t.tenant_name}</strong> is marked as <strong>Seeking</strong> in All Tenants (budget RM {t.amount.toLocaleString()}/mo)</span>
            </div>
            <div className="flex items-start gap-2 text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>
              <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--kk-ink-faint)" }} />
              <span>This tenancy is archived</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 kk-pill kk-pill-ghost text-[13px] py-2" disabled={pending}>Cancel</button>
            <button
              onClick={confirm}
              disabled={pending}
              className="flex-1 kk-scale-hover flex items-center justify-center gap-1.5 text-[13px] font-semibold py-2 rounded-full"
              style={{ background: "var(--kk-ink)", color: "#fff" }}
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownLeft className="w-4 h-4" />}
              Confirm
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
