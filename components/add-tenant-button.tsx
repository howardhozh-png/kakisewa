"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, ChevronDown, MessageCircle, PenLine } from "lucide-react";
import { MoneyInput } from "@/components/ui/money-input";
import { DateInput } from "@/components/ui/date-input";
import { addTenantProfileAction, generateTenantIntakeLink } from "@/lib/actions";
import { toast } from "sonner";
import { normalizePhone, phoneError } from "@/lib/phone";

interface FormData {
  name: string;
  phone: string;
  occupation: string;
  monthly_income: string;
  budget_max: string;
  bedrooms_pref: string;
  preferred_move_in: string;
  notes: string;
}

const EMPTY_FORM: FormData = {
  name: "",
  phone: "",
  occupation: "",
  monthly_income: "",
  budget_max: "",
  bedrooms_pref: "",
  preferred_move_in: "",
  notes: "",
};

export function AddTenantButton() {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [pending, startTransition] = useTransition();
  const [phoneErr, setPhoneErr] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  useEffect(() => {
    if (!dialogOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !pending) setDialogOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [dialogOpen, pending]);

  function handleViaWhatsApp() {
    setDropdownOpen(false);
    startTransition(async () => {
      const res = await generateTenantIntakeLink();
      if (!res.ok) { toast.error(res.message); return; }
      try { await navigator.clipboard.writeText(res.url); } catch { /* ignore */ }
      window.open(res.waUrl, "_blank", "noopener,noreferrer");
      toast.success("Intake link copied. Send via WhatsApp.");
      router.refresh();
    });
  }

  function openManualDialog() {
    setDropdownOpen(false);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function handlePhoneBlur() {
    const normalized = normalizePhone(form.phone);
    if (form.phone) setForm((f) => ({ ...f, phone: normalized }));
    setPhoneErr(phoneError(normalized));
  }

  function handleSave() {
    if (!form.name.trim()) { toast.error("Full name is required"); return; }
    const pErr = phoneError(normalizePhone(form.phone));
    if (pErr) { setPhoneErr(pErr); toast.error(pErr); return; }

    startTransition(async () => {
      const res = await addTenantProfileAction({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        occupation: form.occupation.trim() || null,
        monthly_income: form.monthly_income ? parseFloat(form.monthly_income) : null,
        budget_max: form.budget_max ? parseFloat(form.budget_max) : null,
        bedrooms_pref: form.bedrooms_pref ? parseInt(form.bedrooms_pref, 10) : null,
        preferred_move_in: form.preferred_move_in || null,
        notes: form.notes.trim() || null,
      });

      if (!res.ok) {
        toast.error(res.message ?? "Could not add tenant");
        return;
      }

      toast.success("Tenant profile added");
      setDialogOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          id="tour-add-tenant"
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          disabled={pending}
          className="kk-pill kk-pill-white flex items-center gap-2 px-4 py-2"
          style={{ fontSize: "13px", fontWeight: 500, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.12)", border: "1px solid rgba(0,0,0,0.08)" }}
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Add new tenant
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 top-full mt-1 z-20 rounded-xl overflow-hidden"
            style={{
              background: "var(--kk-surface)",
              border: "1px solid var(--kk-line)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              minWidth: 200,
            }}
          >
            <button
              className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] font-medium hover:opacity-80 transition-opacity"
              style={{ color: "var(--kk-ink)" }}
              onClick={handleViaWhatsApp}
            >
              <MessageCircle className="w-4 h-4 shrink-0" style={{ color: "var(--kk-green)" }} />
              Via WhatsApp
            </button>
            <div style={{ height: 1, background: "var(--kk-line)" }} />
            <button
              className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] font-medium hover:opacity-80 transition-opacity"
              style={{ color: "var(--kk-ink)" }}
              onClick={openManualDialog}
            >
              <PenLine className="w-4 h-4 shrink-0" style={{ color: "var(--kk-ink-mute)" }} />
              Add manually
            </button>
          </div>
        )}
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        >
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />
          <div
            className="relative z-10 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 overflow-y-auto max-h-[90dvh]"
            style={{ background: "var(--kk-surface)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="serif text-[20px] tracking-tight" style={{ color: "var(--kk-ink)" }}>
                Add tenant profile
              </h2>
              <button
                onClick={() => setDialogOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm hover:opacity-70 transition-opacity"
                style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-soft)" }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-mute)" }}>
                    Full name <span style={{ color: "var(--kk-red)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Ahmad Firdaus"
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-mute)" }}>
                    Phone number
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => { setForm((f) => ({ ...f, phone: e.target.value })); setPhoneErr(null); }}
                    onBlur={handlePhoneBlur}
                    placeholder="e.g. 601XXXXXXXX"
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{ background: "var(--kk-surface-2)", border: phoneErr ? "1px solid var(--kk-red)" : "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                  />
                  {phoneErr ? (
                    <p className="text-[11px] mt-1" style={{ color: "var(--kk-red)" }}>{phoneErr}</p>
                  ) : (
                    <p className="text-[11px] mt-1" style={{ color: "var(--kk-ink-faint)" }}>For overseas numbers, include the country code, e.g. +44 7911 123456</p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-mute)" }}>
                    Occupation
                  </label>
                  <input
                    type="text"
                    value={form.occupation}
                    onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))}
                    placeholder="e.g. Software engineer"
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-mute)" }}>
                    Monthly income (RM)
                  </label>
                  <MoneyInput
                    value={form.monthly_income}
                    onChange={(raw) => setForm((f) => ({ ...f, monthly_income: raw }))}
                    placeholder="e.g. 8,000"
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-mute)" }}>
                    Budget max (RM/mo)
                  </label>
                  <MoneyInput
                    value={form.budget_max}
                    onChange={(raw) => setForm((f) => ({ ...f, budget_max: raw }))}
                    placeholder="e.g. 2,500"
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-mute)" }}>
                    Preferred bedrooms
                  </label>
                  <input
                    type="number"
                    value={form.bedrooms_pref}
                    onChange={(e) => setForm((f) => ({ ...f, bedrooms_pref: e.target.value }))}
                    placeholder="e.g. 2"
                    min={0}
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-mute)" }}>
                    Preferred move-in date
                  </label>
                  <DateInput
                    value={form.preferred_move_in}
                    onChange={(v) => setForm((f) => ({ ...f, preferred_move_in: v }))}
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kk-ink-mute)" }}>
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Any other preferences or details…"
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none resize-none"
                    style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  disabled={pending}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-opacity hover:opacity-70"
                  style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={pending}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2"
                  style={{ background: "var(--kk-ink)", color: "#fff" }}
                >
                  {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
