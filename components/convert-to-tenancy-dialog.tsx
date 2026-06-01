"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { MoneyInput } from "@/components/ui/money-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { convertLeadToTenancy } from "@/lib/actions";
import { OwnerLead } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  lead: OwnerLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted: () => void;
}

export function ConvertToTenancyDialog({ lead, open, onOpenChange, onConverted }: Props) {
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(lead?.expected_rent != null ? String(lead.expected_rent) : "");

  useEffect(() => {
    setAmount(lead?.expected_rent != null ? String(lead.expected_rent) : "");
  }, [lead?.id, open]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!lead) return;
    const fd = new FormData(e.currentTarget);
    fd.set("amount", amount);
    const data = {
      tenant_name: fd.get("tenant_name") as string,
      tenant_phone: fd.get("tenant_phone") as string,
      due_day: parseInt(fd.get("due_day") as string, 10),
      amount: parseFloat(amount),
      contract_start: fd.get("contract_start") as string,
      contract_duration_months: parseInt(fd.get("contract_duration_months") as string, 10),
    };
    startTransition(async () => {
      const res = await convertLeadToTenancy(lead.id, data);
      if (res.ok) {
        toast.success("Tenancy created and lead marked as Matched.");
        onOpenChange(false);
        onConverted();
      } else {
        toast.error(res.message);
      }
    });
  }

  if (!lead) return null;

  const propertyLabel = lead.unit
    ? `${lead.property_name ?? "Property"}, Unit ${lead.unit}`
    : (lead.property_name ?? "Property");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold tracking-tight">
            Create tenancy for matched deal
          </DialogTitle>
        </DialogHeader>
        <p className="text-[12px] mt-1" style={{ color: "var(--kk-ink-mute)" }}>
          {propertyLabel} · Owner: {lead.owner_name}
        </p>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <Field label="Tenant name" name="tenant_name" placeholder="Full name" required />
          <Field label="Tenant phone (WhatsApp)" name="tenant_phone" placeholder="601XXXXXXXX" required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Due day (1–28)" name="due_day" placeholder="1" type="number" required />
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Monthly rent (RM)</Label>
              <MoneyInput
                value={amount}
                onChange={setAmount}
                placeholder="e.g. 1,500"
                required
                className="h-9 w-full min-w-0 rounded-3xl border px-3 py-1 text-base outline-none md:text-sm bg-secondary border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contract start" name="contract_start" type="date" required />
            <Field label="Duration (months)" name="contract_duration_months" placeholder="12" type="number" required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="kk-pill kk-pill-ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="kk-pill kk-pill-primary"
            >
              {pending ? "Creating…" : "Create tenancy"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label, name, placeholder, required, type = "text", defaultValue,
}: {
  label: string; name: string; placeholder?: string; required?: boolean; type?: string; defaultValue?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>
        {label}{required && <span style={{ color: "var(--kk-red)" }}> *</span>}
      </Label>
      {type === "date"
        ? <DateInput value={defaultValue ?? ""} onChange={() => {}} name={name} required={required} className="h-9 w-full min-w-0 rounded-3xl border px-3 py-1 text-base outline-none md:text-sm bg-secondary border-border text-foreground" />
        : <Input id={name} name={name} type={type} placeholder={placeholder} required={required} defaultValue={defaultValue} className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
      }
    </div>
  );
}
