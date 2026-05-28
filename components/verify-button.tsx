"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { runAiVerification } from "@/lib/actions";
import { toast } from "sonner";

export function VerifyButton({ tenancyId }: { tenancyId: string }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{
    confidence: number;
    detected_amount?: number | null;
    detected_date?: string | null;
    detected_bank?: string | null;
    notes: string;
    success: boolean;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleVerify() {
    setOpen(true);
    setResult(null);
    startTransition(async () => {
      const res = await runAiVerification(tenancyId);
      if (res.ok && res.result) {
        setResult(res.result);
        toast[res.result.success && res.result.confidence >= 70 ? "success" : "warning"](
          res.result.success ? "Receipt verified!" : "Verification inconclusive. Please review manually."
        );
      } else {
        toast.error(res.message);
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        onClick={handleVerify}
        disabled={pending}
        className="kk-pill kk-pill-soft-purple"
      >
        {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        AI verify
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.32)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
            onClick={() => setOpen(false)}
          />
          <div
            className="relative w-full max-w-md rounded-3xl p-7 space-y-5"
            style={{
              background: "var(--kk-surface)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.18), 0 0 0 1px var(--kk-line)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: "var(--kk-purple-soft)", color: "var(--kk-purple)" }}
                >
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold" style={{ color: "var(--kk-ink)" }}>AI verification</p>
                  <p className="text-[12px] mt-0.5" style={{ color: "var(--kk-ink-faint)" }}>Receipt analysis</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "var(--kk-surface-2)", color: "var(--kk-ink-mute)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!result ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: "var(--kk-purple)" }} />
                <p className="text-[13px]" style={{ color: "var(--kk-ink-mute)" }}>Analysing receipt…</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2 text-[12px]">
                    <span style={{ color: "var(--kk-ink-mute)" }}>Confidence</span>
                    <span
                      className="font-semibold tabular-nums"
                      style={{
                        color:
                          result.confidence >= 70 ? "var(--kk-green)" :
                          result.confidence >= 40 ? "var(--kk-amber)" :
                          "var(--kk-red)",
                      }}
                    >
                      {result.confidence}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--kk-surface-2)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${result.confidence}%`,
                        background:
                          result.confidence >= 70 ? "var(--kk-green)" :
                          result.confidence >= 40 ? "var(--kk-amber)" :
                          "var(--kk-red)",
                      }}
                    />
                  </div>
                </div>
                <div className="rounded-2xl p-4 space-y-2.5 text-[13px]" style={{ background: "var(--kk-surface-2)" }}>
                  {result.detected_amount != null && <ModalRow label="Amount" value={`RM ${result.detected_amount.toFixed(2)}`} />}
                  {result.detected_date && <ModalRow label="Date" value={result.detected_date} />}
                  {result.detected_bank && <ModalRow label="Bank" value={result.detected_bank} />}
                  <ModalRow label="Status" value={result.success ? "Verified" : "Not verified"} />
                </div>
                <p className="text-[12px] rounded-2xl p-4 leading-relaxed" style={{ color: "var(--kk-ink-mute)", background: "var(--kk-surface-2)" }}>
                  {result.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ModalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: "var(--kk-ink-mute)" }}>{label}</span>
      <span className="font-medium" style={{ color: "var(--kk-ink)" }}>{value}</span>
    </div>
  );
}
