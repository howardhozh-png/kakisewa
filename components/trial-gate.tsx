"use client";

import { ArrowRight, Lock } from "lucide-react";

export function TrialGate() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.80)", zIndex: 9999, backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md rounded-3xl px-8 py-10 text-center"
        style={{ background: "#fff", boxShadow: "0 32px 80px rgba(0,0,0,0.28)" }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: "rgba(220,38,38,0.10)" }}
        >
          <Lock className="w-5 h-5" style={{ color: "#DC2626" }} />
        </div>

        <h2 className="serif mb-2" style={{ fontSize: "1.6rem", lineHeight: 1.15, letterSpacing: "-0.022em", color: "var(--kk-ink)" }}>
          Your free trial has ended.
        </h2>
        <p className="mb-6" style={{ fontSize: "var(--kk-sm)", color: "var(--kk-ink-mute)", lineHeight: 1.65 }}>
          Your data is safe and waiting for you. Subscribe to pick up exactly where you left off — every contact, contract, and commission record intact.
        </p>

        <div className="flex flex-col gap-3 mb-6">
          <div className="px-5 py-4 rounded-2xl text-left" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-sm" style={{ color: "var(--kk-ink)" }}>Pro</p>
              <p className="font-bold text-sm" style={{ color: "var(--kk-ink)" }}>RM 99 / month</p>
            </div>
            <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-mute)" }}>Up to 50 properties · AI receipt verification</p>
          </div>
          <div className="px-5 py-4 rounded-2xl text-left" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-sm" style={{ color: "var(--kk-ink)" }}>Elite</p>
              <p className="font-bold text-sm" style={{ color: "var(--kk-ink)" }}>RM 299 / month</p>
            </div>
            <p style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-mute)" }}>Unlimited properties · All features</p>
          </div>
        </div>

        <a
          href="/billing"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-opacity hover:opacity-85 w-full justify-center"
          style={{ background: "var(--kk-ink)", color: "#fff", fontSize: "var(--kk-body)" }}
        >
          Choose a plan <ArrowRight className="w-4 h-4" />
        </a>

        <p className="mt-4" style={{ fontSize: "var(--kk-xs)", color: "var(--kk-ink-faint)" }}>
          Cancel anytime. Your data is always safe.
        </p>
      </div>
    </div>
  );
}
