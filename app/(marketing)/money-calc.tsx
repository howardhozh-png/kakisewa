"use client";

import { useState } from "react";

function fmtRM(n: number) {
  return "RM " + Math.max(0, Math.round(n)).toLocaleString("en-MY");
}

function CommissionInput({
  label, value, onChange,
}: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  function handleChange(raw: string) {
    const n = parseInt(raw.replace(/,/g, ""), 10);
    if (!isNaN(n)) onChange(Math.max(0, n));
    else if (raw === "" || raw === "RM ") onChange(0);
  }

  return (
    <div className="rounded-xl p-3" style={{ background: "#fff", border: "1px solid var(--kk-line)" }}>
      <p style={{ fontSize: 10, color: "var(--kk-ink-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </p>
      <div className="flex items-baseline gap-1">
        <span style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", flexShrink: 0 }}>RM</span>
        <input
          type="text"
          inputMode="numeric"
          value={value === 0 ? "" : value.toLocaleString("en-MY")}
          onChange={e => handleChange(e.target.value)}
          placeholder="0"
          className="bg-transparent outline-none w-full tabular-nums font-bold"
          style={{ fontSize: "clamp(1.1rem, 1.8vw, 1.4rem)", color: "var(--kk-ink)", letterSpacing: "-0.02em" }}
        />
      </div>
    </div>
  );
}

function Num({
  value, min, max, onChange,
}: {
  value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  const btnStyle = {
    width: 22, height: 22, background: "var(--kk-surface-2)",
    border: "1px solid var(--kk-line)", fontSize: 13,
    color: "var(--kk-ink-mute)", fontWeight: 700, flexShrink: 0,
  } as React.CSSProperties;
  return (
    <div className="inline-flex items-center gap-1">
      <button onClick={() => onChange(Math.max(min, value - 1))} className="flex items-center justify-center rounded-lg select-none" style={btnStyle}>−</button>
      <span className="tabular-nums font-bold" style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink)", minWidth: 18, textAlign: "center" }}>{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} className="flex items-center justify-center rounded-lg select-none" style={btnStyle}>+</button>
    </div>
  );
}

function FrequencyStepper({
  label, count, period, onCount, onPeriod,
}: {
  label: string; count: number; period: number;
  onCount: (v: number) => void; onPeriod: (v: number) => void;
}) {
  return (
    <div className="rounded-xl p-3" style={{ background: "#fff", border: "1px solid var(--kk-line)" }}>
      <p style={{ fontSize: 10, color: "var(--kk-ink-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
        {label} missed
      </p>
      <div className="flex items-center gap-2" style={{ marginBottom: 5 }}>
        <Num value={count} min={1} max={99} onChange={onCount} />
        <span style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-mute)" }}>deal{count !== 1 ? "s" : ""} every</span>
      </div>
      <div className="flex items-center gap-2">
        <Num value={period} min={1} max={99} onChange={onPeriod} />
        <span style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-mute)" }}>{period === 1 ? "month" : "months"}</span>
      </div>
    </div>
  );
}

export function MoneyCalc() {
  const [renewal, setRenewal] = useState(2000);
  const [lead, setLead] = useState(4000);
  const [renewalCount, setRenewalCount] = useState(1);
  const [renewalPeriod, setRenewalPeriod] = useState(1);
  const [leadCount, setLeadCount] = useState(1);
  const [leadPeriod, setLeadPeriod] = useState(1);

  const missedIncome = renewal * (renewalCount / renewalPeriod) + lead * (leadCount / leadPeriod);
  const kakisewaCost = 500;
  const gain = missedIncome - kakisewaCost;
  const investmentGain = kakisewaCost > 0 ? Math.round((gain / kakisewaCost) * 100) : 0;

  function useTypicalNumbers() {
    setRenewal(2000); setLead(4000);
    setRenewalCount(1); setRenewalPeriod(1);
    setLeadCount(1); setLeadPeriod(1);
  }

  const stepLabelClass = "hidden lg:flex lg:flex-col lg:justify-center";
  const stepLabelStyle = { width: 128, flexShrink: 0 } as React.CSSProperties;
  const mobileLabel = "lg:hidden text-[11px] font-semibold mb-2";

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: "#fff", boxShadow: "0 4px 40px rgba(0,0,0,0.07)" }}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 px-5 lg:px-8 py-3" style={{ borderBottom: "1px solid var(--kk-line)" }}>
        <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>Not sure about your numbers?</p>
        <button
          onClick={useTypicalNumbers}
          className="px-3 py-1 rounded-full transition-opacity hover:opacity-70"
          style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", fontSize: "var(--kk-xs)", color: "var(--kk-ink-mute)", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
        >
          Use average Malaysian agent numbers
        </button>
      </div>

      {/* ── Step 1 ─────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-3 px-5 py-4 lg:px-8 lg:py-5 border-b border-[color:var(--kk-line)]">
        <div className={stepLabelClass} style={stepLabelStyle}>
          <p className="font-black" style={{ fontSize: "1.2rem", color: "var(--kk-ink)", lineHeight: 1 }}>Step 1</p>
          <p style={{ fontSize: 11, color: "var(--kk-ink-mute)", marginTop: 4, lineHeight: 1.4 }}>Average commissions per deal</p>
        </div>
        <div className="flex-1">
          <p className={mobileLabel} style={{ color: "var(--kk-ink-mute)" }}>Step 1 · Average commissions per deal</p>
          <div className="grid grid-cols-2 gap-2">
            <CommissionInput label="Renewal commission" value={renewal} onChange={setRenewal} />
            <CommissionInput label="New lead commission" value={lead} onChange={setLead} />
          </div>
        </div>
      </div>

      {/* ── Step 2 ─────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-3 px-5 py-4 lg:px-8 lg:py-5 border-b border-[color:var(--kk-line)]">
        <div className={stepLabelClass} style={stepLabelStyle}>
          <p className="font-black" style={{ fontSize: "1.2rem", color: "var(--kk-ink)", lineHeight: 1 }}>Step 2</p>
          <p style={{ fontSize: 11, color: "var(--kk-ink-mute)", marginTop: 4, lineHeight: 1.4 }}>How often do you miss a deal?</p>
        </div>
        <div className="flex-1">
          <p className={mobileLabel} style={{ color: "var(--kk-ink-mute)" }}>Step 2 · How often do you miss a deal?</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <FrequencyStepper label="Renewals" count={renewalCount} period={renewalPeriod} onCount={setRenewalCount} onPeriod={setRenewalPeriod} />
            <FrequencyStepper label="New leads" count={leadCount} period={leadPeriod} onCount={setLeadCount} onPeriod={setLeadPeriod} />
          </div>
          <div className="flex items-center justify-between">
            <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>
              You <span style={{ color: "#DC2626", fontWeight: 700 }}>missed</span> per month
            </p>
            <p className="tabular-nums font-black" style={{ fontSize: "clamp(1.2rem, 2vw, 1.6rem)", color: "#991B1B", letterSpacing: "-0.03em", lineHeight: 1 }}>
              {fmtRM(missedIncome)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Step 3 ─────────────────────────────────────── */}
      <div
        className="flex flex-col lg:flex-row gap-3 px-5 py-4 lg:px-8 lg:py-5 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 60%, #bbf7d0 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 10% 20%, rgba(255,255,255,0.5) 0%, transparent 55%)" }} />
        <div className={`${stepLabelClass} relative`} style={stepLabelStyle}>
          <p className="font-black" style={{ fontSize: "1.2rem", color: "#14532d", lineHeight: 1 }}>Step 3</p>
          <p style={{ fontSize: 11, color: "#166534", marginTop: 4, lineHeight: 1.4 }}>kakisewa captures this for you.</p>
        </div>
        <div className="relative flex-1">
          <p className={`${mobileLabel}`} style={{ color: "#166534" }}>Step 3 · kakisewa captures this for you</p>
          <div className="flex flex-col gap-1.5 mb-3">
            <div className="flex justify-between items-center">
              <p style={{ fontSize: "var(--kk-xs)", color: "#166534" }}>Missed income captured</p>
              <p className="tabular-nums font-semibold" style={{ fontSize: "var(--kk-xs)", color: "#14532d" }}>{fmtRM(missedIncome)}</p>
            </div>
            <div className="flex justify-between items-center">
              <p style={{ fontSize: "var(--kk-xs)", color: "#166534" }}>kakisewa monthly cost</p>
              <p className="tabular-nums font-semibold" style={{ fontSize: "var(--kk-xs)", color: "#166534" }}>− RM 500</p>
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <p style={{ fontSize: "var(--kk-xs)", color: "#166534" }}>
              You <span style={{ color: "#16a34a", fontWeight: 700 }}>retrieve</span> per month
            </p>
            <p className="tabular-nums font-black" style={{ fontSize: "clamp(1.2rem, 2vw, 1.6rem)", color: "#14532d", letterSpacing: "-0.03em", lineHeight: 1 }}>
              {fmtRM(gain)}
            </p>
          </div>
          <div className="flex justify-between items-center pt-2" style={{ borderTop: "1px solid rgba(22,163,74,0.2)" }}>
            <p style={{ fontSize: 10, color: "#166534", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Investment gain</p>
            <p className="tabular-nums font-black" style={{ fontSize: "1.1rem", color: "#14532d", letterSpacing: "-0.02em" }}>
              {investmentGain.toLocaleString("en-MY")}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
