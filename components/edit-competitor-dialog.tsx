"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { updateCompetitorLeadAction } from "@/lib/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { OwnerLead } from "@/lib/types";

interface Props {
  lead: OwnerLead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCompetitorDialog({ lead, open, onOpenChange }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const initialContractEnd = lead.competitor_contract_end ?? "";
  const [form, setForm] = useState({
    property_name: lead.property_name ?? "",
    unit: lead.unit ?? "",
    owner_name: lead.owner_name ?? "",
    owner_phone: lead.owner_phone ?? "",
    expected_rent: lead.expected_rent != null ? String(lead.expected_rent) : "",
    bedrooms: lead.bedrooms != null ? String(lead.bedrooms) : "",
    bathrooms: lead.bathrooms != null ? String(lead.bathrooms) : "",
    competitor_contract_end: initialContractEnd,
  });

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    if (!form.property_name.trim()) { toast.error("Property name required"); return; }
    startTransition(async () => {
      const res = await updateCompetitorLeadAction(lead.id, {
        property_name: form.property_name.trim(),
        unit: form.unit || undefined,
        owner_name: form.owner_name || undefined,
        owner_phone: form.owner_phone || undefined,
        expected_rent: form.expected_rent ? parseFloat(form.expected_rent) : null,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms, 10) : null,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms, 10) : null,
        competitor_contract_end: form.competitor_contract_end || null,
      });
      if (!res.ok) { toast.error("Could not save"); return; }
      toast.success("Updated");
      onOpenChange(false);
      router.refresh();
    });
  }

  const field = "w-full text-[14px] px-3 py-2 rounded-xl outline-none";
  const fs = { background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="bg-card border-border max-w-sm p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="overflow-y-auto p-6 space-y-4">
          <div>
            <p className="kk-overline mb-1">Edit target unit</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Property name *</label>
            <input value={form.property_name} onChange={e => set("property_name", e.target.value)} className={field} style={fs} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Unit</label>
            <input value={form.unit} onChange={e => set("unit", e.target.value)} placeholder="e.g. A-12" className={field} style={fs} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Owner name</label>
              <input value={form.owner_name} onChange={e => set("owner_name", e.target.value)} className={field} style={fs} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Owner phone</label>
              <input value={form.owner_phone} onChange={e => set("owner_phone", e.target.value)} placeholder="601x..." className={field} style={fs} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Rent (RM)</label>
              <input type="number" value={form.expected_rent} onChange={e => set("expected_rent", e.target.value)} placeholder="1800" className={field} style={fs} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Beds</label>
              <input type="number" value={form.bedrooms} onChange={e => set("bedrooms", e.target.value)} placeholder="3" className={field} style={fs} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Baths</label>
              <input type="number" value={form.bathrooms} onChange={e => set("bathrooms", e.target.value)} placeholder="2" className={field} style={fs} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Contract end date</label>
            <input type="date" value={form.competitor_contract_end} onChange={e => set("competitor_contract_end", e.target.value)} className={field} style={fs} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => onOpenChange(false)} className="kk-pill kk-pill-ghost flex-1">Cancel</button>
            <button
              type="button"
              onClick={handleSave}
              disabled={pending || !form.property_name.trim()}
              className="kk-pill flex-1 font-semibold"
              style={{ background: "var(--kk-ink)", color: "#fff", opacity: pending || !form.property_name.trim() ? 0.5 : 1 }}
            >
              {pending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
