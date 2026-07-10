"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveProfileDetails } from "@/lib/actions";

interface Props {
  needsSetup: boolean;
  agentName?: string | null;
}

export function ProfileSetupDialog({ needsSetup, agentName }: Props) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [ren, setRen] = useState("");
  const [renStatus, setRenStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [renHint, setRenHint] = useState<string | null>(null);
  const [renLppehName, setRenLppehName] = useState<string | null>(null);
  const [renConfirmed, setRenConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!needsSetup) return null;

  const firstName = agentName?.split(" ")[0] ?? "there";

  async function validateRen(value: string) {
    const numeric = value.replace(/^(REN|PEA|REA)\s*/i, "").trim();
    if (!numeric || !/^\d+$/.test(numeric)) {
      setRenStatus("invalid");
      setRenHint("Format: REN, PEA, or REA followed by numbers, e.g. REN07128");
      setRenLppehName(null);
      setRenConfirmed(false);
      return;
    }
    setRenStatus("checking");
    setRenHint(null);
    setRenLppehName(null);
    setRenConfirmed(false);
    try {
      const res = await fetch(`/api/validate-ren?ren=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (data.valid) {
        setRenStatus("valid");
        const parts = [data.name, data.firm].filter(Boolean);
        const display = parts.length ? parts.join(" · ") : null;
        setRenLppehName(display);
        setRenHint(display ?? "Verified");
      } else {
        setRenStatus("invalid");
        setRenHint("REN not found in LPPEH registry");
      }
    } catch {
      setRenStatus("idle");
      setRenHint(null);
    }
  }

  async function handleSave() {
    setError(null);
    if (!phone.trim()) { setError("Phone number is required."); return; }
    if (!ren.trim()) { setError("REN number is required."); return; }
    if (renStatus === "invalid") { setError("Please enter a valid REN number."); return; }
    if (renStatus === "valid" && renLppehName && !renConfirmed) { setError("Please confirm this is your LPPEH registration."); return; }
    setLoading(true);
    try {
      await saveProfileDetails({ phone: phone.trim(), ren_number: ren.trim().toUpperCase() });
      router.refresh();
    } catch {
      setError("Failed to save. Please try again.");
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded-xl px-3.5 py-2.5 outline-none transition-all text-sm";
  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--kk-line-strong)",
    background: "var(--kk-bg)",
    color: "var(--kk-ink)",
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = "var(--kk-green)"; };
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = "var(--kk-line-strong)"; };

  return (
    <div
      className="fixed inset-0 z-[10003] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5" style={{ borderBottom: "1px solid var(--kk-line)" }}>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--kk-ink-faint)" }}>
            Almost there
          </p>
          <p className="text-[20px] font-bold leading-snug" style={{ color: "var(--kk-ink)" }}>
            Hi {firstName}, complete your profile
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
            These details are required for WhatsApp outreach and LPPEH compliance.
          </p>
        </div>

        {/* Form */}
        <div className="px-7 py-5 flex flex-col gap-4">

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink)" }}>
              Phone number <span style={{ color: "var(--kk-red)" }}>*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/[^\d+\s-]/g, ""))}
              placeholder="601xxxxxxxx"
              className={inputCls}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          {/* REN */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium" style={{ color: "var(--kk-ink)" }}>
              REN number <span style={{ color: "var(--kk-red)" }}>*</span>
            </label>
            <input
              type="text"
              value={ren}
              onChange={e => { setRen(e.target.value); setRenStatus("idle"); setRenHint(null); }}
              onBlur={e => { onBlur(e); if (e.target.value.trim()) validateRen(e.target.value.trim()); }}
              placeholder="REN/PEA/REA xxxxx"
              className={inputCls}
              style={{
                ...inputStyle,
                borderColor: renStatus === "valid" ? "var(--kk-green)" : renStatus === "invalid" ? "var(--kk-red)" : undefined,
              }}
              onFocus={onFocus}
            />
            {renStatus === "checking" && (
              <p className="text-[11px]" style={{ color: "var(--kk-ink-faint)" }}>Checking LPPEH registry…</p>
            )}
            {renHint && renStatus === "valid" && (
              <p className="text-[11px] font-medium" style={{ color: "var(--kk-green)" }}>✓ {renHint}</p>
            )}
            {renStatus === "valid" && renLppehName && (
              <label className="flex items-start gap-2 cursor-pointer mt-0.5">
                <input
                  type="checkbox"
                  checked={renConfirmed}
                  onChange={e => setRenConfirmed(e.target.checked)}
                  className="mt-0.5 shrink-0"
                  style={{ accentColor: "var(--kk-green)", width: 14, height: 14 }}
                />
                <span className="text-[11px] leading-snug" style={{ color: "var(--kk-ink-mute)" }}>
                  Yes, this is my LPPEH registration
                </span>
              </label>
            )}
            {renHint && renStatus === "invalid" && (
              <p className="text-[11px]" style={{ color: "var(--kk-red)" }}>{renHint}</p>
            )}
          </div>

          {error && (
            <p className="rounded-xl px-3.5 py-2.5 text-[13px]" style={{ color: "var(--kk-red)", background: "var(--kk-red-bg)", border: "1px solid var(--kk-red-border)" }}>
              {error}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full rounded-xl py-2.5 font-semibold text-[14px] transition-opacity mt-1"
            style={{ background: "var(--kk-ink)", color: "#fff", opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Saving…" : "Save and continue →"}
          </button>

          <p className="text-[11px] text-center" style={{ color: "var(--kk-ink-faint)" }}>
            You can update these anytime in Account Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
