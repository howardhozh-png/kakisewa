"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, Megaphone } from "lucide-react";
import { useTransition } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerName: string;
  propertyName: string | null;
  unit: string | null;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmListedDialog({ open, onOpenChange, ownerName, propertyName, unit, onConfirm }: Props) {
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await onConfirm();
      onOpenChange(false);
    });
  }

  const propertyLabel = [propertyName, unit].filter(Boolean).join(", Unit ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <div className="space-y-5">
          <div>
            <p className="kk-overline mb-3">Confirm listing</p>
            <h3
              className="text-[18px] font-semibold leading-tight"
              style={{ color: "var(--kk-ink)", letterSpacing: "-0.014em" }}
            >
              Move {ownerName}&apos;s property to Listed?
            </h3>
            {propertyLabel && (
              <p className="text-[13px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>
                {propertyLabel}
              </p>
            )}
          </div>

          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ background: "rgba(0,113,227,0.06)", border: "1px solid rgba(0,113,227,0.18)" }}
          >
            <Megaphone className="w-4 h-4 shrink-0" style={{ color: "var(--kk-blue)" }} />
            <p className="text-[13px]" style={{ color: "var(--kk-blue)" }}>
              Property details have been reviewed and are ready to list.
            </p>
          </div>

          <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
            Confirming moves this property to <strong>Listed</strong> on the pipeline board.
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
              style={{ background: "var(--kk-blue)", color: "#fff" }}
              onClick={handleConfirm}
              disabled={pending}
            >
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {pending ? "Moving…" : "Yes, move to Listed!"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
