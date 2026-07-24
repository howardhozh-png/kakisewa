"use client";

import { useState, useTransition } from "react";
import { usePostHog } from "posthog-js/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { OwnerLead } from "@/lib/types";
import { markLeadAsSoldAction } from "@/lib/actions";
import { CheckCircle, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

interface Props {
  lead: OwnerLead | null;
  open: boolean;
  onClose: () => void;
  onSold?: () => void;
  defaultCommissionPct?: number | null;
}

export function MarkAsSoldDialog({ lead, open, onClose, onSold, defaultCommissionPct }: Props) {
  const [pending, startTransition] = useTransition();
  const ph = usePostHog();

  const defaultPrice = lead?.expected_sale_price ?? null;
  const defaultPct = lead?.expected_sale_commission_pct ?? defaultCommissionPct ?? null;

  const [priceVal, setPriceVal] = useState(defaultPrice != null ? String(defaultPrice) : "");
  const [pctVal, setPctVal] = useState(defaultPct != null ? String(defaultPct) : "");

  // Reset fields whenever a different lead opens the dialog
  const [openedForId, setOpenedForId] = useState<string | null>(null);
  if (lead && lead.id !== openedForId && open) {
    setOpenedForId(lead.id);
    setPriceVal(lead.expected_sale_price != null ? String(lead.expected_sale_price) : "");
    setPctVal(
      lead.expected_sale_commission_pct != null
        ? String(lead.expected_sale_commission_pct)
        : defaultCommissionPct != null
          ? String(defaultCommissionPct)
          : ""
    );
  }

  const price = parseFloat(priceVal) || 0;
  const pct = parseFloat(pctVal) || 0;
  const commissionAmt = Math.round(price * pct / 100);

  function confirm() {
    if (!lead || price <= 0 || pct <= 0) return;
    startTransition(async () => {
      const res = await markLeadAsSoldAction(lead.id, { salePrice: price, commissionPct: pct });
      if (res.ok) {
        track(ph, "listing_marked_sold", { owner_lead_id: lead.id });
        toast.success("Sale commission recorded.");
        onSold?.();
        onClose();
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
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.10)", color: "#7C3AED" }}>
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[15px] font-semibold" style={{ color: "var(--kk-ink)" }}>Mark as Sold</p>
                <p className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>{lead?.property_name}{lead?.unit ? ` · Unit ${lead.unit}` : ""}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: "var(--kk-ink-mute)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium" style={{ color: "var(--kk-ink-mute)" }}>Final sale price (RM)</label>
              <input
                type="number"
                value={priceVal}
                onChange={(e) => setPriceVal(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                step={1000}
                min={0}
                className="kk-input"
                style={{ fontSize: 14 }}
              />
              {defaultPrice != null && (
                <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
                  Pre-filled from your listed asking price — edit to match what it actually sold for.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium" style={{ color: "var(--kk-ink-mute)" }}>Commission %</label>
              <input
                type="number"
                value={pctVal}
                onChange={(e) => setPctVal(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                step={0.5}
                min={0}
                className="kk-input"
                style={{ fontSize: 14 }}
              />
            </div>
          </div>

          {/* Commission summary */}
          <div className="rounded-xl p-4" style={{ background: "rgba(124,58,237,0.08)" }}>
            <p className="text-[12px] font-medium" style={{ color: "#7C3AED" }}>Sale commission earned</p>
            <p className="text-[22px] font-bold tabular-nums mt-1" style={{ color: "#7C3AED" }}>
              RM {commissionAmt.toLocaleString()}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "#7C3AED", opacity: 0.75 }}>
              {pct || 0}% of RM {price.toLocaleString()} sale price
            </p>
          </div>

          {/* Destination hint */}
          <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
            The sale details above will be saved and this card will be removed from the board.
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 kk-pill kk-pill-ghost text-[13px] py-2" disabled={pending}>
              Cancel
            </button>
            <button
              onClick={confirm}
              disabled={pending || price <= 0 || pct <= 0}
              className="flex-1 kk-scale-hover flex items-center justify-center gap-1.5 text-[13px] font-semibold py-2 rounded-full"
              style={{ background: "#7C3AED", color: "#fff", opacity: (price <= 0 || pct <= 0) ? 0.5 : 1 }}
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Confirm sale
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
