"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";

const SESSION_KEY = "kk_onboarding_dismissed";

interface Props {
  isNewAgent: boolean;
  hasLeads: boolean;
  hasContracts: boolean;
}

interface NudgeItem {
  emoji: string;
  headline: string;
  body: string;
  cta: string;
  href: string;
}

export function OnboardingNudge({ isNewAgent, hasLeads, hasContracts }: Props) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem(SESSION_KEY) === "1";
    setDismissed(wasDismissed);
  }, []);

  if (!isNewAgent) return null;

  const items: NudgeItem[] = [];

  if (!hasContracts) {
    items.push({
      emoji: "📁",
      headline: "Add once. Earn forever.",
      body: "Enter your active tenancies and kakisewa tracks every renewal automatically. Get alerted 60 days before expiry and close the commission before another agent does. You never have to remember again.",
      cta: "Add existing contracts",
      href: "/existing-contracts",
    });
  }

  if (!hasLeads) {
    items.push({
      emoji: "📋",
      headline: "Start tracking leads today.",
      body: "Upload your owner list and kakisewa watches every lead for you. Know exactly who to call, when to follow up, and never lose a deal to forgetting.",
      cta: "Upload owner list",
      href: "/new-owners",
    });
  }

  if (items.length === 0 || dismissed) return null;

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setDismissed(true);
  }

  return (
    <div
      className="border-b"
      style={{ background: "#FFFBF0", borderColor: "rgba(0,0,0,0.08)" }}
    >
      <div className="mx-auto max-w-[1440px] px-3 lg:px-5 py-3 flex items-start gap-4">
        <div className={`flex-1 grid gap-3 ${items.length > 1 ? "lg:grid-cols-2" : ""}`}>
          {items.map((item) => (
            <div
              key={item.href}
              className="flex items-start gap-3 rounded-xl px-3 py-2.5"
              style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <span className="text-[20px] mt-0.5 shrink-0">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold leading-snug" style={{ color: "#1C1C1E" }}>
                  {item.headline}
                </p>
                <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: "#6C6C70" }}>
                  {item.body}
                </p>
              </div>
              <Link
                href={item.href}
                className="shrink-0 flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-full whitespace-nowrap mt-0.5"
                style={{ background: "#1C1C1E", color: "#fff" }}
              >
                {item.cta}
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ))}
        </div>

        <button
          onClick={dismiss}
          className="shrink-0 mt-0.5 p-1.5 rounded-full transition-opacity hover:opacity-60"
          style={{ color: "#8E8E93" }}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
