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
    <div className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid var(--kk-line)" }}>
      <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span style={{ fontSize: "var(--kk-body)", color: "var(--kk-ink-mute)", flexShrink: 0 }}>RM</span>
        <input
          type="text"
          inputMode="numeric"
          value={value === 0 ? "" : value.toLocaleString("en-MY")}
          onChange={e => handleChange(e.target.value)}
          placeholder="0"
          className="bg-transparent outline-none w-full tabular-nums font-bold"
          style={{ fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)", color: "var(--kk-ink)", letterSpacing: "-0.02em" }}
        />
      </div>
      <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", marginTop: 4 }}>per deal</p>
    </div>
  );
}

function Num({
  value, min, max, onChange,
}: {
  value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  const btnStyle = {
    width: 26, height: 26, background: "var(--kk-surface-2)",
    border: "1px solid var(--kk-line)", fontSize: 14,
    color: "var(--kk-ink-mute)", fontWeight: 700, flexShrink: 0,
  } as React.CSSProperties;
  return (
    <div className="inline-flex items-center gap-1.5">
      <button onClick={() => onChange(Math.max(min, value - 1))} className="flex items-center justify-center rounded-lg select-none" style={btnStyle}>−</button>
      <span className="tabular-nums font-bold" style={{ fontSize: "var(--kk-body)", color: "var(--kk-ink)", minWidth: 22, textAlign: "center" }}>{value}</span>
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
    <div className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid var(--kk-line)" }}>
      <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
        {label} missed
      </p>
      {/* Row 1: count stepper + "deal(s) every" */}
      <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
        <Num value={count} min={1} max={99} onChange={onCount} />
        <span style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)" }}>deal{count !== 1 ? "s" : ""} every</span>
      </div>
      {/* Row 2: period stepper aligned under count stepper */}
      <div className="flex items-center gap-2">
        <Num value={period} min={1} max={99} onChange={onPeriod} />
        <span style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)" }}>{period === 1 ? "month" : "months"}</span>
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
  const [leadPeriod, setLeadPeriod] = useState(3);

  const missedIncome = renewal * (renewalCount / renewalPeriod) + lead * (leadCount / leadPeriod);
  const kakisewaCost = 500;
  const gain = missedIncome - kakisewaCost;
  const investmentGain = kakisewaCost > 0 ? Math.round((gain / kakisewaCost) * 100) : 0;

  function useTypicalNumbers() {
    setRenewal(2000); setLead(4000);
    setRenewalCount(1); setRenewalPeriod(1);
    setLeadCount(1); setLeadPeriod(1);
  }

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: "#fff", boxShadow: "0 4px 40px rgba(0,0,0,0.07)" }}>
      <div className="flex items-center gap-3 px-8 lg:px-10 py-3.5" style={{ borderBottom: "1px solid var(--kk-line)" }}>
        <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>Not sure about your numbers?</p>
        <button
          onClick={useTypicalNumbers}
          className="px-4 py-1.5 rounded-full transition-opacity hover:opacity-70"
          style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)", fontSize: "var(--kk-xs)", color: "var(--kk-ink-mute)", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
        >
          Use average Malaysian agent numbers
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3">

        {/* ── Step 1 ─────────────────────────────────────── */}
        <div className="flex flex-col p-8 lg:p-10 border-b border-[color:var(--kk-line)] lg:border-b-0 lg:border-r">
          <div style={{ minHeight: 80 }}>
            <p className="font-black mb-1" style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", color: "var(--kk-ink)", lineHeight: 1 }}>Step 1</p>
            <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.5 }}>What are your average commissions per deal?</p>
          </div>
          <div style={{ borderTop: "1px solid var(--kk-line)", paddingTop: 20, marginTop: 4, display: "flex", flexDirection: "column", gap: 12 }}>
            <CommissionInput label="Renewal commission" value={renewal} onChange={setRenewal} />
            <CommissionInput label="New lead commission" value={lead} onChange={setLead} />
          </div>
          <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", marginTop: "auto", paddingTop: 20, lineHeight: 1.65 }}>
            Renewal is typically half a month's rent. A new lead is one month's rent.
          </p>
        </div>

        {/* ── Step 2 ─────────────────────────────────────── */}
        <div className="flex flex-col p-8 lg:p-10 border-b border-[color:var(--kk-line)] lg:border-b-0 lg:border-r">
          <div style={{ minHeight: 80 }}>
            <p className="font-black mb-1" style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", color: "var(--kk-ink)", lineHeight: 1 }}>Step 2</p>
            <p style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.5 }}>How often do you miss a deal?</p>
          </div>
          <div style={{ borderTop: "1px solid var(--kk-line)", paddingTop: 14, marginTop: 4, paddingBottom: 14 }}>
            <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", lineHeight: 1.65 }}>
              On average, agents miss{" "}
              <strong style={{ color: "var(--kk-ink-soft)", fontWeight: 600 }}>2 renewals per month</strong>
              {" "}and{" "}
              <strong style={{ color: "var(--kk-ink-soft)", fontWeight: 600 }}>1 lead per month</strong>
              {", "}without realising it.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <FrequencyStepper
              label="Renewals"
              count={renewalCount} period={renewalPeriod}
              onCount={setRenewalCount} onPeriod={setRenewalPeriod}
            />
            <FrequencyStepper
              label="New leads"
              count={leadCount} period={leadPeriod}
              onCount={setLeadCount} onPeriod={setLeadPeriod}
            />
          </div>
          <div style={{ paddingTop: 20, marginTop: "auto" }}>
            <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)", marginBottom: 6 }}>
              You <span style={{ color: "#DC2626", fontWeight: 700 }}>missed</span> per month
            </p>
            <p className="tabular-nums font-black" style={{ fontSize: "clamp(2rem, 3.5vw, 2.8rem)", color: "#991B1B", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 6 }}>
              {fmtRM(missedIncome)}
            </p>
            <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>
              because you could not track your deals.
            </p>
          </div>
        </div>

        {/* ── Step 3 ─────────────────────────────────────── */}
        <div
          className="flex flex-col p-8 lg:p-10 relative overflow-hidden"
          style={{
            background: "linear-gradient(155deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(22,163,74,0.08)",
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 15% 15%, rgba(255,255,255,0.6) 0%, transparent 60%)" }} />
          <div className="relative" style={{ minHeight: 80 }}>
            <p className="font-black mb-1" style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", color: "#14532d", lineHeight: 1 }}>Step 3</p>
            <p style={{ fontSize: "var(--kk-sm)", color: "#166534", lineHeight: 1.5 }}>kakisewa captures this for you.</p>
          </div>
          <div className="relative" style={{ borderTop: "1px solid rgba(22,163,74,0.2)", paddingTop: 20, marginTop: 4 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="flex justify-between">
                <p style={{ fontSize: "var(--kk-sm)", color: "#166534" }}>Missed income captured</p>
                <p className="tabular-nums font-semibold" style={{ fontSize: "var(--kk-sm)", color: "#14532d" }}>{fmtRM(missedIncome)}</p>
              </div>
              <div className="flex justify-between">
                <p style={{ fontSize: "var(--kk-sm)", color: "#166534" }}>kakisewa monthly cost</p>
                <p className="tabular-nums font-semibold" style={{ fontSize: "var(--kk-sm)", color: "#166534" }}>
                  <span style={{ opacity: 0.6 }}>−</span> RM 500
                </p>
              </div>
            </div>
          </div>
          <div style={{ paddingTop: 20, marginTop: "auto" }}>
            <p style={{ fontSize: "var(--kk-xs)", color: "#166534", marginBottom: 6 }}>
              You <span style={{ color: "#16a34a", fontWeight: 700 }}>retrieve</span> per month
            </p>
            <p className="tabular-nums font-black" style={{ fontSize: "clamp(2rem, 3.5vw, 2.8rem)", color: "#14532d", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 16 }}>
              {fmtRM(gain)}
            </p>
            <div className="flex justify-between items-start" style={{ borderTop: "1px solid rgba(22,163,74,0.2)", paddingTop: 10 }}>
              <div>
                <p style={{ fontSize: "var(--kk-xs)", color: "#166534", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                  Investment gain
                </p>
                <p style={{ fontSize: "var(--kk-xs)", color: "#166534", opacity: 0.7, marginTop: 3 }}>
                  Invest RM 500 for {fmtRM(gain)}/month
                </p>
              </div>
              <p className="tabular-nums font-black" style={{ fontSize: "clamp(1.4rem, 2vw, 1.8rem)", color: "#14532d", letterSpacing: "-0.02em" }}>
                {investmentGain.toLocaleString("en-MY")}%
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
