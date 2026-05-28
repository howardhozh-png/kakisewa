"use client";

import { useState, useRef, useEffect } from "react";
import { CheckCircle } from "lucide-react";

interface Props {
  token: string;
  tenantName: string;
  propertyName: string;
  contractEnd: string;
  agentName: string;
  agentAgency: string;
}

type Step = "choice" | "submitting" | "done" | "error";

export function TenantRenewalClient({ token, tenantName, propertyName, contractEnd, agentName, agentAgency }: Props) {
  const [step, setStep] = useState<Step | null>(null);
  const [staying, setStaying] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setStep("choice"), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [step]);

  const initial = agentName.charAt(0).toUpperCase();

  async function handleChoice(choice: boolean) {
    setStaying(choice);
    setStep("submitting");
    try {
      const res = await fetch("/api/intake/renewal/tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, staying: choice }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (data.ok) { setStep("done"); }
      else { setErrorMsg(data.message ?? "Something went wrong. Please try again."); setStep("error"); }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStep("error");
    }
  }

  const formattedEnd = contractEnd
    ? new Date(contractEnd).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div
      className="flex flex-col h-dvh"
      style={{ background: "#ECE5DD", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: "#075E54", color: "#fff" }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-bold shrink-0" style={{ background: "#25D366" }}>
          {initial}
        </div>
        <div>
          <p className="text-[14px] font-semibold leading-tight">{agentName}</p>
          {agentAgency && <p className="text-[11px] opacity-70">{agentAgency}</p>}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">

        <AgentBubble>
          Hi {tenantName}! Your tenancy at <strong>{propertyName}</strong> is expiring on {formattedEnd}.
          {"\n\n"}
          Are you planning to stay on?
        </AgentBubble>

        {step !== null && step !== "submitting" && step !== "done" && step !== "error" && (
          <div className="flex gap-2 justify-end mt-1">
            <ChoiceButton label="Yes, I'll stay" active={staying === true} disabled={staying !== null} onClick={() => handleChoice(true)} color="#25D366" />
            <ChoiceButton label="No, I'm moving out" active={staying === false} disabled={staying !== null} onClick={() => handleChoice(false)} color="#E53E3E" />
          </div>
        )}

        {step === "done" && (
          <AgentBubble>
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 inline shrink-0" style={{ color: "#25D366" }} />
              {staying
                ? `Thanks ${tenantName}! I've noted that you'd like to stay. I'll be in touch with the renewal details shortly.`
                : `Thanks ${tenantName} for letting me know. I'll get things sorted for the end of your tenancy.`}
            </span>
          </AgentBubble>
        )}

        {step === "error" && (
          <AgentBubble>{errorMsg || "Something went wrong. Please try again."}</AgentBubble>
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
      style={{ background: "#fff", color: "#111", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
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
      className="rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-opacity"
      style={{ background: color, opacity: disabled && !active ? 0.35 : 1 }}
    >
      {label}
    </button>
  );
}
