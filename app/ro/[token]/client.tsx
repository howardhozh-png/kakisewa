"use client";

import { useState, useRef, useEffect } from "react";
import { CheckCircle, Lock } from "lucide-react";
import { Logo } from "@/components/logo";

interface Props {
  token: string;
  ownerName: string;
  propertyName: string;
  tenantName: string;
  contractEnd: string;
  currentRent: number;
  agentName: string;
  agentAgency: string;
  agentPhotoUrl?: string | null;
  alreadySubmitted?: boolean;
  prevContinuing?: boolean | null;
  prevTenantIntent?: "yes" | "no" | "unsure" | null;
  prevRent?: number | null;
  prevStart?: string | null;
  prevMonths?: number | null;
}

type Step = "extend_tenant" | "rent_out" | "rent" | "submitting" | "done" | "error";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export function OwnerRenewalClient({
  token, ownerName, propertyName, tenantName, contractEnd, currentRent,
  agentName, agentAgency, agentPhotoUrl, alreadySubmitted,
}: Props) {
  const [step, setStep] = useState<Step | null>(null);
  const [extendTenant, setExtendTenant] = useState<boolean | null>(null);
  const [rentOut, setRentOut] = useState<boolean | null>(null);
  const [newRent, setNewRent] = useState(String(currentRent));
  const [rentLocked, setRentLocked] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (alreadySubmitted) { setStep("done"); return; }
    const t = setTimeout(() => setStep("extend_tenant"), 700);
    return () => clearTimeout(t);
  }, [alreadySubmitted]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [step, extendTenant, rentOut, rentLocked]);

  const initial = agentName.charAt(0).toUpperCase();

  const formattedEnd = contractEnd
    ? new Date(contractEnd).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })
    : "";

  const todayLabel = new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });

  async function submit(opts: { extending: boolean; newTenant: boolean; rent?: number }) {
    setStep("submitting");
    const continuing = opts.extending || opts.newTenant;
    try {
      const res = await fetch("/api/intake/renewal/owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          continuing,
          tenantIntent: opts.extending ? "yes" : "no",
          newRent: opts.rent,
        }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (data.ok) setStep("done");
      else { setErrorMsg(data.message ?? "Something went wrong."); setStep("error"); }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStep("error");
    }
  }

  function handleExtendTenant(val: boolean) {
    setExtendTenant(val);
    if (val) {
      setTimeout(() => setStep("rent"), 400);
    } else {
      setTimeout(() => setStep("rent_out"), 400);
    }
  }

  function handleRentOut(val: boolean) {
    setRentOut(val);
    if (val) {
      setTimeout(() => setStep("rent"), 400);
    } else {
      submit({ extending: false, newTenant: false });
    }
  }

  function handleRentSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(newRent);
    const rent = isNaN(parsed) ? currentRent : parsed;
    setRentLocked(rent);
    setNewRent(String(rent));
    submit({ extending: extendTenant === true, newTenant: rentOut === true, rent });
  }

  function handleRestart() {
    setExtendTenant(null);
    setRentOut(null);
    setNewRent(String(currentRent));
    setRentLocked(null);
    setErrorMsg("");
    setTimeout(() => setStep("extend_tenant"), 50);
  }

  const afterDone = step === "submitting" || step === "done" || step === "error";

  return (
    <div className="flex flex-col h-dvh" style={{ background: "#F2F2F7", fontFamily: FONT }}>
      {/* Header — exact IntakeChat layout */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.08)" }}
      >
        <div className="shrink-0" style={{ color: "#1C1C1E" }}>
          <Logo variant="wordmark" size={24} />
        </div>
        <div className="w-px h-7 shrink-0" style={{ background: "rgba(0,0,0,0.10)" }} />
        {agentPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={agentPhotoUrl} alt={agentName} className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
            style={{ background: "#48484A", color: "#fff" }}
          >
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-[14px] leading-tight truncate" style={{ color: "#1C1C1E" }}>{agentName}</p>
          {agentAgency && <p className="text-[11px] leading-tight truncate" style={{ color: "#6C6C70" }}>{agentAgency}</p>}
        </div>
      </div>

      {/* Chat scroll area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">

        {/* Trust banner */}
        <div
          className="flex items-start gap-2 mx-auto max-w-xs px-4 py-2.5 rounded-xl"
          style={{ background: "rgba(0,0,0,0.05)" }}
        >
          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#6C6C70" }} />
          <p className="text-[11px] leading-relaxed" style={{ color: "#6C6C70" }}>
            This form is private and secure. Only you and your agent can see your responses. · {todayLabel}
          </p>
        </div>

        {/* Opening */}
        {step !== null && (
          <AgentBubble>
            Hi {ownerName || "there"}! The tenancy at <strong>{propertyName}</strong> with {tenantName} is expiring on {formattedEnd}.
          </AgentBubble>
        )}

        {/* Q1: Extend with same tenant? */}
        {step !== null && (
          <AgentBubble>Are you extending the contract with {tenantName}?</AgentBubble>
        )}
        {step === "extend_tenant" && (
          <div className="flex gap-2 justify-end mt-1">
            <ChoiceButton label="Yes, extend" active={false} disabled={false} onClick={() => handleExtendTenant(true)} color="var(--kk-whatsapp)" />
            <ChoiceButton label="No" active={false} disabled={false} onClick={() => handleExtendTenant(false)} color="#E53E3E" />
          </div>
        )}
        {extendTenant !== null && step !== "extend_tenant" && (
          <div className="flex gap-2 justify-end mt-1">
            <ChoiceButton label="Yes, extend" active={extendTenant === true} disabled onClick={() => {}} color="var(--kk-whatsapp)" />
            <ChoiceButton label="No" active={extendTenant === false} disabled onClick={() => {}} color="#E53E3E" />
          </div>
        )}

        {/* Q2: Continue renting to new tenant? (only if Q1 = No) */}
        {extendTenant === false && (step === "rent_out" || step === "rent" || afterDone) && (
          <AgentBubble>
            Got it. Are you planning to continue renting out {propertyName} with a new tenant?
          </AgentBubble>
        )}
        {step === "rent_out" && (
          <div className="flex gap-2 justify-end mt-1">
            <ChoiceButton label="Yes, new tenant" active={false} disabled={false} onClick={() => handleRentOut(true)} color="var(--kk-whatsapp)" />
            <ChoiceButton label="No, I'll stop" active={false} disabled={false} onClick={() => handleRentOut(false)} color="#E53E3E" />
          </div>
        )}
        {rentOut !== null && step !== "rent_out" && (
          <div className="flex gap-2 justify-end mt-1">
            <ChoiceButton label="Yes, new tenant" active={rentOut === true} disabled onClick={() => {}} color="var(--kk-whatsapp)" />
            <ChoiceButton label="No, I'll stop" active={rentOut === false} disabled onClick={() => {}} color="#E53E3E" />
          </div>
        )}

        {/* Q3: Rent amount (only if extending or new tenant) */}
        {(extendTenant === true || rentOut === true) && (step === "rent" || (rentLocked !== null && afterDone)) && (
          <AgentBubble>What will be the rent per month moving forward?</AgentBubble>
        )}
        {step === "rent" && (
          <form onSubmit={handleRentSubmit} className="flex justify-end gap-2 items-center mt-1">
            <div className="flex items-center gap-1 rounded-2xl px-3 py-2 text-[14px]" style={{ background: "#fff", color: "#111" }}>
              <span className="text-[13px]" style={{ color: "#6C6C70" }}>RM</span>
              <input
                type="number"
                value={newRent}
                onChange={(e) => setNewRent(e.target.value)}
                min={0}
                step={100}
                className="w-24 outline-none bg-transparent text-right"
                style={{ color: "#111" }}
              />
              <span className="text-[13px]" style={{ color: "#6C6C70" }}>/mo</span>
            </div>
            <button
              type="submit"
              className="rounded-full px-4 py-2 text-[13px] font-semibold text-white"
              style={{ background: "var(--kk-whatsapp)" }}
            >
              Confirm
            </button>
          </form>
        )}
        {rentLocked !== null && step !== "rent" && (
          <div className="flex justify-end mt-1">
            <div
              className="rounded-2xl rounded-tr-sm px-4 py-2 text-[14px] font-medium"
              style={{ background: "#E5E5EA", color: "#111" }}
            >
              RM {rentLocked.toLocaleString()}/mo
            </div>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <>
            <AgentBubble>
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 inline shrink-0" style={{ color: "var(--kk-whatsapp)" }} />
                {alreadySubmitted
                  ? "You've already responded — thank you! Your agent will be in touch soon."
                  : extendTenant === true
                  ? `Perfect! I'll prepare the renewal documents for ${tenantName}. I'll be in touch soon.`
                  : rentOut === true
                  ? `Noted — I'll start sourcing a new tenant${rentLocked ? ` at RM ${rentLocked.toLocaleString()}/mo` : ""}. I'll keep you updated.`
                  : `Understood — thank you for letting me know! I'll note that the property won't be rented out after the contract ends.`}
              </span>
            </AgentBubble>
            {!alreadySubmitted && (
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleRestart}
                  className="text-[12px] underline underline-offset-2"
                  style={{ color: "#888", background: "none", border: "none", cursor: "pointer" }}
                >
                  Filled in wrong details? You can fill in again.
                </button>
              </div>
            )}
          </>
        )}

        {step === "error" && (
          <>
            <AgentBubble>{errorMsg || "Something went wrong. Please try again."}</AgentBubble>
            <div className="flex justify-end mt-1">
              <button
                onClick={handleRestart}
                className="rounded-full px-4 py-2 text-[13px] font-semibold text-white"
                style={{ background: "#888" }}
              >
                Try again
              </button>
            </div>
          </>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function AgentBubble({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 text-[14px] leading-relaxed"
      style={{ background: "#fff", color: "#1C1C1E", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.06)" }}
    >
      {children}
    </div>
  );
}

function ChoiceButton({ label, active, disabled, onClick, color }: {
  label: string; active: boolean; disabled: boolean; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-full px-4 py-2 text-[13px] font-semibold transition-opacity"
      style={{
        background: disabled ? (active ? color : "rgba(0,0,0,0.06)") : color,
        color: disabled ? (active ? "#fff" : "#AEAEB2") : "#fff",
        border: "none",
        opacity: disabled && !active ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}
