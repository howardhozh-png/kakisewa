"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Check } from "lucide-react";

const SESSION_KEY = "kk_onboarding_dismissed";

interface Props {
  isNewAgent: boolean;
  hasLeads: boolean;
  hasContracts: boolean;
  hasTenants: boolean;
  hasSupports: boolean;
}

interface Mission {
  id: string;
  label: string;
  cta: string;
  href: string;
  done: boolean;
}

export function OnboardingNudge({ isNewAgent, hasLeads, hasContracts, hasTenants, hasSupports }: Props) {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  const missions: Mission[] = [
    { id: "leads",     label: "Upload your owner list",        cta: "Upload now",    href: "/new-owners",          done: hasLeads },
    { id: "contracts", label: "Add a tenancy contract",        cta: "Add contract",  href: "/existing-contracts",  done: hasContracts },
    { id: "tenants",   label: "Add your first tenant profile", cta: "Add tenant",    href: "/tenants",             done: hasTenants },
    { id: "supports",  label: "Save a support contact",        cta: "Go to network", href: "/network",             done: hasSupports },
  ];

  const allDone = missions.every((m) => m.done);

  useEffect(() => {
    if (!isNewAgent || allDone) return;
    const wasDismissed = sessionStorage.getItem(SESSION_KEY) === "1";
    if (!wasDismissed) setVisible(true);
  }, [isNewAgent, allDone]);

  if (!visible) return null;

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
  }

  function go(href: string) {
    dismiss();
    router.push(href);
  }

  const doneCount = missions.filter((m) => m.done).length;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl p-6"
        style={{ background: "var(--kk-surface)", boxShadow: "0 24px 60px rgba(0,0,0,0.22)" }}
      >
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full transition-opacity hover:opacity-60"
          style={{ color: "var(--kk-ink-mute)" }}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--kk-accent)" }}>
          Getting started
        </p>
        <h2 className="font-bold text-[18px] leading-tight mb-1" style={{ color: "var(--kk-ink)" }}>
          Your setup checklist
        </h2>
        <p className="text-[13px] mb-5" style={{ color: "var(--kk-ink-mute)" }}>
          {doneCount}/{missions.length} done — complete these to get the most out of kakisewa.
        </p>

        {/* Progress bar */}
        <div className="mb-5 rounded-full overflow-hidden" style={{ height: 4, background: "var(--kk-line)" }}>
          <div
            style={{
              width: `${(doneCount / missions.length) * 100}%`,
              height: "100%",
              background: "var(--kk-green)",
              borderRadius: 99,
              transition: "width 400ms ease",
            }}
          />
        </div>

        {/* Missions */}
        <div className="flex flex-col gap-2">
          {missions.map((m, i) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-xl px-3 py-3"
              style={{
                background: m.done ? "rgba(52,199,89,0.07)" : "var(--kk-surface-2)",
                border: `1px solid ${m.done ? "rgba(52,199,89,0.2)" : "var(--kk-line)"}`,
              }}
            >
              {/* Step number or checkmark */}
              <div
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold"
                style={{
                  background: m.done ? "var(--kk-green)" : "var(--kk-line)",
                  color: m.done ? "#fff" : "var(--kk-ink-mute)",
                }}
              >
                {m.done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>

              {/* Label */}
              <span
                className="flex-1 text-[13px] font-medium leading-tight"
                style={{
                  color: m.done ? "var(--kk-ink-mute)" : "var(--kk-ink)",
                  textDecoration: m.done ? "line-through" : "none",
                }}
              >
                {m.label}
              </span>

              {/* CTA */}
              {!m.done && (
                <button
                  onClick={() => go(m.href)}
                  className="shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                  style={{ background: "var(--kk-ink)", color: "#fff", whiteSpace: "nowrap" }}
                >
                  {m.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] mt-4" style={{ color: "var(--kk-ink-faint)" }}>
          This will appear each login until you&apos;re set up
        </p>
      </div>
    </div>
  );
}
