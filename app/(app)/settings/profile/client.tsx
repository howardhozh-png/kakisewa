"use client";

import { useState, useCallback, useId } from "react";
import { Plus, Trash2, MessageCircle, Building2, Award, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
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

const VERBATIM_POOL: ProfileVerbatimItem[] = [
  { quote: "Responsive at all times. Found me a tenant within 2 weeks and handled everything from start to finish.", ownerName: "Farah Nadia", ownerRole: "Property owner · PJ" },
  { quote: "My previous agent disappeared after signing. This one follows up and makes sure rent comes in on time.", ownerName: "Tan Wei Ming", ownerRole: "Landlord · Subang Jaya" },
  { quote: "Contract renewal was handled without me lifting a finger. No gaps, no stress.", ownerName: "Azlan Hassan", ownerRole: "Property owner · Bangsar" },
  { quote: "Very transparent about the process. Always kept me updated without me having to chase.", ownerName: "Norsyafinaz A.", ownerRole: "Property owner · Ampang" },
  { quote: "Referred 3 of my friends after my first experience. Professional and reliable throughout.", ownerName: "Priya S.", ownerRole: "Owner · Mont Kiara" },
  { quote: "Knew exactly what rent to set. Got above my asking price on the very first viewing.", ownerName: "Lisa Koh", ownerRole: "Landlord · Damansara" },
  { quote: "Handles all tenant issues directly so I never have to get involved. Exactly what I needed.", ownerName: "Raj Krishnan", ownerRole: "Owner · Cheras" },
  { quote: "Found a replacement tenant within days of the previous one leaving. Zero vacancy.", ownerName: "David Lim", ownerRole: "Landlord · KLCC" },
];

function seededShuffle<T>(arr: T[], seed: string): T[] {
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

function statRange(n: number): string {
  if (n < 10) return "<10";
  const lo = Math.floor(n / 10) * 10;
  return `${lo}-${lo + 10}`;
}

function initials(name?: string | null): string {
  if (!name) return "KK";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function normalisePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

function HalfStarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");
  const display = hover ?? value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = display >= star ? 1 : display >= star - 0.5 ? 0.5 : 0;
        const clipId = `${uid}c${star}`;
        return (
          <div key={star} className="relative w-6 h-6 cursor-pointer flex items-center justify-center"
            onMouseLeave={() => setHover(null)}>
            <div className="absolute inset-0 left-0 w-1/2"
              onMouseEnter={() => setHover(star - 0.5)}
              onClick={() => onChange(star - 0.5)} />
            <div className="absolute inset-0 left-1/2"
              onMouseEnter={() => setHover(star)}
              onClick={() => onChange(star)} />
            <svg width="20" height="20" viewBox="0 0 20 20">
              <defs>
                {filled === 0.5 && (
                  <clipPath id={clipId}>
                    <rect x="0" y="0" width="10" height="20" />
                  </clipPath>
                )}
              </defs>
              <path d="M10 1.5l2.5 5 5.5.8-4 3.9.95 5.5L10 14.2l-4.95 2.5.95-5.5-4-3.9 5.5-.8z"
                fill="#E5E7EB" stroke="none" />
              {filled > 0 && (
                <path d="M10 1.5l2.5 5 5.5.8-4 3.9.95 5.5L10 14.2l-4.95 2.5.95-5.5-4-3.9 5.5-.8z"
                  fill="#f59e0b" stroke="none" clipPath={filled === 0.5 ? `url(#${clipId})` : undefined} />
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

interface Stats {
  dealCount: number;
  activeContracts: number;
  activeListings: number;
}

interface Props {
  initialStrengths: ProfileStrengthItem[] | null;
  initialVerbatim:  ProfileVerbatimItem[] | null;
  agentId: string;
  agentName: string | null;
  agentRen: string | null;
  agentAgency: string | null;
  agentPhoto: string | null;
  agentPhone: string | null;
  subscriptionPlan: string | null;
  stats: Stats;
}

export function ProfileSettingsClient({
  initialStrengths, initialVerbatim,
  agentId, agentName, agentRen, agentAgency, agentPhoto, agentPhone,
  subscriptionPlan, stats,
}: Props) {
  const pool = seededShuffle<string>(STRENGTH_POOL, agentId);

  const defaultStrengths: ProfileStrengthItem[] = initialStrengths ?? pool.slice(0, 3).map(label => ({ label, rating: 4 }));
  const defaultVerbatim: ProfileVerbatimItem[]   = initialVerbatim  ?? seededShuffle<ProfileVerbatimItem>(VERBATIM_POOL, agentId).slice(0, 2);

  const [strengths, setStrengths] = useState<ProfileStrengthItem[]>(defaultStrengths);
  const [verbatim, setVerbatim]   = useState<ProfileVerbatimItem[]>(defaultVerbatim);
  const [customInput, setCustomInput] = useState("");
  const [saving, setSaving] = useState(false);

  const isElite    = subscriptionPlan === "elite";
  const isPlatinum = subscriptionPlan === "platinum";
  const tierGradient = isElite
    ? "linear-gradient(135deg, #6b3d1e 0%, #c98840 50%, #6b3d1e 100%)"
    : isPlatinum
      ? "linear-gradient(135deg, #0b1f4a 0%, #2040a0 50%, #0b1f4a 100%)"
      : "linear-gradient(135deg, #3A3A3C 0%, #636366 50%, #3A3A3C 100%)";
  const tierLabel = isElite ? "Elite" : isPlatinum ? "Platinum" : "Silver";

  const waUrl = agentPhone ? `https://wa.me/${normalisePhone(agentPhone)}` : null;

  const profilePath = agentRen
    ? `/agent/${encodeURIComponent((agentName ?? "agent").trim().split(/\s+/)[0].toLowerCase())}/${encodeURIComponent(agentRen)}`
    : null;

  function toggleStrength(label: string) {
    const existing = strengths.find(s => s.label === label);
    if (existing) {
      setStrengths(strengths.filter(s => s.label !== label));
    } else {
      if (strengths.length >= 3) { toast.error("Maximum 3 strengths allowed"); return; }
      setStrengths([...strengths, { label, rating: 4 }]);
    }
  }

  function addCustomStrength() {
    const label = customInput.trim().slice(0, 40);
    if (!label) return;
    if (strengths.length >= 3) { toast.error("Maximum 3 strengths allowed"); return; }
    if (strengths.some(s => s.label.toLowerCase() === label.toLowerCase())) { toast.error("Already in your list"); return; }
    setStrengths([...strengths, { label, rating: 4 }]);
    setCustomInput("");
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
    <div className="space-y-4">
      <style>{`@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}`}</style>

      {/* Preview button */}
      {profilePath ? (
        <a href={profilePath} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 rounded-2xl text-[14px] font-bold transition-opacity hover:opacity-90"
          style={{ background: "#007AFF", color: "#fff" }}>
          <ExternalLink className="w-4 h-4" />
          Preview public profile
        </a>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl text-[13px]"
          style={{ background: "#F2F2F7", color: "#8E8E93" }}>
          Add your REN number in Account settings to get a public profile link.
        </div>
      )}

      {/* Profile card preview — readonly, matches public profile design */}
      <div className="rounded-3xl" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div className="rounded-t-3xl relative" style={{ height: 90, background: tierGradient, backgroundSize: "200% auto", animation: "shimmer 4s linear infinite" }}>
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
            style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)" }}>
            {tierLabel}
          </div>
          <div style={{ position: "absolute", bottom: -36, left: 20 }}>
            {agentPhoto ? (
              <img src={agentPhoto} alt={agentName ?? "Agent"} width={72} height={72}
                style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "3px solid #fff", display: "block", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: tierGradient, backgroundSize: "200% auto", border: "3px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                {initials(agentName)}
              </div>
            )}
          </div>
        </div>
        <div className="px-5 pb-5" style={{ paddingTop: 44 }}>
          <h2 className="text-[20px] font-black leading-tight mb-1" style={{ color: "#1C1C1E", letterSpacing: "-0.02em" }}>
            {agentName ?? "Your name"}
          </h2>
          <div className="space-y-0.5 mb-4">
            {agentAgency && (
              <p className="text-[13px] flex items-center gap-1.5" style={{ color: "#6C6C70" }}>
                <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#AEAEB2" }} />
                {agentAgency}
              </p>
            )}
            <div className="flex items-center gap-2.5">
              {agentRen && (
                <p className="text-[12px] flex items-center gap-1.5" style={{ color: "#8E8E93" }}>
                  <Award className="w-3 h-3 shrink-0" style={{ color: "#AEAEB2" }} />
                  {agentRen}
                </p>
              )}
              {waUrl && (
                <div className="flex items-center justify-center w-6 h-6 rounded-full" style={{ background: "#25D366", color: "#fff" }}>
                  <MessageCircle className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Deals closed",     value: statRange(stats.dealCount) },
              { label: "Active contracts", value: statRange(stats.activeContracts) },
              { label: "Active listings",  value: statRange(stats.activeListings) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background: "#F2F2F7" }}>
                <p className="text-[18px] font-black tabular-nums" style={{ color: "#1C1C1E" }}>{s.value}</p>
                <p className="text-[8px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: "#AEAEB2" }}>{s.label}</p>
              </div>
            ))}
          </div>
          {/* kakisewa watermark — inside the card, cannot be cropped */}
          <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ color: "#AEAEB2" }}>
              <Logo variant="wordmark" size={13} />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#AEAEB2" }}>Verified agent</span>
          </div>
        </div>
      </div>

      {/* Strengths */}
      <div className="rounded-3xl" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div className="px-5 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#AEAEB2" }}>Strengths</p>
          <p className="text-[12px] mb-4" style={{ color: "#8E8E93" }}>Pick up to 3 from the list or add your own.</p>

          <div className="flex flex-wrap gap-2 mb-3">
            {pool.map((label) => {
              const selected = strengths.some(s => s.label === label);
              return (
                <button key={label} onClick={() => toggleStrength(label)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                  style={{
                    background: selected ? "#1C1C1E" : "#F2F2F7",
                    color: selected ? "#fff" : "#6C6C70",
                    border: "1px solid",
                    borderColor: selected ? "transparent" : "rgba(0,0,0,0.08)",
                  }}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Custom strength input */}
          {strengths.length < 3 && (
            <div className="flex gap-2 mb-5">
              <input
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomStrength(); } }}
                maxLength={40}
                placeholder="Add your own strength..."
                className="flex-1 text-[13px] rounded-full px-3.5 py-1.5 outline-none"
                style={{ background: "#F2F2F7", border: "1px solid rgba(0,0,0,0.08)", color: "#1C1C1E" }}
              />
              <button onClick={addCustomStrength}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors"
                style={{ background: customInput.trim() ? "#1C1C1E" : "#E5E7EB", color: customInput.trim() ? "#fff" : "#AEAEB2" }}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          {strengths.length > 0 && (
            <div className="space-y-4">
              {strengths.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[14px] font-semibold" style={{ color: "#1C1C1E" }}>{s.label}</p>
                    <HalfStarRating value={s.rating} onChange={(v) => updateRating(s.label, v)} />
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 4, background: "#F2F2F7" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${(s.rating / 5) * 100}%`, background: s.rating >= 4 ? "#25D366" : s.rating >= 3 ? "#f59e0b" : "#AEAEB2" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Verbatim */}
      <div className="rounded-3xl" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div className="px-5 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#AEAEB2" }}>Verbatim</p>
          <p className="text-[12px] mb-4" style={{ color: "#8E8E93" }}>
            Replace with real quotes from owners you&apos;ve worked with. Max 200 characters each.
          </p>

          <div className="space-y-4">
            {verbatim.map((v, i) => (
              <div key={i} className="rounded-2xl p-4 relative" style={{ background: "#F2F2F7", border: "1px solid rgba(0,0,0,0.06)" }}>
                <button onClick={() => removeVerbatim(i)}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.08)", color: "#6C6C70" }}>
                  <Trash2 className="w-3 h-3" />
                </button>
                <p className="text-[28px] leading-none font-black mb-1.5" style={{ color: "#D1D1D6" }}>&ldquo;</p>
                <textarea
                  value={v.quote}
                  onChange={e => updateVerbatim(i, "quote", e.target.value)}
                  maxLength={200}
                  rows={3}
                  placeholder="What did the owner say?"
                  className="w-full text-[14px] rounded-xl px-3 py-2.5 resize-none mb-2 outline-none"
                  style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", color: "#1C1C1E" }}
                />
                <div className="flex gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: "#fff", color: "#1C1C1E", border: "1px solid rgba(0,0,0,0.08)" }}>
                      {(v.ownerName || "?")[0].toUpperCase()}
                    </div>
                    <input
                      value={v.ownerName}
                      onChange={e => updateVerbatim(i, "ownerName", e.target.value)}
                      maxLength={60}
                      placeholder="Owner name"
                      className="flex-1 text-[13px] rounded-lg px-2.5 py-1.5 outline-none min-w-0"
                      style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", color: "#1C1C1E" }}
                    />
                  </div>
                  <input
                    value={v.ownerRole}
                    onChange={e => updateVerbatim(i, "ownerRole", e.target.value)}
                    maxLength={60}
                    placeholder="Role · Location"
                    className="flex-1 text-[13px] rounded-lg px-2.5 py-1.5 outline-none"
                    style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", color: "#1C1C1E" }}
                  />
                </div>
                <p className="text-[11px] mt-1.5 text-right tabular-nums" style={{ color: "#AEAEB2" }}>
                  {v.quote.length}/200
                </p>
              </div>
            ))}
          </div>

          {verbatim.length < 3 && (
            <button onClick={addVerbatim}
              className="mt-3 flex items-center gap-2 text-[13px] font-semibold px-3 py-2 rounded-xl transition-colors hover:bg-[#F2F2F7]"
              style={{ color: "#007AFF" }}>
              <Plus className="w-4 h-4" />
              Add testimonial
            </button>
          )}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl font-bold text-[15px] transition-opacity"
        style={{ background: "#1C1C1E", color: "#fff", opacity: saving ? 0.6 : 1 }}
      >
        {saving ? "Saving…" : "Save profile"}
      </button>
    </div>
  );
}
