"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ActionStage } from "@/lib/types";
import { ArrowRight, Loader2 } from "lucide-react";
import { useTransition } from "react";

const STAGE_QUESTION: Record<ActionStage, (name: string) => string> = {
  owing:            (n) => `Reset ${n} back to owing? Receipt and forwarded state will be cleared.`,
  nearing:          (n) => `Reset ${n} back to upcoming? Receipt and forwarded state will be cleared.`,
  pending_verify:   (n) => `Did ${n} pay? This marks the receipt as awaiting verification.`,
  awaiting_forward: (n) => `Verify ${n}'s payment as good and ready to forward to the owner?`,
  completed:        (n) => `Confirm you've forwarded ${n}'s receipt to the owner?`,
};

const STAGE_LABEL: Record<ActionStage, string> = {
  owing:            "Owing",
  nearing:          "Due soon",
  pending_verify:   "Pending verify",
  awaiting_forward: "Awaiting forward",
  completed:        "Completed",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantName: string;
  fromStage: ActionStage | null;
  toStage: ActionStage | null;
  onConfirm: () => Promise<void> | void;
}

export function AdvanceConfirmDialog({
  open, onOpenChange, tenantName, fromStage, toStage, onConfirm,
}: Props) {
  const [pending, startTransition] = useTransition();

  if (!toStage) return null;

  const question = STAGE_QUESTION[toStage](tenantName);

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
            <p className="kk-overline mb-3">Confirm move</p>
            <h3
              className="text-[18px] font-semibold leading-tight"
              style={{ color: "var(--kk-ink)", letterSpacing: "-0.014em" }}
            >
              {question}
            </h3>
          </div>

          {fromStage && (
            <div className="flex items-center gap-2 text-[13px] tabular-nums" style={{ color: "var(--kk-ink-mute)" }}>
              <span className="px-2.5 py-1 rounded-full" style={{ background: "var(--kk-surface-2)" }}>
                {STAGE_LABEL[fromStage]}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
              <span
                className="px-2.5 py-1 rounded-full font-medium"
                style={{ background: "var(--kk-ink)", color: "#fff" }}
              >
                {STAGE_LABEL[toStage]}
              </span>
            </div>
          )}

          <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
            This updates the tenancy and recomputes downstream signals like the collection trend.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="kk-pill kk-pill-ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="kk-pill kk-pill-primary"
              onClick={handleConfirm}
              disabled={pending}
            >
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {pending ? "Saving…" : "Yes, move it"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
