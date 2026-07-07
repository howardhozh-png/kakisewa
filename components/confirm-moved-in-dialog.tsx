"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { useTransition, useState } from "react";
import Link from "next/link";
import { confirmMovedIn } from "@/lib/actions";
import { toast } from "sonner";

interface CapInfo {
  current_plan: string;
  upgrade_to?: string;
  current_cap: number;
  upgrade_cap: number | null;
}

const TIER_NAMES: Record<string, string> = {
  silver: "Silver", gold: "Gold", platinum: "Platinum", elite: "Elite",
};
const TIER_PRICES: Record<string, number> = {
  gold: 49, platinum: 99, elite: 159,
};

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenancyId: string;
  tenantName: string;
  propertyLabel: string;
  contractStart: string | null;
  contractEnd: string | null;
  contractDurationMonths: number | null;
  amount: number;
  onConfirmed: () => void;
}

export function ConfirmMovedInDialog({
  open, onOpenChange, tenancyId, tenantName, propertyLabel,
  contractStart, contractEnd, contractDurationMonths, amount, onConfirmed,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [capInfo, setCapInfo] = useState<CapInfo | null>(null);

  function handleClose() {
    setCapInfo(null);
    onOpenChange(false);
  }

  function handleConfirm() {
    startTransition(async () => {
      const res = await confirmMovedIn(tenancyId);
      if (res.cap_reached) {
        setCapInfo(res.cap_reached);
      } else if (res.ok) {
        toast.success("Moved in confirmed. Commission recorded!");
        handleClose();
        onConfirmed();
      } else {
        toast.error(res.message ?? "Could not confirm move in.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="bg-card border-border max-w-sm">
        {capInfo ? (
          <div className="space-y-5">
            <div>
              <p className="kk-overline mb-3">Contract limit reached</p>
              <h3 className="text-[18px] font-semibold leading-tight" style={{ color: "var(--kk-ink)", letterSpacing: "-0.014em" }}>
                You&apos;ve reached your {capInfo.current_cap}-contract limit
              </h3>
              <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
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
              <button onClick={handleClose} className="w-full px-4 py-2.5 rounded-full text-[13px] font-medium transition-opacity hover:opacity-70" style={{ color: "var(--kk-ink-mute)" }}>
                Not now
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="kk-overline mb-3">Confirm moved in</p>
              <h3 className="text-[18px] font-semibold leading-tight" style={{ color: "var(--kk-ink)", letterSpacing: "-0.014em" }}>
                {tenantName} has moved in?
              </h3>
              <p className="text-[13px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>{propertyLabel}</p>
            </div>

            <div className="rounded-2xl px-4 py-3 space-y-2" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
              <Row label="Contract start" value={fmt(contractStart)} />
              <Row label="Contract end" value={fmt(contractEnd)} />
              <Row label="Duration" value={contractDurationMonths ? `${contractDurationMonths} months` : "—"} />
              <Row label="Monthly rent" value={amount ? `RM ${amount.toLocaleString()}` : "—"} />
            </div>

            <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
              Confirming records your commission and moves this deal to <strong>Existing Listing</strong>.
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="kk-pill kk-pill-ghost" onClick={handleClose} disabled={pending}>
                Not yet
              </button>
              <button
                type="button"
                className="kk-pill"
                style={{ background: "var(--kk-green)", color: "#fff" }}
                onClick={handleConfirm}
                disabled={pending}
              >
                {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {pending ? "Saving…" : "Confirm moved in"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px]" style={{ color: "var(--kk-ink-mute)" }}>{label}</span>
      <span className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--kk-ink)" }}>{value}</span>
    </div>
  );
}
