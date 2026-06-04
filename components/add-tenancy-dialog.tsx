"use client";

import { useState, useTransition, useMemo } from "react";
import { PlanCapDialog } from "@/components/plan-cap-dialog";
import { Plus, Building2, Phone } from "lucide-react";
import { MoneyInput } from "@/components/ui/money-input";
import { DateInput } from "@/components/ui/date-input";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addTenancy } from "@/lib/actions";
import { Property } from "@/lib/types";
import { toast } from "sonner";

const todayISO = () => new Date().toISOString().split("T")[0];

export function AddTenancyDialog({ properties }: { properties: Property[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [capBlock, setCapBlock] = useState<{ nearestExpiryDays: number | null } | null>(null);

  // Property autocomplete
  const [propertyName, setPropertyName] = useState("");
  const [propertyId, setPropertyId]     = useState("");
  const [unit, setUnit]                 = useState("");
  const [ownerName, setOwnerName]       = useState("");
  const [ownerPhone, setOwnerPhone]     = useState("");
  const [amount, setAmount]             = useState("");
  const [showSugg, setShowSugg]         = useState(false);

  const suggestions = useMemo(() => {
    const q = propertyName.trim().toLowerCase();
    if (!q) return properties.slice(0, 8);
    return properties.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [propertyName, properties]);

  const hasExactMatch = properties.some(
    (p) => p.name.toLowerCase() === propertyName.trim().toLowerCase()
  );

  function selectExisting(p: Property) {
    setPropertyId(p.id);
    setPropertyName(p.name);
    setUnit(p.unit || "");
    setOwnerName(p.owner_name);
    setOwnerPhone(p.owner_phone);
    setShowSugg(false);
  }

  function reset() {
    setPropertyName(""); setPropertyId(""); setUnit("");
    setOwnerName(""); setOwnerPhone(""); setAmount(""); setShowSugg(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!propertyName.trim()) return;
    const fd = new FormData(e.currentTarget);
    fd.set("property_id", propertyId);
    fd.set("property_name", propertyName.trim());
    fd.set("property_unit", unit);
    fd.set("owner_name", ownerName);
    fd.set("owner_phone", ownerPhone);
    fd.set("amount", amount);
    startTransition(async () => {
      const res = await addTenancy(fd);
      if (!res.ok && res.reason === "plan_cap_reached") {
        setOpen(false);
        setCapBlock({ nearestExpiryDays: res.nearest_expiry_days ?? null });
      } else {
        reset();
        setOpen(false);
        toast.success("Tenancy added.");
      }
    });
  }

  return (
    <>
    <PlanCapDialog
      open={!!capBlock}
      nearestExpiryDays={capBlock?.nearestExpiryDays ?? null}
      onClose={() => setCapBlock(null)}
    />
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); setOpen(o); }}>
      <DialogTrigger
        render={
          <button
            className="kk-pill"
            style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", color: "var(--kk-ink-mute)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          >
            <Plus className="w-3.5 h-3.5" /> Add tenancy
          </button>
        }
      />
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold tracking-tight">Add new tenancy</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-6">

          {/* ──────── Property ──────── */}
          <fieldset className="space-y-3">
            <p className="kk-overline">Property</p>

            {/* Autocomplete */}
            <div
              className="relative space-y-1.5"
              onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowSugg(false); }}
            >
              <FieldLabel required>Property name</FieldLabel>
              <Input
                value={propertyName}
                onChange={(e) => { setPropertyName(e.target.value); setPropertyId(""); setShowSugg(true); }}
                onFocus={() => setShowSugg(true)}
                placeholder="e.g. Residensi Mutiara"
                autoComplete="off"
                required
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
              {propertyId
                ? <p className="text-[11px]" style={{ color: "var(--kk-green)" }}>✓ Existing property</p>
                : propertyName.trim()
                  ? <p className="text-[11px]" style={{ color: "var(--kk-blue)" }}>New property will be created</p>
                  : null
              }

              {showSugg && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden"
                  style={{ zIndex: 9999, background: "var(--kk-surface)", border: "1px solid var(--kk-line)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 240, overflowY: "auto" }}
                >
                  {suggestions.map((p) => (
                    <button
                      key={p.id} type="button" tabIndex={0}
                      onMouseDown={(e) => { e.preventDefault(); selectExisting(p); }}
                      className="w-full text-left px-4 py-2.5 transition-opacity hover:opacity-70"
                    >
                      <p className="text-[13px] font-medium" style={{ color: "var(--kk-ink)" }}>
                        {p.name}{p.unit ? ` · Unit ${p.unit}` : ""}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--kk-ink-mute)" }}>
                        {p.owner_name} · {p.owner_phone}
                      </p>
                    </button>
                  ))}
                  {propertyName.trim() && !hasExactMatch && (
                    <button
                      type="button" tabIndex={0}
                      onMouseDown={(e) => { e.preventDefault(); setPropertyId(""); setShowSugg(false); }}
                      className="w-full text-left px-4 py-2.5 text-[13px]"
                      style={{ color: "var(--kk-blue)", borderTop: suggestions.length ? "1px solid var(--kk-line)" : "none" }}
                    >
                      + Create &ldquo;{propertyName.trim()}&rdquo; as new property
                    </button>
                  )}
                </div>
              )}
            </div>

            <ControlledField label="Unit" value={unit} onChange={setUnit} placeholder="e.g. A-12 or No. 7" hint="Optional" />
          </fieldset>

          {/* ──────── Owner ──────── */}
          <fieldset className="space-y-3">
            <p className="kk-overline">Owner</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <FieldLabel icon={<Building2 className="w-3 h-3" />}>Owner name</FieldLabel>
                <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Hafiz Rahman"
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel icon={<Phone className="w-3 h-3" />}>Owner phone</FieldLabel>
                <Input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value.replace(/[^\d+\s-]/g, ""))}
                  placeholder="e.g. 60123456789"
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
              </div>
            </div>
          </fieldset>

          {/* ──────── Tenant ──────── */}
          <fieldset className="space-y-3">
            <p className="kk-overline">Tenant</p>
            <FormField label="Tenant name" name="tenant_name" placeholder="e.g. Siti Rahayu" required />
            <div className="space-y-1">
              <FormField label="WhatsApp number" name="tenant_phone" placeholder="e.g. 60123456789" required />
              <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>Include country code for WhatsApp templates.</p>
            </div>
          </fieldset>

          {/* ──────── Contract ──────── */}
          <fieldset className="space-y-3">
            <p className="kk-overline">Contract</p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Due day" name="due_day" placeholder="e.g. 1" type="number" required hint="Day of month rent is due (1–28)" />
              <div className="space-y-1">
                <FieldLabel required>Monthly rent (RM)</FieldLabel>
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
              <FormField label="Contract start" name="contract_start" type="date" required defaultValue={todayISO()} />
              <FormField label="Duration (months)" name="contract_duration_months" placeholder="e.g. 12" type="number" required />
            </div>
            <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>
              Contract dates are required for this tenancy to appear in the lifecycle board.
            </p>
          </fieldset>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="kk-pill kk-pill-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={pending || !propertyName.trim()} className="kk-pill kk-pill-primary">
              {pending ? "Saving…" : "Save tenancy"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────────

function FieldLabel({ children, required, icon }: { children: React.ReactNode; required?: boolean; icon?: React.ReactNode }) {
  return (
    <Label className="text-[12px] font-medium flex items-center gap-1" style={{ color: "var(--kk-ink-soft)" }}>
      {icon}{children}
      {required && <span style={{ color: "var(--kk-red)", lineHeight: 1 }}>*</span>}
    </Label>
  );
}

function ControlledField({ label, value, onChange, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
      {hint && <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>{hint}</p>}
    </div>
  );
}

function FormField({ label, name, placeholder, required, type = "text", hint, defaultValue }: {
  label: string; name: string; placeholder?: string; required?: boolean;
  type?: string; hint?: string; defaultValue?: string;
}) {
  return (
    <div className="space-y-1">
      <FieldLabel required={required}>{label}</FieldLabel>
      {type === "date"
        ? <DateInput value={defaultValue ?? ""} onChange={() => {}} name={name} required={required} className="h-9 w-full min-w-0 rounded-3xl border px-3 py-1 text-base outline-none md:text-sm bg-secondary border-border text-foreground" />
        : <Input id={name} name={name} type={type} placeholder={placeholder} required={required} defaultValue={defaultValue} className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
      }
      {hint && <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>{hint}</p>}
    </div>
  );
}
