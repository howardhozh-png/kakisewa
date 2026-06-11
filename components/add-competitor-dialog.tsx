"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DateInput } from "@/components/ui/date-input";
import { addOwnerLeadAction, markCompetitorRentedAction } from "@/lib/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCompetitorDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    property_name: "", unit: "", owner_name: "", owner_phone: "",
    expected_rent: "", bedrooms: "", bathrooms: "",
    rented_on: new Date().toISOString().slice(0, 10),
    duration: "12",
  });

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const contractEnd = (() => {
    if (!form.rented_on || !form.duration) return "";
    const [y, m, day] = form.rented_on.split("-").map(Number);
    const months = parseInt(form.duration, 10);
    if (!months) return "";
    const end = new Date(y, m - 1 + months, day);
    return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  })();

  function handleSubmit() {
    if (!form.property_name.trim()) { toast.error("Property name required"); return; }
    if (!form.rented_on || !form.duration) { toast.error("Rented on + duration required"); return; }
    startTransition(async () => {
      const res = await addOwnerLeadAction({
        owner_name: form.owner_name || "Unknown",
        owner_phone: form.owner_phone || "0",
        property_name: form.property_name.trim(),
        unit: form.unit || null,
        expected_rent: form.expected_rent ? parseFloat(form.expected_rent) : null,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms, 10) : null,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms, 10) : null,
        stage: "imported",
      });
      if (!res.ok || !res.id) { toast.error("Could not save"); return; }
      await markCompetitorRentedAction(res.id, form.rented_on, parseInt(form.duration, 10));
      toast.success("Target unit added");
      onOpenChange(false);
      setForm({ property_name: "", unit: "", owner_name: "", owner_phone: "", expected_rent: "", bedrooms: "", bathrooms: "", rented_on: new Date().toISOString().slice(0, 10), duration: "12" });
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
            <p className="kk-overline mb-1">Add target unit</p>
            <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>
              Track a competitor unit. We'll remind you 60 days before their tenancy ends.
            </p>
          </div>

          {/* Property */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Property name *</label>
            <input value={form.property_name} onChange={e => set("property_name", e.target.value)} placeholder="e.g. Residensi Mutiara" className={field} style={fs} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Unit</label>
            <input value={form.unit} onChange={e => set("unit", e.target.value)} placeholder="e.g. A-12" className={field} style={fs} />
          </div>

          {/* Owner */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Owner name</label>
              <input value={form.owner_name} onChange={e => set("owner_name", e.target.value)} placeholder="Optional" className={field} style={fs} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Owner phone</label>
              <input value={form.owner_phone} onChange={e => set("owner_phone", e.target.value)} placeholder="601x…" className={field} style={fs} />
            </div>
          </div>

          {/* Property details */}
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

          {/* Competitor tenancy dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Rented on *</label>
              <DateInput value={form.rented_on} onChange={iso => set("rented_on", iso)} className={field} style={fs} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink-soft)" }}>Duration (months) *</label>
              <input type="number" value={form.duration} min="1" max="36" onChange={e => set("duration", e.target.value)} className={field} style={fs} />
            </div>
          </div>

          {contractEnd && (
            <p className="text-[12px] px-3 py-2 rounded-xl" style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}>
              Ends <span className="font-semibold" style={{ color: "var(--kk-ink)" }}>
                {new Date(contractEnd).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
              </span> — you'll be reminded 60 days before.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => onOpenChange(false)} className="kk-pill kk-pill-ghost flex-1">Cancel</button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending || !form.property_name.trim() || !form.rented_on || !form.duration}
              className="kk-pill flex-1 font-semibold"
              style={{ background: "var(--kk-ink)", color: "#fff", opacity: pending || !form.property_name.trim() ? 0.5 : 1 }}
            >
              {pending ? "Adding…" : "Add target"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
