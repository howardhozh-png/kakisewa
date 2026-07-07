"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import type { PipelineType } from "@/lib/plan-caps";

const TIER_NAMES: Record<string, string> = {
  silver: "Silver", gold: "Gold", platinum: "Platinum", elite: "Elite",
};

const TIER_PRICES: Record<string, number> = {
  gold: 49, platinum: 99, elite: 159,
};

const PIPELINE_LABELS: Record<PipelineType, { title: string; unit: string; context: string }> = {
  existing:   { title: "Card limit reached", unit: "cards", context: "Cards across My Listing, Existing Listing, and Lost Listing all count toward your total." },
  my_listing: { title: "Card limit reached", unit: "cards", context: "Cards across My Listing, Existing Listing, and Lost Listing all count toward your total." },
  target:     { title: "Card limit reached", unit: "cards", context: "Cards across My Listing, Existing Listing, and Lost Listing all count toward your total." },
};

interface Props {
  open: boolean;
  pipeline?: PipelineType;
  currentPlan: string;
  currentCount: number;
  currentCap: number;
  upgradeToId: string;
  upgradeCap: number | null;
  nearestExpiryDays?: number | null;
  remaining?: number;
  trying?: number;
  onClose: () => void;
}

export function PlanCapDialog({
  open, pipeline = "existing", currentPlan, currentCount, currentCap, upgradeToId, upgradeCap, nearestExpiryDays, remaining, trying, onClose,
}: Props) {
  const planName    = TIER_NAMES[currentPlan] ?? currentPlan;
  const upgradeName = TIER_NAMES[upgradeToId] ?? upgradeToId;
  const upgradePrice = TIER_PRICES[upgradeToId];
  const { title, unit, context } = PIPELINE_LABELS[pipeline];
  const upgradeCapLabel = upgradeCap !== null ? `up to ${upgradeCap} cards` : `unlimited cards`;

  const isBulkPartial = trying !== undefined && remaining !== undefined && remaining > 0;

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

          <div>
            <h2
              className="text-[17px] font-semibold tracking-tight"
              style={{ color: "var(--kk-ink)" }}
            >
              {title}
            </h2>
            {isBulkPartial && (
              <p className="mt-1 text-[12px]" style={{ color: "var(--kk-amber)" }}>
                You have {remaining} slot{remaining === 1 ? "" : "s"} left, trying to move {trying}
              </p>
            )}
          </div>

          <p
            className="text-[13px] leading-relaxed"
            style={{ color: "var(--kk-ink-mute)", maxWidth: "32ch" }}
          >
            {planName} includes {currentCap} {unit}. You have{" "}
            <span style={{ color: "var(--kk-ink)", fontWeight: 600 }}>{currentCount}/{currentCap}</span> active.
            {" "}{context}
            {nearestExpiryDays !== null && nearestExpiryDays !== undefined && (
              <>
                {" "}Your next renewal is due in{" "}
                <span style={{ color: "var(--kk-ink)", fontWeight: 600 }}>
                  {nearestExpiryDays} days
                </span>.{" "}
                Missing the 60-day conversation window risks losing the commission.
              </>
            )}
            {" "}Upgrade to {upgradeName} for {upgradeCapLabel}.
          </p>

          <div className="w-full flex flex-col gap-2 mt-1">
            <Link
              href="/subscription"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-semibold text-[13px] transition-opacity hover:opacity-90"
              style={{ background: "var(--kk-ink)", color: "#fff" }}
            >
              Upgrade to {upgradeName}{upgradePrice ? `, RM ${upgradePrice}/mo` : ""} <ArrowRight className="w-3.5 h-3.5" />
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
