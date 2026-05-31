"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, Banknote } from "lucide-react";
import { useTransition } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerName: string;
  propertyName: string | null;
  commissionRm: number;
  onConfirm: () => Promise<void> | void;
}

export function CommissionConfirmDialog({
  open, onOpenChange, ownerName, propertyName, commissionRm, onConfirm,
}: Props) {
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await onConfirm();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <div className="space-y-5">
          <div>
            <p className="kk-overline mb-3">Commission collected</p>
            <h3
              className="text-[18px] font-semibold leading-tight"
              style={{ color: "var(--kk-ink)", letterSpacing: "-0.014em" }}
            >
              Did you collect your commission from {ownerName}?
            </h3>
            {propertyName && (
              <p className="text-[13px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>
                {propertyName}
              </p>
            )}
          </div>

          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ background: "var(--kk-green-soft)", border: "1px solid rgba(52,199,89,0.20)" }}
          >
            <Banknote className="w-4 h-4 shrink-0" style={{ color: "#1F8B4C" }} />
            <div>
              <p className="text-[13px] font-semibold tabular-nums" style={{ color: "#1F8B4C" }}>
                RM {commissionRm.toLocaleString()}
              </p>
              <p className="text-[11px]" style={{ color: "#1F8B4C", opacity: 0.75 }}>
                est. commission
              </p>
            </div>
          </div>

          <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
            Confirming moves this tenancy to <strong>Active</strong> in the Existing Contracts board.
          </p>

          <p className="text-[12px] rounded-xl px-3.5 py-2.5" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)", border: "1px solid var(--kk-line)" }}>
            For <strong style={{ color: "var(--kk-ink)" }}>Silver</strong> users: this card will move to "Existing Contracts" which requires a <strong style={{ color: "var(--kk-ink)" }}>Platinum</strong> or <strong style={{ color: "var(--kk-ink)" }}>Elite</strong> subscription.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="kk-pill kk-pill-ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Not yet
            </button>
            <button
              type="button"
              className="kk-pill"
              style={{ background: "var(--kk-green)", color: "#fff" }}
              onClick={handleConfirm}
              disabled={pending}
            >
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {pending ? "Saving…" : "Yes, collected!"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
