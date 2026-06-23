"use client";

import { useState, useTransition } from "react";
import { submitPricingSurvey } from "@/lib/actions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Props {
  surveyCompleted: boolean;
}

const ROLES = [
  "Part time agent",
  "Full time agent",
  "Team lead",
  "Management team",
];

const VOLUMES = [
  "Less than 30",
  "30 to 60",
  "60 to 100",
  "100 to 150",
  "150 to 200",
  "More than 200",
];

const TRACKING = [
  "WhatsApp / phone notes",
  "Excel or Google Sheets",
  "Another app",
  "I wasn't tracking",
];

const BELIEFS = [
  "kakisewa replaces all my other tools",
  "kakisewa saves me so much time from tracking leads",
  "kakisewa will earn me more income from tracking renewals",
  "kakisewa is something I want to use long term",
  "kakisewa is not helpful to me",
];

const PRICES = [
  "Less than RM 50",
  "RM 50 to RM 100",
  "RM 100 to RM 150",
  "RM 150 to RM 250",
  "RM 250 to RM 350",
  "More than RM 350",
];

function PillRadio({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="rounded-xl px-3 py-2 text-[13px] font-medium transition-all"
            style={{
              background: selected ? "var(--kk-blue)" : "var(--kk-surface-2)",
              color: selected ? "#fff" : "var(--kk-ink)",
              border: selected ? "1.5px solid var(--kk-blue)" : "1.5px solid transparent",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function PillCheckbox({
  options,
  values,
  onChange,
}: {
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(opt: string) {
    if (values.includes(opt)) {
      onChange(values.filter((v) => v !== opt));
    } else {
      onChange([...values, opt]);
    }
  }
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const selected = values.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-[13px] font-medium transition-all"
            style={{
              background: selected ? "var(--kk-blue-soft)" : "var(--kk-surface-2)",
              color: selected ? "var(--kk-blue)" : "var(--kk-ink)",
              border: selected ? "1.5px solid var(--kk-blue)" : "1.5px solid transparent",
            }}
          >
            <span
              className="shrink-0 flex items-center justify-center rounded-md"
              style={{
                width: 18,
                height: 18,
                background: selected ? "var(--kk-blue)" : "#fff",
                border: `1.5px solid ${selected ? "var(--kk-blue)" : "var(--kk-line-strong)"}`,
              }}
            >
              {selected && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function BetaSurveyModal({ surveyCompleted }: Props) {
  const [role, setRole] = useState("");
  const [volume, setVolume] = useState("");
  const [tracking, setTracking] = useState("");
  const [beliefs, setBeliefs] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(surveyCompleted);

  if (done) return null;

  function validate() {
    if (!role) return "Please select your role.";
    if (!volume) return "Please select your tenancy volume.";
    if (!tracking) return "Please select how you tracked before kakisewa.";
    if (beliefs.length === 0) return "Please select at least one belief.";
    if (!price) return "Please select your willingness to pay.";
    return null;
  }

  function submit() {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    startTransition(async () => {
      const result = await submitPricingSurvey({
        role,
        tenancy_volume: volume,
        tracking_before: tracking,
        beliefs,
        willingness_to_pay: price,
        open_feedback: feedback.trim() || undefined,
      });
      if (result.ok) {
        setDone(true);
      } else {
        setError(result.error ?? "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 flex items-start justify-center overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", zIndex: 9999 }}
    >
      <div
        className="relative w-full max-w-lg mx-auto my-8 rounded-3xl p-6 pb-8"
        style={{ background: "var(--kk-surface)" }}
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--kk-blue)" }}>
            Beta Feedback
          </p>
          <h2 className="text-[20px] font-bold leading-snug" style={{ color: "var(--kk-ink)" }}>
            Thank you for being part of kakisewa beta
          </h2>
          <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "var(--kk-ink-mute)" }}>
            We extremely appreciate every single one of your feedback. This takes under 2 minutes.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {/* Q1 */}
          <div>
            <p className="text-[13px] font-semibold mb-2.5" style={{ color: "var(--kk-ink)" }}>
              1. What best describes your current situation?
            </p>
            <PillRadio options={ROLES} value={role} onChange={setRole} />
          </div>

          {/* Q2 */}
          <div>
            <p className="text-[13px] font-semibold mb-2.5" style={{ color: "var(--kk-ink)" }}>
              2. How many tenancies are you managing right now?
            </p>
            <PillRadio options={VOLUMES} value={volume} onChange={setVolume} />
          </div>

          {/* Q3 */}
          <div>
            <p className="text-[13px] font-semibold mb-2.5" style={{ color: "var(--kk-ink)" }}>
              3. Before kakisewa, how were you tracking renewals and leads?
            </p>
            <PillRadio options={TRACKING} value={tracking} onChange={setTracking} />
          </div>

          {/* Q4 */}
          <div>
            <p className="text-[13px] font-semibold mb-2.5" style={{ color: "var(--kk-ink)" }}>
              4. Based on kakisewa so far, tick what you believe:
            </p>
            <PillCheckbox options={BELIEFS} values={beliefs} onChange={setBeliefs} />
          </div>

          {/* Q5 */}
          <div>
            <p className="text-[13px] font-semibold mb-2.5" style={{ color: "var(--kk-ink)" }}>
              5. What feels like a fair monthly price for kakisewa?
            </p>
            <PillRadio options={PRICES} value={price} onChange={setPrice} />
          </div>

          {/* Q6 */}
          <div>
            <p className="text-[13px] font-semibold mb-2.5" style={{ color: "var(--kk-ink)" }}>
              6. Anything else you&apos;d like us to know? <span style={{ color: "var(--kk-ink-faint)", fontWeight: 400 }}>(optional)</span>
            </p>
            <Textarea
              placeholder="Your thoughts..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              style={{ fontSize: 14 }}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-[13px] font-medium" style={{ color: "var(--kk-red)" }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <Button
            onClick={submit}
            disabled={isPending}
            className="w-full"
            style={{ height: 48, fontSize: 15, fontWeight: 600 }}
          >
            {isPending ? "Submitting..." : "Submit feedback"}
          </Button>
        </div>
      </div>
    </div>
  );
}
