"use client";

import { useState, useCallback } from "react";
import { Star, Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { ProfileStrengthItem, ProfileVerbatimItem } from "@/lib/types";

const STRENGTH_POOL = [
  "Responsive",
  "Handles tenants well",
  "End-to-end service",
  "Clear communicator",
  "Renewal specialist",
  "Quick to act",
  "Trusted by owners",
  "Strong negotiator",
];

// Deterministic shuffle using agent ID as seed
function seededShuffle(arr: string[], seed: string): string[] {
  const s = seed.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
  const copy = [...arr];
  let r = Math.abs(s);
  for (let i = copy.length - 1; i > 0; i--) {
    r = (r * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(r) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function HalfStarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = display >= star ? 1 : display >= star - 0.5 ? 0.5 : 0;
        return (
          <div key={star} className="relative w-6 h-6 cursor-pointer flex items-center justify-center"
            onMouseLeave={() => setHover(null)}>
            {/* Half: left side */}
            <div className="absolute inset-0 left-0 w-1/2"
              onMouseEnter={() => setHover(star - 0.5)}
              onClick={() => onChange(star - 0.5)} />
            {/* Full: right side */}
            <div className="absolute inset-0 left-1/2"
              onMouseEnter={() => setHover(star)}
              onClick={() => onChange(star)} />
            <svg width="20" height="20" viewBox="0 0 20 20">
              {/* Empty star */}
              <path d="M10 1.5l2.5 5 5.5.8-4 3.9.95 5.5L10 14.2l-4.95 2.5.95-5.5-4-3.9 5.5-.8z"
                fill="#E5E7EB" stroke="none" />
              {/* Filled overlay */}
              {filled > 0 && (
                <clipPath id={`clip-${star}`}>
                  <rect x="0" y="0" width={filled === 1 ? "20" : "10"} height="20" />
                </clipPath>
              )}
              {filled > 0 && (
                <path d="M10 1.5l2.5 5 5.5.8-4 3.9.95 5.5L10 14.2l-4.95 2.5.95-5.5-4-3.9 5.5-.8z"
                  fill="#f59e0b" stroke="none" clipPath={`url(#clip-${star})`} />
              )}
            </svg>
          </div>
        );
      })}
      <span className="ml-1 text-[12px] font-semibold tabular-nums" style={{ color: "var(--kk-ink-mute)" }}>
        {display.toFixed(1)}
      </span>
    </div>
  );
}

interface Props {
  initialStrengths: ProfileStrengthItem[] | null;
  initialVerbatim:  ProfileVerbatimItem[] | null;
  agentId: string;
  agentName: string | null;
  agentRen: string | null;
}

export function ProfileSettingsClient({ initialStrengths, initialVerbatim, agentId, agentName, agentRen }: Props) {
  const pool = seededShuffle(STRENGTH_POOL, agentId);

  const defaultStrengths: ProfileStrengthItem[] = initialStrengths ?? pool.slice(0, 3).map(label => ({ label, rating: 4 }));
  const defaultVerbatim: ProfileVerbatimItem[] = initialVerbatim ?? [];

  const [strengths, setStrengths] = useState<ProfileStrengthItem[]>(defaultStrengths);
  const [verbatim, setVerbatim]   = useState<ProfileVerbatimItem[]>(defaultVerbatim);
  const [saving, setSaving] = useState(false);

  const profilePath = agentRen
    ? `/agent/${encodeURIComponent((agentName ?? "agent").trim().split(/\s+/)[0].toLowerCase())}/${encodeURIComponent(agentRen)}`
    : null;

  function toggleStrength(label: string) {
    const existing = strengths.find(s => s.label === label);
    if (existing) {
      setStrengths(strengths.filter(s => s.label !== label));
    } else {
      if (strengths.length >= 3) {
        toast.error("Maximum 3 strengths allowed");
        return;
      }
      setStrengths([...strengths, { label, rating: 4 }]);
    }
  }

  function updateRating(label: string, rating: number) {
    setStrengths(strengths.map(s => s.label === label ? { ...s, rating } : s));
  }

  function addVerbatim() {
    if (verbatim.length >= 3) { toast.error("Maximum 3 testimonials"); return; }
    setVerbatim([...verbatim, { quote: "", ownerName: "", ownerRole: "" }]);
  }

  function updateVerbatim(i: number, field: keyof ProfileVerbatimItem, value: string) {
    setVerbatim(verbatim.map((v, idx) => idx === i ? { ...v, [field]: value } : v));
  }

  function removeVerbatim(i: number) {
    setVerbatim(verbatim.filter((_, idx) => idx !== i));
  }

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/agent/profile-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_strengths: strengths, profile_verbatim: verbatim }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Profile saved");
    } catch {
      toast.error("Could not save — please try again");
    } finally {
      setSaving(false);
    }
  }, [strengths, verbatim]);

  return (
    <div className="space-y-6">
      {/* Preview link */}
      {profilePath && (
        <a href={profilePath} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-[13px] font-semibold"
          style={{ color: "var(--kk-blue)" }}>
          <ExternalLink className="w-3.5 h-3.5" />
          Preview public profile
        </a>
      )}

      {/* Strengths */}
      <div className="kk-section p-5">
        <p className="kk-overline mb-1">Strengths</p>
        <p className="text-[12px] mb-4" style={{ color: "var(--kk-ink-faint)" }}>
          Pick up to 3. Tap to select, then set your rating.
        </p>

        {/* Pool chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          {pool.map((label) => {
            const selected = strengths.some(s => s.label === label);
            return (
              <button
                key={label}
                onClick={() => toggleStrength(label)}
                className="px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all"
                style={{
                  background: selected ? "var(--kk-ink)" : "var(--kk-surface-2)",
                  color: selected ? "#fff" : "var(--kk-ink-mute)",
                  border: "1px solid",
                  borderColor: selected ? "transparent" : "var(--kk-line)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Selected strengths with ratings */}
        {strengths.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--kk-ink-faint)" }}>
              Rate yourself
            </p>
            {strengths.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-3 py-2 border-b" style={{ borderColor: "var(--kk-line)" }}>
                <span className="text-[14px] font-semibold" style={{ color: "var(--kk-ink)" }}>{s.label}</span>
                <HalfStarRating value={s.rating} onChange={(v) => updateRating(s.label, v)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verbatim */}
      <div className="kk-section p-5">
        <p className="kk-overline mb-1">Verbatim</p>
        <p className="text-[12px] mb-4" style={{ color: "var(--kk-ink-faint)" }}>
          Add up to 3 quotes from property owners. Max 200 characters each.
        </p>

        <div className="space-y-4">
          {verbatim.map((v, i) => (
            <div key={i} className="rounded-xl p-4 relative" style={{ background: "var(--kk-surface-2)", border: "1px solid var(--kk-line)" }}>
              <button onClick={() => removeVerbatim(i)}
                className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "var(--kk-line)", color: "var(--kk-ink-mute)" }}>
                <Trash2 className="w-3 h-3" />
              </button>
              <textarea
                value={v.quote}
                onChange={e => updateVerbatim(i, "quote", e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="What did the owner say? (max 200 chars)"
                className="w-full text-[14px] rounded-lg px-3 py-2 resize-none mb-2 outline-none"
                style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
              />
              <div className="flex gap-2">
                <input
                  value={v.ownerName}
                  onChange={e => updateVerbatim(i, "ownerName", e.target.value)}
                  maxLength={60}
                  placeholder="Owner name"
                  className="flex-1 text-[13px] rounded-lg px-3 py-2 outline-none"
                  style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                />
                <input
                  value={v.ownerRole}
                  onChange={e => updateVerbatim(i, "ownerRole", e.target.value)}
                  maxLength={60}
                  placeholder="Role · Location"
                  className="flex-1 text-[13px] rounded-lg px-3 py-2 outline-none"
                  style={{ background: "var(--kk-surface)", border: "1px solid var(--kk-line)", color: "var(--kk-ink)" }}
                />
              </div>
              <p className="text-[11px] mt-1.5 text-right tabular-nums" style={{ color: "var(--kk-ink-faint)" }}>
                {v.quote.length}/200
              </p>
            </div>
          ))}
        </div>

        {verbatim.length < 3 && (
          <button onClick={addVerbatim}
            className="mt-3 flex items-center gap-2 text-[13px] font-semibold px-3 py-2 rounded-xl transition-colors hover:bg-[var(--kk-surface-2)]"
            style={{ color: "var(--kk-blue)" }}>
            <Plus className="w-4 h-4" />
            Add testimonial
          </button>
        )}
      </div>

      {/* Save */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3.5 rounded-xl font-bold text-[15px] transition-opacity"
        style={{ background: "var(--kk-ink)", color: "#fff", opacity: saving ? 0.6 : 1 }}
      >
        {saving ? "Saving…" : "Save profile"}
      </button>
    </div>
  );
}
