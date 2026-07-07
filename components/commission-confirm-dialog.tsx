"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, Banknote, ArrowRight } from "lucide-react";
import { useTransition, useState } from "react";
import Link from "next/link";

interface CapInfo {
  current_plan: string;
  upgrade_to?: string;
  current_cap: number;
  upgrade_cap: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerName: string;
  propertyName: string | null;
  commissionRm: number;
  onConfirm: () => Promise<{ ok: boolean; message?: string; cap_reached?: CapInfo }>;
}

const TIER_NAMES: Record<string, string> = {
  silver: "Silver", gold: "Gold", platinum: "Platinum", elite: "Elite",
};

const TIER_PRICES: Record<string, number> = {
  gold: 49, platinum: 99, elite: 159,
};

export function CommissionConfirmDialog({
  open, onOpenChange, ownerName, propertyName, commissionRm, onConfirm,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [capInfo, setCapInfo] = useState<CapInfo | null>(null);

  function handleClose() {
    setCapInfo(null);
    onOpenChange(false);
  }

  function handleConfirm() {
    startTransition(async () => {
      const res = await onConfirm();
      if (res.cap_reached) {
        setCapInfo(res.cap_reached);
      } else {
        handleClose();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="bg-card border-border max-w-sm">
        {capInfo ? (
          // Cap reached — show upgrade prompt
          <div className="space-y-5">
            <div>
              <p className="kk-overline mb-3">Contract limit reached</p>
              <h3 className="text-[18px] font-semibold leading-tight" style={{ color: "var(--kk-ink)", letterSpacing: "-0.014em" }}>
                You&apos;ve reached your {capInfo.current_cap}-contract limit
              </h3>
              <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
                You&apos;re managing a growing portfolio.{" "}
                {capInfo.upgrade_cap !== null
                  ? `Upgrade to ${TIER_NAMES[capInfo.upgrade_to ?? "elite"]} for up to ${capInfo.upgrade_cap} contracts.`
                  : `Upgrade to ${TIER_NAMES[capInfo.upgrade_to ?? "elite"]} for unlimited contracts.`}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href="/subscription"
                onClick={handleClose}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-semibold text-[13px] transition-opacity hover:opacity-90"
                style={{ background: "var(--kk-ink)", color: "#fff" }}
              >
                Upgrade to {TIER_NAMES[capInfo.upgrade_to ?? "elite"]}
                {TIER_PRICES[capInfo.upgrade_to ?? ""] ? `, RM ${TIER_PRICES[capInfo.upgrade_to ?? ""]}/mo` : ""}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={handleClose}
                className="w-full px-4 py-2.5 rounded-full text-[13px] font-medium transition-opacity hover:opacity-70"
                style={{ color: "var(--kk-ink-mute)" }}
              >
                Not now
              </button>
            </div>
          </div>
        ) : (
          // Normal confirm flow
          <div className="space-y-5">
            <div>
              <p className="kk-overline mb-3">Commission collected</p>
              <h3 className="text-[18px] font-semibold leading-tight" style={{ color: "var(--kk-ink)", letterSpacing: "-0.014em" }}>
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

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="kk-pill kk-pill-ghost"
                onClick={handleClose}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
