"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";

interface Props {
  open: boolean;
  nearestExpiryDays: number | null;
  onClose: () => void;
}

export function PlanCapDialog({ open, nearestExpiryDays, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent showCloseButton={false} className="bg-card border-border max-w-sm p-6">
        <div className="flex flex-col items-center text-center gap-4">

          <div
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "var(--kk-surface-2)" }}
          >
            <Lock className="w-5 h-5" style={{ color: "var(--kk-ink-mute)" }} />
          </div>

          <h2
            className="text-[17px] font-semibold tracking-tight"
            style={{ color: "var(--kk-ink)" }}
          >
            You&apos;ve reached your renewal limit
          </h2>

          <p
            className="text-[13px] leading-relaxed"
            style={{ color: "var(--kk-ink-mute)", maxWidth: "30ch" }}
          >
            Silver includes 5 renewal tracking cards. You have 5/5 active contracts tracked.
            {nearestExpiryDays !== null && (
              <>
                {" "}Your next renewal is due in{" "}
                <span style={{ color: "var(--kk-ink)", fontWeight: 600 }}>
                  {nearestExpiryDays} days
                </span>.{" "}
                Missing the 60-day conversation window risks losing the commission.
              </>
            )}
          </p>

          <div className="w-full flex flex-col gap-2 mt-1">
            <Link
              href="/subscription"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-semibold text-[13px] transition-opacity hover:opacity-90"
              style={{ background: "var(--kk-ink)", color: "#fff" }}
            >
              Upgrade to Platinum — RM 159/mo <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 rounded-full text-[13px] font-medium transition-opacity hover:opacity-70"
              style={{ color: "var(--kk-ink-mute)" }}
            >
              Not now
            </button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
