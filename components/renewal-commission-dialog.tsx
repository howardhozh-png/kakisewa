"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tenancy } from "@/lib/types";
import { collectRenewalCommission } from "@/lib/actions";
import { CheckCircle, Loader2, X } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { toast } from "sonner";

interface Props {
  t: Tenancy;
  open: boolean;
  onClose: () => void;
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function addYears(iso: string, years: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y + years}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function RenewalCommissionDialog({ t, open, onClose }: Props) {
  const [pending, startTransition] = useTransition();

  const defaultRent  = t.renewal_proposed_rent  ?? t.amount;
  const defaultStart = t.renewal_proposed_start  ?? t.contract_end ?? "";
  const defaultEnd   = (() => {
    if (defaultStart && t.renewal_proposed_months) return addMonths(defaultStart, t.renewal_proposed_months);
    if (t.contract_end) return addYears(t.contract_end, 1);
    return "";
  })();

  const [rentVal, setRentVal]   = useState(String(defaultRent));
  const [newStart, setNewStart] = useState(defaultStart);
  const [newEnd, setNewEnd]     = useState(defaultEnd);

  const effectiveRent = parseFloat(rentVal) || defaultRent;

  function confirm() {
    if (!newEnd) return;
    startTransition(async () => {
      const res = await collectRenewalCommission(t.id, {
        newContractEnd:   newEnd,
        newContractStart: newStart || null,
        newRent:          parseFloat(rentVal) || null,
      });
      if (res.ok) {
        toast.success("Commission recorded. Tenancy restarted as Active.");
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
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--kk-green-soft)", color: "#1F8B4C" }}>
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[15px] font-semibold" style={{ color: "var(--kk-ink)" }}>Commission Received</p>
                <p className="text-[12px]" style={{ color: "var(--kk-ink-faint)" }}>{t.tenant_name} · {t.property_name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70" style={{ color: "var(--kk-ink-faint)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Commission summary */}
          <div className="rounded-xl p-4" style={{ background: "var(--kk-green-soft)" }}>
            <p className="text-[12px] font-medium" style={{ color: "#1F8B4C" }}>Renewal commission earned</p>
            <p className="text-[22px] font-bold tabular-nums mt-1" style={{ color: "#1F8B4C" }}>
              RM {Math.round(effectiveRent * 0.5).toLocaleString()}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "#1F8B4C", opacity: 0.75 }}>50% of RM {effectiveRent.toLocaleString()}/mo rent</p>
          </div>

          {/* New contract fields */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium" style={{ color: "var(--kk-ink-mute)" }}>Monthly rent (RM)</label>
              <input
                type="number"
                value={rentVal}
                onChange={(e) => setRentVal(e.target.value)}
                step={100}
                min={0}
                className="kk-input"
                style={{ fontSize: 14 }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium" style={{ color: "var(--kk-ink-mute)" }}>New contract start</label>
              <DateInput
                value={newStart}
                onChange={setNewStart}
                className="kk-input"
                style={{ fontSize: 14 }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium" style={{ color: "var(--kk-ink-mute)" }}>New contract end</label>
              <DateInput
                value={newEnd}
                onChange={setNewEnd}
                className="kk-input"
                style={{ fontSize: 14 }}
              />
              {t.renewal_proposed_months && (
                <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
                  Owner proposed {t.renewal_proposed_months / 12} yr
                </p>
              )}
            </div>
          </div>

          {/* Destination hint */}
          <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
            This card will move to{" "}
            <span className="font-semibold" style={{ color: "var(--kk-ink-mute)" }}>Active</span>
            {" "}and the contract details above will be saved.
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 kk-pill kk-pill-ghost text-[13px] py-2" disabled={pending}>
              Cancel
            </button>
            <button
              onClick={confirm}
              disabled={pending || !newEnd}
              className="flex-1 kk-scale-hover flex items-center justify-center gap-1.5 text-[13px] font-semibold py-2 rounded-full"
              style={{ background: "#1F8B4C", color: "#fff", opacity: !newEnd ? 0.5 : 1 }}
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Confirm & restart
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
