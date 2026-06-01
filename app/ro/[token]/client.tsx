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

type Step = "choice" | "tenant_intent" | "rent" | "contract_date" | "duration" | "submitting" | "done" | "error";
type TenantIntent = "yes" | "no" | "unsure";

const STEP_ORDER: Step[] = ["choice", "tenant_intent", "rent", "contract_date", "duration", "submitting", "done", "error"];

export function OwnerRenewalClient({ token, ownerName, propertyName, tenantName, contractEnd, currentRent, agentName, agentAgency, agentPhotoUrl, alreadySubmitted, prevContinuing, prevTenantIntent, prevRent, prevStart, prevMonths }: Props) {
  const [step, setStep] = useState<Step | null>(null);
  const [continuing, setContinuing] = useState<boolean | null>(alreadySubmitted ? (prevContinuing ?? null) : null);
  const [tenantIntent, setTenantIntent] = useState<TenantIntent | null>(alreadySubmitted ? (prevTenantIntent ?? null) : null);
  const [newRent, setNewRent] = useState(alreadySubmitted && prevRent ? String(prevRent) : String(currentRent));
  const [renewalStart, setRenewalStart] = useState(alreadySubmitted && prevStart ? prevStart : contractEnd ?? "");
  const [durationYears, setDurationYears] = useState<number | null>(alreadySubmitted && prevMonths ? prevMonths / 12 : null);
  const [errorMsg, setErrorMsg] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (alreadySubmitted) { setStep("done"); return; }
    const t = setTimeout(() => setStep("choice"), 700);
    return () => clearTimeout(t);
  }, [alreadySubmitted]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [step, continuing, tenantIntent, durationYears]);

  const initial = agentName.charAt(0).toUpperCase();

  // true if the given step has been reached (inclusive)
  const pastStep = (s: Step) =>
    step !== null && STEP_ORDER.indexOf(step) >= STEP_ORDER.indexOf(s);

  async function submitAll(years: number) {
    setStep("submitting");
    const parsedRent = parseFloat(newRent);
    try {
      const res = await fetch("/api/intake/renewal/owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          continuing: continuing!,
          newRent: isNaN(parsedRent) ? undefined : parsedRent,
          newContractStart: renewalStart || undefined,
          durationYears: years,
          tenantIntent: tenantIntent ?? "unsure",
        }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (data.ok) { setStep("done"); }
      else { setErrorMsg(data.message ?? "Something went wrong."); setStep("error"); }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStep("error");
    }
  }

  function handleChoice(choice: boolean) {
    setContinuing(choice);
    setTimeout(() => setStep("tenant_intent"), 400);
  }

  function handleTenantIntent(intent: TenantIntent) {
    setTenantIntent(intent);
    setTimeout(() => setStep("rent"), 400);
  }

  function handleRentSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(newRent);
    setNewRent(isNaN(parsed) ? String(currentRent) : String(parsed));
    setTimeout(() => setStep("contract_date"), 400);
  }

  function handleDateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTimeout(() => setStep("duration"), 400);
  }

  function handleDuration(years: number) {
    setDurationYears(years);
    submitAll(years);
  }

  function handleRestart() {
    setContinuing(null);
    setTenantIntent(null);
    setNewRent(String(currentRent));
    setRenewalStart(contractEnd ?? "");
    setDurationYears(null);
    setErrorMsg("");
    setTimeout(() => setStep("choice"), 50);
  }

  const formattedEnd = contractEnd
    ? new Date(contractEnd).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })
    : "";

  const afterYears = renewalStart && durationYears
    ? (() => {
        const d = new Date(renewalStart);
        d.setFullYear(d.getFullYear() + durationYears);
        return d.toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });
      })()
    : null;

  const todayLabel = new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div
      className="flex flex-col h-dvh"
      style={{ background: "#F2F2F7", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      {/* Header — matches IntakeChat style */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ background: "#fff", borderColor: "rgba(0,0,0,0.08)" }}>
        <Logo size={22} />
        <span className="text-[15px] font-semibold" style={{ color: "#1C1C1E", letterSpacing: "-0.01em" }}>kakisewa</span>
        <div className="ml-auto flex items-center gap-2.5">
          {agentPhotoUrl ? (
            <img src={agentPhotoUrl} alt={agentName} width={32} height={32}
              style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold"
              style={{ background: "#1C1C1E", color: "#fff" }}>
              {initial}
            </div>
          )}
          <div className="text-right">
            <p className="text-[13px] font-semibold leading-tight" style={{ color: "#1C1C1E" }}>{agentName}</p>
            {agentAgency && <p className="text-[11px]" style={{ color: "#6C6C70" }}>{agentAgency}</p>}
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">

        {/* Trust banner */}
        <div className="flex items-start gap-2 mx-auto max-w-xs text-center px-4 py-2.5 rounded-xl"
          style={{ background: "rgba(0,0,0,0.05)" }}>
          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#6C6C70" }} />
          <p className="text-[11px] leading-relaxed" style={{ color: "#6C6C70" }}>
            This form is private and secure. Only you and your agent can see your responses. · {todayLabel}
          </p>
        </div>

        {/* Opening message */}
        <AgentBubble>
          Hi {ownerName || "there"}! The tenancy at <strong>{propertyName}</strong> with {tenantName} is expiring on {formattedEnd}.
          {"\n\n"}
          Would you like to continue renting it out?
        </AgentBubble>

        {/* Q1: Choice buttons — active while on "choice" step */}
        {step === "choice" && (
          <div className="flex gap-2 justify-end mt-1">
            <ChoiceButton label="Yes, continue" active={continuing === true} disabled={continuing !== null} onClick={() => handleChoice(true)} color="#25D366" />
            <ChoiceButton label="No, I'll stop" active={continuing === false} disabled={continuing !== null} onClick={() => handleChoice(false)} color="#E53E3E" />
          </div>
        )}
        {/* Q1: Show locked selection once past choice step */}
        {pastStep("tenant_intent") && continuing !== null && (
          <div className="flex gap-2 justify-end mt-1">
            <ChoiceButton label="Yes, continue" active={continuing === true} disabled onClick={() => {}} color="#25D366" />
            <ChoiceButton label="No, I'll stop" active={continuing === false} disabled onClick={() => {}} color="#E53E3E" />
          </div>
        )}

        {/* Q2: Tenant intent */}
        {pastStep("tenant_intent") && (
          <AgentBubble>
            {continuing
              ? `One more thing — has ${tenantName} indicated whether they want to stay on?`
              : `Got it. Has ${tenantName} said anything about their plans?`}
          </AgentBubble>
        )}
        {step === "tenant_intent" && (
          <div className="flex gap-2 justify-end flex-wrap mt-1">
            <ChoiceButton label="Yes, staying" active={tenantIntent === "yes"} disabled={tenantIntent !== null} onClick={() => handleTenantIntent("yes")} color="#25D366" />
            <ChoiceButton label="No, leaving" active={tenantIntent === "no"} disabled={tenantIntent !== null} onClick={() => handleTenantIntent("no")} color="#E53E3E" />
            <ChoiceButton label="Not sure" active={tenantIntent === "unsure"} disabled={tenantIntent !== null} onClick={() => handleTenantIntent("unsure")} color="#888" />
          </div>
        )}
        {/* Q2: Show locked selection once past tenant_intent */}
        {pastStep("rent") && tenantIntent !== null && (
          <div className="flex gap-2 justify-end flex-wrap mt-1">
            <ChoiceButton label="Yes, staying" active={tenantIntent === "yes"} disabled onClick={() => {}} color="#25D366" />
            <ChoiceButton label="No, leaving" active={tenantIntent === "no"} disabled onClick={() => {}} color="#E53E3E" />
            <ChoiceButton label="Not sure" active={tenantIntent === "unsure"} disabled onClick={() => {}} color="#888" />
          </div>
        )}

        {/* Q3: Rent */}
        {pastStep("rent") && (
          <AgentBubble>
            The current rent is RM {currentRent.toLocaleString()}/mo. Any changes to the amount?
          </AgentBubble>
        )}
        {step === "rent" && (
          <form onSubmit={handleRentSubmit} className="flex justify-end gap-2 items-center mt-1">
            <div className="flex items-center gap-1 rounded-2xl px-3 py-2 text-[14px]" style={{ background: "#fff", color: "#111" }}>
              <span className="text-[13px] text-gray-500">RM</span>
              <input
                type="number"
                value={newRent}
                onChange={(e) => setNewRent(e.target.value)}
                min={0}
                step={100}
                className="w-24 outline-none bg-transparent text-right"
                style={{ color: "#111" }}
              />
              <span className="text-[13px] text-gray-500">/mo</span>
            </div>
            <button type="submit" className="rounded-full px-4 py-2 text-[13px] font-semibold text-white" style={{ background: "#25D366" }}>
              Confirm
            </button>
          </form>
        )}

        {/* Q3: Locked rent answer */}
        {pastStep("contract_date") && (
          <div className="flex justify-end mt-1">
            <div className="rounded-2xl rounded-tr-sm px-4 py-2 text-[14px] font-medium" style={{ background: "#DCF8C6", color: "#111" }}>
              RM {parseFloat(newRent).toLocaleString()}/mo
            </div>
          </div>
        )}

        {/* Q4: Contract start date */}
        {pastStep("contract_date") && (
          <AgentBubble>
            When should the new contract start?
          </AgentBubble>
        )}
        {step === "contract_date" && (
          <form onSubmit={handleDateSubmit} className="flex justify-end gap-2 items-center mt-1">
            <input
              type="date"
              value={renewalStart}
              onChange={(e) => setRenewalStart(e.target.value)}
              required
              className="rounded-2xl px-3 py-2 text-[14px] border-0 outline-none"
              style={{ background: "#fff", color: "#111" }}
            />
            <button type="submit" className="rounded-full px-4 py-2 text-[13px] font-semibold text-white" style={{ background: "#25D366" }}>
              Confirm
            </button>
          </form>
        )}

        {/* Q4: Locked date answer */}
        {pastStep("duration") && renewalStart && (
          <div className="flex justify-end mt-1">
            <div className="rounded-2xl rounded-tr-sm px-4 py-2 text-[14px] font-medium" style={{ background: "#DCF8C6", color: "#111" }}>
              {new Date(renewalStart).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        )}

        {/* Q5: Duration */}
        {pastStep("duration") && (
          <AgentBubble>
            How many years for the new contract?
          </AgentBubble>
        )}
        {step === "duration" && (
          <div className="flex gap-2 justify-end mt-1">
            <ChoiceButton label="1 year"  active={durationYears === 1} disabled={durationYears !== null} onClick={() => handleDuration(1)} color="#25D366" />
            <ChoiceButton label="2 years" active={durationYears === 2} disabled={durationYears !== null} onClick={() => handleDuration(2)} color="#25D366" />
            <ChoiceButton label="3 years" active={durationYears === 3} disabled={durationYears !== null} onClick={() => handleDuration(3)} color="#25D366" />
          </div>
        )}
        {/* Q5: Locked duration answer */}
        {pastStep("done") && durationYears !== null && (
          <div className="flex gap-2 justify-end mt-1">
            <ChoiceButton label="1 year"  active={durationYears === 1} disabled onClick={() => {}} color="#25D366" />
            <ChoiceButton label="2 years" active={durationYears === 2} disabled onClick={() => {}} color="#25D366" />
            <ChoiceButton label="3 years" active={durationYears === 3} disabled onClick={() => {}} color="#25D366" />
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <>
            <AgentBubble>
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 inline shrink-0" style={{ color: "#25D366" }} />
                {continuing === null
                  ? `You've already responded — thank you! Your agent will be in touch soon.`
                  : continuing
                    ? afterYears
                      ? `Got it! New contract from ${new Date(renewalStart).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })} for ${durationYears} year${durationYears === 1 ? "" : "s"} (until ${afterYears}). I'll be in touch soon.`
                      : `Got it! I'll work on the contract details and keep you posted.`
                    : `Understood — I'll find a new tenant. Thanks for the details!`}
              </span>
            </AgentBubble>
            <div className="flex justify-end mt-2">
              <button
                onClick={handleRestart}
                className="text-[12px] underline underline-offset-2"
                style={{ color: "#888", background: "none", border: "none", cursor: "pointer" }}
              >
                Filled in wrong details? Don&apos;t worry, you can fill in again.
              </button>
            </div>
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
      className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap"
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
        background: active ? color : disabled ? "rgba(0,0,0,0.06)" : "#fff",
        color: active ? "#fff" : disabled ? "#AEAEB2" : "#1C1C1E",
        border: active ? "none" : "1px solid rgba(0,0,0,0.12)",
        opacity: disabled && !active ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}
